import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRef,
  PDFString,
  PDFHexString,
  PDFArray,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import JSZip from 'jszip';
import { PdfBookmark } from '../types';

export interface ImageInputItem {
  id: string;
  file: File;
  name: string;
  size: number;
  dataUrl: string;
  rotation?: number; // 0, 90, 180, 270
}

export interface ImageToPdfOptions {
  pageSize: 'fit' | 'a4_portrait' | 'a4_landscape' | 'letter';
  margin: number; // in points (0, 10, 20, 36)
  fileName: string;
}

export interface MergePdfInputItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  selectedRange?: string; // empty for all, or "1-3, 5"
}

// Convert any image format to JPEG or PNG ArrayBuffer via canvas for maximum browser compatibility
async function imageToJpegBytes(
  dataUrl: string,
  rotation = 0
): Promise<{ bytes: Uint8Array; width: number; height: number; isPng: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const targetWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const targetHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Image blob conversion failed'));
            return;
          }
          const arrayBuffer = await blob.arrayBuffer();
          resolve({
            bytes: new Uint8Array(arrayBuffer),
            width: targetWidth,
            height: targetHeight,
            isPng: false,
          });
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for PDF conversion'));
    img.src = dataUrl;
  });
}

// 1. Multiple Images to Single PDF
export async function imagesToPdf(
  images: ImageInputItem[],
  options: ImageToPdfOptions
): Promise<{ blob: Blob; pageCount: number; fileName: string; fileSizeBytes: number }> {
  if (images.length === 0) {
    throw new Error('PDF로 변환할 이미지를 최소 1개 이상 추가해주세요.');
  }

  const pdfDoc = await PDFDocument.create();

  // Page dimensions (points: 72 points per inch)
  const PAGE_SIZES = {
    a4_portrait: { width: 595.28, height: 841.89 },
    a4_landscape: { width: 841.89, height: 595.28 },
    letter: { width: 612.0, height: 792.0 },
  };

  for (const imgItem of images) {
    const { bytes, width: imgW, height: imgH } = await imageToJpegBytes(
      imgItem.dataUrl,
      imgItem.rotation || 0
    );

    const embeddedImage = await pdfDoc.embedJpg(bytes);

    let pageWidth: number;
    let pageHeight: number;
    let drawX = 0;
    let drawY = 0;
    let drawWidth = imgW;
    let drawHeight = imgH;

    if (options.pageSize === 'fit') {
      pageWidth = imgW + options.margin * 2;
      pageHeight = imgH + options.margin * 2;
      drawX = options.margin;
      drawY = options.margin;
      drawWidth = imgW;
      drawHeight = imgH;
    } else {
      const preset = PAGE_SIZES[options.pageSize];
      pageWidth = preset.width;
      pageHeight = preset.height;

      const availWidth = pageWidth - options.margin * 2;
      const availHeight = pageHeight - options.margin * 2;

      // Scale proportionally to fit inside available area
      const scale = Math.min(availWidth / imgW, availHeight / imgH);
      drawWidth = imgW * scale;
      drawHeight = imgH * scale;

      // Center on page
      drawX = (pageWidth - drawWidth) / 2;
      drawY = (pageHeight - drawHeight) / 2;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const fileName = options.fileName.trim().endsWith('.pdf')
    ? options.fileName.trim()
    : `${options.fileName.trim() || 'images_merged'}.pdf`;

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return {
    blob,
    pageCount: images.length,
    fileName,
    fileSizeBytes: blob.size,
  };
}

// 2. Merge Multiple PDFs
export async function mergePdfs(
  items: MergePdfInputItem[],
  outputFileName: string
): Promise<{ blob: Blob; pageCount: number; fileName: string; fileSizeBytes: number }> {
  if (items.length < 2) {
    throw new Error('병합할 PDF 파일을 최소 2개 이상 선택해주세요.');
  }

  const mergedDoc = await PDFDocument.create();
  let totalPages = 0;

  for (const item of items) {
    const fileBytes = await item.file.arrayBuffer();
    const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const srcPageCount = srcDoc.getPageCount();

    let pageIndices: number[] = [];
    if (item.selectedRange && item.selectedRange.trim()) {
      pageIndices = parsePageRanges(item.selectedRange, srcPageCount).map((p) => p - 1);
    } else {
      pageIndices = Array.from({ length: srcPageCount }, (_, i) => i);
    }

    if (pageIndices.length > 0) {
      const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((page) => mergedDoc.addPage(page));
      totalPages += copiedPages.length;
    }
  }

  if (totalPages === 0) {
    throw new Error('선택된 페이지가 없습니다. 페이지 범위를 확인해주세요.');
  }

  const pdfBytes = await mergedDoc.save();
  const safeName = outputFileName.trim().endsWith('.pdf')
    ? outputFileName.trim()
    : `${outputFileName.trim() || 'merged_document'}.pdf`;

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return {
    blob,
    pageCount: totalPages,
    fileName: safeName,
    fileSizeBytes: blob.size,
  };
}

// Helper: Parse string range like "1-3, 5, 7-10" into array of 1-based page numbers
export function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  const result = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(maxPages, parseInt(endStr, 10) || maxPages);
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= maxPages) {
          result.add(i);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (page >= 1 && page <= maxPages) {
        result.add(page);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

// Helper: Decode PDF String or HexString to clean text
function decodePdfString(val: unknown): string {
  if (!val) return '';
  if (val instanceof PDFString) {
    return val.decodeText();
  }
  if (val instanceof PDFHexString) {
    return val.decodeText();
  }
  const str = String(val);
  return str.replace(/^[\\(]/, '').replace(/[\\)]$/, '');
}

// 3. Inspect PDF: Get Page Count & Extract Bookmarks / Outlines
export async function getPdfInfo(file: File | Blob | ArrayBuffer): Promise<{
  pageCount: number;
  bookmarks: PdfBookmark[];
  title?: string;
}> {
  const bytes =
    file instanceof ArrayBuffer
      ? file
      : await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();

  const bookmarks: PdfBookmark[] = [];

  try {
    const catalog = pdfDoc.catalog;
    const outlinesKey = PDFName.of('Outlines');
    const outlinesRef = catalog.get(outlinesKey);

    if (outlinesRef) {
      const outlinesDict = pdfDoc.context.lookup(outlinesRef);
      if (outlinesDict instanceof PDFDict) {
        const firstKey = PDFName.of('First');
        const firstRef = outlinesDict.get(firstKey);

        const visited = new Set<string>();

        const traverseNode = (nodeRef: unknown) => {
          if (!nodeRef || !(nodeRef instanceof PDFRef)) return;
          const refTag = nodeRef.tag;
          if (visited.has(refTag)) return;
          visited.add(refTag);

          const node = pdfDoc.context.lookup(nodeRef);
          if (!(node instanceof PDFDict)) return;

          // Title
          const titleVal = node.get(PDFName.of('Title'));
          const title = decodePdfString(titleVal);

          // Find target page reference
          let targetPageRef: PDFRef | null = null;

          // 1. Direct Dest
          const dest = node.get(PDFName.of('Dest'));
          if (dest instanceof PDFArray && dest.size() > 0) {
            const first = dest.get(0);
            if (first instanceof PDFRef) {
              targetPageRef = first;
            }
          } else if (dest instanceof PDFRef) {
            targetPageRef = dest;
          }

          // 2. Action /A
          if (!targetPageRef) {
            const action = node.get(PDFName.of('A'));
            if (action instanceof PDFDict || action instanceof PDFRef) {
              const actionDict =
                action instanceof PDFRef ? pdfDoc.context.lookup(action) : action;
              if (actionDict instanceof PDFDict) {
                const actionType = actionDict.get(PDFName.of('S'));
                if (actionType && actionType.toString() === '/GoTo') {
                  const d = actionDict.get(PDFName.of('D'));
                  if (d instanceof PDFArray && d.size() > 0) {
                    const first = d.get(0);
                    if (first instanceof PDFRef) {
                      targetPageRef = first;
                    }
                  } else if (d instanceof PDFRef) {
                    targetPageRef = d;
                  }
                }
              }
            }
          }

          // Match targetPageRef with pages
          if (targetPageRef && title) {
            const pageIndex = pages.findIndex((p) => {
              return p.ref === targetPageRef || (p.ref && targetPageRef && p.ref.tag === targetPageRef.tag);
            });

            if (pageIndex !== -1) {
              bookmarks.push({
                title,
                pageNumber: pageIndex + 1,
                pageIndex,
              });
            }
          }

          // Child nodes
          const firstChild = node.get(PDFName.of('First'));
          if (firstChild) {
            traverseNode(firstChild);
          }

          // Next sibling nodes
          const nextSibling = node.get(PDFName.of('Next'));
          if (nextSibling) {
            traverseNode(nextSibling);
          }
        };

        if (firstRef) {
          traverseNode(firstRef);
        }
      }
    }
  } catch (err) {
    console.warn('[PDF] Outline / Bookmark extraction note:', err);
  }

  // Sort bookmarks by page number ascending
  bookmarks.sort((a, b) => a.pageNumber - b.pageNumber);

  return {
    pageCount,
    bookmarks,
    title: pdfDoc.getTitle(),
  };
}

// 4. Split PDF by User-Specified Page Ranges (e.g., "1-3", "4", "5-8")
export async function splitPdfByRanges(
  file: File | ArrayBuffer,
  ranges: { start: number; end: number; label?: string }[],
  baseName: string
): Promise<{ fileName: string; blob: Blob; pageCount: number; rangeLabel: string }[]> {
  const bytes = file instanceof File ? await file.arrayBuffer() : file;
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const results: { fileName: string; blob: Blob; pageCount: number; rangeLabel: string }[] = [];
  const cleanBase = baseName.replace(/\.pdf$/i, '');

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const s = Math.max(1, range.start);
    const e = Math.min(totalPages, range.end);
    if (s > e) continue;

    const pageIndices: number[] = [];
    for (let p = s; p <= e; p++) {
      pageIndices.push(p - 1);
    }

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => subDoc.addPage(page));

    const subBytes = await subDoc.save();
    const blob = new Blob([subBytes], { type: 'application/pdf' });

    const rangeLabel = range.label || `${s}~${e}p`;
    const fileName = `${cleanBase}_part${i + 1}_(${s}-${e}p).pdf`;

    results.push({
      fileName,
      blob,
      pageCount: copiedPages.length,
      rangeLabel,
    });
  }

  return results;
}

// 5. Split PDF by Extracted Bookmarks
export async function splitPdfByBookmarks(
  file: File | ArrayBuffer,
  bookmarks: PdfBookmark[],
  baseName: string
): Promise<
  { fileName: string; blob: Blob; pageCount: number; bookmarkTitle: string; rangeLabel: string }[]
> {
  if (bookmarks.length === 0) {
    throw new Error('분리할 북마크가 존재하지 않습니다.');
  }

  const bytes = file instanceof File ? await file.arrayBuffer() : file;
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  // Sort bookmarks by page number
  const sorted = [...bookmarks].sort((a, b) => a.pageNumber - b.pageNumber);
  const results: {
    fileName: string;
    blob: Blob;
    pageCount: number;
    bookmarkTitle: string;
    rangeLabel: string;
  }[] = [];

  const cleanBase = baseName.replace(/\.pdf$/i, '');

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const startPage = current.pageNumber;
    const nextBookmark = sorted[i + 1];
    const endPage = nextBookmark ? nextBookmark.pageNumber - 1 : totalPages;

    if (startPage > endPage && startPage <= totalPages) {
      // If two bookmarks point to the same page, include at least that page
    }

    const effectiveEnd = Math.max(startPage, Math.min(totalPages, endPage));

    const pageIndices: number[] = [];
    for (let p = startPage; p <= effectiveEnd; p++) {
      pageIndices.push(p - 1);
    }

    if (pageIndices.length === 0) continue;

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => subDoc.addPage(page));

    const subBytes = await subDoc.save();
    const blob = new Blob([subBytes], { type: 'application/pdf' });

    const safeTitle = current.title.replace(/[\/\\:*?"<>|]/g, '_').trim() || `Chapter_${i + 1}`;
    const fileName = `${cleanBase}_${i + 1}_${safeTitle}_(${startPage}-${effectiveEnd}p).pdf`;

    results.push({
      fileName,
      blob,
      pageCount: copiedPages.length,
      bookmarkTitle: current.title,
      rangeLabel: `${startPage} ~ ${effectiveEnd}p`,
    });
  }

  return results;
}

// 6. Download a single Blob directly in browser
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 7. Zip multiple files and trigger single ZIP download
export async function downloadFilesAsZip(
  files: { fileName: string; blob: Blob }[],
  zipFileName: string
): Promise<void> {
  const zip = new JSZip();

  files.forEach((f) => {
    zip.file(f.fileName, f.blob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const safeZipName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`;
  downloadBlob(zipBlob, safeZipName);
}

// 8. Create a Sample Multi-Page PDF with Bookmarks for immediate testing
export async function createSampleBookmarkPdf(): Promise<{
  blob: Blob;
  fileName: string;
  pageCount: number;
}> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const sections = [
    {
      title: 'Chapter 1: Eun-i Profile & Overview',
      subtitle: 'Artist Information and Fan Community Guide',
      pages: 2,
      color: rgb(0.18, 0.32, 0.25),
    },
    {
      title: 'Chapter 2: Discography & Track Highlights',
      subtitle: 'Acoustic Cover Singles and Mini Album Tracklist',
      pages: 2,
      color: rgb(0.22, 0.38, 0.3),
    },
    {
      title: 'Chapter 3: Fan Cafe Etiquette & Guidelines',
      subtitle: 'Community Rules, Event Participation, and Board Guide',
      pages: 2,
      color: rgb(0.28, 0.45, 0.36),
    },
  ];

  const pageRefs: PDFRef[] = [];

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    for (let pIdx = 0; pIdx < sec.pages; pIdx++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      pageRefs.push(page.ref);

      const pageNum = pageRefs.length;

      // Header bar
      page.drawRectangle({
        x: 40,
        y: 780,
        width: 515.28,
        height: 3,
        color: sec.color,
      });

      // Chapter Title
      page.drawText(sec.title, {
        x: 40,
        y: 740,
        size: 20,
        font,
        color: sec.color,
      });

      // Subtitle
      page.drawText(sec.subtitle, {
        x: 40,
        y: 715,
        size: 13,
        font: regularFont,
        color: rgb(0.35, 0.35, 0.4),
      });

      // Page info box
      page.drawRectangle({
        x: 40,
        y: 520,
        width: 515.28,
        height: 160,
        color: rgb(0.96, 0.98, 0.96),
        borderColor: rgb(0.88, 0.92, 0.89),
        borderWidth: 1,
      });

      page.drawText(`Page ${pageNum} of 6 (Section: ${sIdx + 1}, Part: ${pIdx + 1})`, {
        x: 60,
        y: 640,
        size: 14,
        font,
        color: rgb(0.2, 0.25, 0.22),
      });

      page.drawText(
        'This sample PDF includes structured PDF Bookmarks (Outlines) embedded.',
        {
          x: 60,
          y: 610,
          size: 11,
          font: regularFont,
          color: rgb(0.4, 0.45, 0.42),
        }
      );

      page.drawText(
        'You can test the "Split by Bookmark" feature immediately with this file!',
        {
          x: 60,
          y: 585,
          size: 11,
          font: regularFont,
          color: rgb(0.4, 0.45, 0.42),
        }
      );

      // Footer
      page.drawText(`Eun-i Fan Cafe - Sample Document - Page ${pageNum}`, {
        x: 200,
        y: 35,
        size: 10,
        font: regularFont,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  // Construct PDF Outlines (Bookmarks) hierarchy manually in pdfDoc
  const context = pdfDoc.context;
  const outlineItems: PDFRef[] = [];

  const chapterBookmarks = [
    { title: 'Chapter 1: Eun-i Profile & Overview', targetPageRef: pageRefs[0] },
    { title: 'Chapter 2: Discography & Track Highlights', targetPageRef: pageRefs[2] },
    { title: 'Chapter 3: Fan Cafe Etiquette & Guidelines', targetPageRef: pageRefs[4] },
  ];

  for (let i = 0; i < chapterBookmarks.length; i++) {
    const itemDict = context.obj({
      Title: PDFString.of(chapterBookmarks[i].title),
      Dest: [chapterBookmarks[i].targetPageRef, PDFName.of('Fit')],
    });
    const itemRef = context.register(itemDict);
    outlineItems.push(itemRef);
  }

  // Link outline items siblings (Next, Prev) and parent
  const outlinesDict = context.obj({
    Type: PDFName.of('Outlines'),
    Count: outlineItems.length,
    First: outlineItems[0],
    Last: outlineItems[outlineItems.length - 1],
  });
  const outlinesRef = context.register(outlinesDict);

  for (let i = 0; i < outlineItems.length; i++) {
    const itemDict = context.lookup(outlineItems[i]) as PDFDict;
    itemDict.set(PDFName.of('Parent'), outlinesRef);
    if (i > 0) {
      itemDict.set(PDFName.of('Prev'), outlineItems[i - 1]);
    }
    if (i < outlineItems.length - 1) {
      itemDict.set(PDFName.of('Next'), outlineItems[i + 1]);
    }
  }

  // Attach to catalog
  pdfDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return {
    blob,
    fileName: 'sample_bookmarked_fan_cafe_guide.pdf',
    pageCount: 6,
  };
}
