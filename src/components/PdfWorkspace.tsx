import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Layers,
  Scissors,
  Download,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  RefreshCw,
  Bookmark,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { User, PdfRecord, PdfBookmark } from '../types';
import { locaDB } from '../services/locadb';
import {
  imagesToPdf,
  mergePdfs,
  splitPdfByRanges,
  splitPdfByBookmarks,
  getPdfInfo,
  downloadBlob,
  downloadFilesAsZip,
  createSampleBookmarkPdf,
  ImageInputItem,
  MergePdfInputItem,
  parsePageRanges,
} from '../services/pdfService';

interface PdfWorkspaceProps {
  currentUser: User | null;
}

type WorkspaceTab = 'image_to_pdf' | 'merge_pdf' | 'split_pdf' | 'records';

export const PdfWorkspace: React.FC<PdfWorkspaceProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('image_to_pdf');

  // --- Global status & feedback ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Tab 1: Image to PDF state ---
  const [images, setImages] = useState<ImageInputItem[]>([]);
  const [imagePageSize, setImagePageSize] = useState<'fit' | 'a4_portrait' | 'a4_landscape' | 'letter'>('fit');
  const [imageMargin, setImageMargin] = useState<number>(0);
  const [imageOutputName, setImageOutputName] = useState<string>('eun_fan_gallery.pdf');
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // --- Tab 2: Merge PDF state ---
  const [mergeItems, setMergeItems] = useState<MergePdfInputItem[]>([]);
  const [mergeOutputName, setMergeOutputName] = useState<string>('merged_fan_document.pdf');
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // --- Tab 3: Split PDF state ---
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPdfPageCount, setSplitPdfPageCount] = useState<number>(0);
  const [splitPdfBookmarks, setSplitPdfBookmarks] = useState<PdfBookmark[]>([]);
  const [splitMode, setSplitMode] = useState<'range' | 'bookmark'>('range');
  const [rangeInput, setRangeInput] = useState<string>('1-2, 3-4');
  const [selectedBookmarkIndices, setSelectedBookmarkIndices] = useState<number[]>([]);
  const [splitResults, setSplitResults] = useState<
    { fileName: string; blob: Blob; pageCount: number; label: string }[]
  >([]);
  const splitFileInputRef = useRef<HTMLInputElement>(null);

  // --- Tab 4: PDF Records state ---
  const [records, setRecords] = useState<PdfRecord[]>(() => locaDB.getPdfRecords());
  const [recordFilter, setRecordFilter] = useState<string>('all');

  // Cached generated blobs in memory for instant re-download in session
  const [blobCache, setBlobCache] = useState<Record<string, { blob: Blob; fileName: string }>>({});

  useEffect(() => {
    const handleDbChange = () => {
      setRecords(locaDB.getPdfRecords());
    };
    window.addEventListener('locadb_changed', handleDbChange);
    return () => window.removeEventListener('locadb_changed', handleDbChange);
  }, []);

  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // ----------------------------------------------------
  // Helper: Save Task to Records (Firestore & Local DB)
  // ----------------------------------------------------
  const saveRecord = (
    title: string,
    taskType: PdfRecord['taskType'],
    pageCount: number,
    fileSizeBytes: number,
    sourceCount: number,
    blob?: Blob,
    notes?: string
  ) => {
    const recordId = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRecord: PdfRecord = {
      id: recordId,
      title,
      taskType,
      pageCount,
      fileSizeBytes,
      sourceCount,
      authorId: currentUser?.id || 'guest',
      authorNickname: currentUser?.nickname || '게스트(비회원)',
      createdAt: new Date().toISOString(),
      notes,
    };

    locaDB.addPdfRecord(newRecord);
    setRecords(locaDB.getPdfRecords());

    if (blob) {
      setBlobCache((prev) => ({
        ...prev,
        [recordId]: { blob, fileName: title },
      }));
    }
  };

  // ----------------------------------------------------
  // Feature 1: Image to PDF
  // ----------------------------------------------------
  const handleImageFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    clearMessages();

    const newItems: ImageInputItem[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            file,
            name: file.name,
            size: file.size,
            dataUrl,
            rotation: 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: ((img.rotation || 0) + 90) % 360 } : img
      )
    );
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Load sample fan images for quick testing
  const handleLoadSampleImages = () => {
    clearMessages();
    const sampleItems: ImageInputItem[] = [];

    const samples = [
      {
        title: '유은이 라이브 포토카드 A',
        sub: 'Acoustic Live Stage 2025',
        color1: '#edf5f0',
        color2: '#2c5340',
      },
      {
        title: '유은이 라디오 방송 직찍 B',
        sub: 'Radio Special Guest Photo',
        color1: '#fcf6ed',
        color2: '#78471e',
      },
      {
        title: '유은이 팬미팅 기념 엽서 C',
        sub: '1st Fan Meeting Memory Card',
        color1: '#edf2f7',
        color2: '#2b4360',
      },
    ];

    samples.forEach((sample, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Background
        ctx.fillStyle = sample.color1;
        ctx.fillRect(0, 0, 600, 800);

        // Border card
        ctx.strokeStyle = sample.color2;
        ctx.lineWidth = 12;
        ctx.strokeRect(30, 30, 540, 740);

        // Title
        ctx.fillStyle = sample.color2;
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sample.title, 300, 380);

        // Sub
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText(sample.sub, 300, 430);

        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = sample.color2;
        ctx.fillText('유은이 공식 팬카페 샘플 포토', 300, 710);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        sampleItems.push({
          id: `sample_img_${Date.now()}_${idx}`,
          file: new File([], `유은이_샘플포토_${idx + 1}.jpg`, { type: 'image/jpeg' }),
          name: `유은이_샘플포토_${idx + 1}.jpg`,
          size: 45000,
          dataUrl,
          rotation: 0,
        });
      }
    });

    setImages((prev) => [...prev, ...sampleItems]);
    setSuccessMessage('테스트용 유은이 포토카드 샘플 이미지 3장이 로드되었습니다.');
  };

  const handleGenerateImagePdf = async () => {
    if (images.length === 0) {
      setErrorMessage('PDF로 변환할 이미지를 먼저 추가해주세요.');
      return;
    }

    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('고품질 PDF 문서를 생성하는 중입니다...');

    try {
      const result = await imagesToPdf(images, {
        pageSize: imagePageSize,
        margin: imageMargin,
        fileName: imageOutputName,
      });

      downloadBlob(result.blob, result.fileName);

      saveRecord(
        result.fileName,
        'image_to_pdf',
        result.pageCount,
        result.fileSizeBytes,
        images.length,
        result.blob,
        `페이지 규격: ${imagePageSize}, 여백: ${imageMargin}pt`
      );

      setSuccessMessage(
        `성공적으로 PDF 생성이 완료되어 다운로드되었습니다! (총 ${result.pageCount}페이지, ${(
          result.fileSizeBytes / 1024
        ).toFixed(1)} KB)`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // ----------------------------------------------------
  // Feature 2: Merge Multiple PDFs
  // ----------------------------------------------------
  const handleMergeFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('PDF 파일 정보를 분석하는 중입니다...');

    try {
      const newItems: MergePdfInputItem[] = [];
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') continue;
        const info = await getPdfInfo(file);
        newItems.push({
          id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          pageCount: info.pageCount,
          selectedRange: '',
        });
      }
      setMergeItems((prev) => [...prev, ...newItems]);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'PDF 파일 분석 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleMoveMergeItem = (index: number, direction: 'up' | 'down') => {
    setMergeItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveMergeItem = (id: string) => {
    setMergeItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick helper to load 2 sample PDFs for merging
  const handleLoadSamplePdfsForMerge = async () => {
    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('병합 테스트용 샘플 PDF 2개를 생성하는 중...');

    try {
      const sample1 = await createSampleBookmarkPdf();
      const file1 = new File([sample1.blob], '유은이_가이드북_파트1.pdf', {
        type: 'application/pdf',
      });

      // Quick second sample with 2 images
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = 600;
      imgCanvas.height = 400;
      const ctx = imgCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f3f8f5';
        ctx.fillRect(0, 0, 600, 400);
        ctx.fillStyle = '#2c5340';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('유은이 앨범 발매 기념 부록', 100, 200);
      }
      const dataUrl = imgCanvas.toDataURL('image/jpeg');
      const sample2Pdf = await imagesToPdf(
        [
          {
            id: 'sample_addon',
            file: new File([], '부록.jpg', { type: 'image/jpeg' }),
            name: '부록.jpg',
            size: 30000,
            dataUrl,
          },
        ],
        { pageSize: 'fit', margin: 0, fileName: '유은이_앨범_부록_파트2.pdf' }
      );
      const file2 = new File([sample2Pdf.blob], '유은이_앨범_부록_파트2.pdf', {
        type: 'application/pdf',
      });

      setMergeItems([
        {
          id: `sample_m1_${Date.now()}`,
          file: file1,
          name: file1.name,
          size: sample1.blob.size,
          pageCount: sample1.pageCount,
          selectedRange: '',
        },
        {
          id: `sample_m2_${Date.now()}`,
          file: file2,
          name: file2.name,
          size: sample2Pdf.blob.size,
          pageCount: sample2Pdf.pageCount,
          selectedRange: '',
        },
      ]);

      setSuccessMessage('병합 테스트용 샘플 PDF 2개(총 7페이지)가 성공적으로 로드되었습니다.');
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : '샘플 생성 중 오류');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleMergePdfsExecute = async () => {
    if (mergeItems.length < 2) {
      setErrorMessage('병합할 PDF 파일을 최소 2개 이상 추가해주세요.');
      return;
    }

    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('PDF 파일들을 하나로 병합하는 중입니다...');

    try {
      const result = await mergePdfs(mergeItems, mergeOutputName);
      downloadBlob(result.blob, result.fileName);

      saveRecord(
        result.fileName,
        'merge_pdf',
        result.pageCount,
        result.fileSizeBytes,
        mergeItems.length,
        result.blob,
        `병합된 원본: ${mergeItems.map((m) => m.name).join(', ')}`
      );

      setSuccessMessage(
        `PDF 병합이 완료되어 다운로드되었습니다! (총 ${result.pageCount}페이지, ${(
          result.fileSizeBytes / 1024
        ).toFixed(1)} KB)`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'PDF 병합 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // ----------------------------------------------------
  // Feature 3: Split PDF (by Ranges or Bookmarks)
  // ----------------------------------------------------
  const handleSplitFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('PDF 형식의 파일(.pdf)만 선택 가능합니다.');
      return;
    }

    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('PDF 내부 구조 및 북마크(목차)를 분석 중입니다...');

    try {
      const info = await getPdfInfo(file);
      setSplitFile(file);
      setSplitPdfPageCount(info.pageCount);
      setSplitPdfBookmarks(info.bookmarks);
      setSplitResults([]);

      // Auto-set range input default
      if (info.pageCount <= 2) {
        setRangeInput('1, 2');
      } else {
        const mid = Math.floor(info.pageCount / 2);
        setRangeInput(`1-${mid}, ${mid + 1}-${info.pageCount}`);
      }

      // Auto-select all bookmarks if present
      if (info.bookmarks.length > 0) {
        setSelectedBookmarkIndices(info.bookmarks.map((_, i) => i));
        setSplitMode('bookmark');
        setSuccessMessage(
          `'${file.name}' 분석 완료: 총 ${info.pageCount}페이지, 북마크 ${info.bookmarks.length}개가 감지되었습니다!`
        );
      } else {
        setSplitMode('range');
        setSuccessMessage(
          `'${file.name}' 분석 완료: 총 ${info.pageCount}페이지 (북마크 없음 -> 페이지 범위 분할 권장)`
        );
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'PDF 파일 분석 실패');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Load sample bookmarked PDF for split testing
  const handleLoadSampleBookmarkedPdf = async () => {
    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('목차(북마크)가 포함된 6페이지 샘플 PDF를 생성하는 중...');

    try {
      const sample = await createSampleBookmarkPdf();
      const file = new File([sample.blob], sample.fileName, { type: 'application/pdf' });

      const info = await getPdfInfo(file);
      setSplitFile(file);
      setSplitPdfPageCount(info.pageCount);
      setSplitPdfBookmarks(info.bookmarks);
      setSelectedBookmarkIndices(info.bookmarks.map((_, i) => i));
      setSplitMode('bookmark');
      setSplitResults([]);

      setSuccessMessage(
        `북마크가 포함된 6페이지 샘플 PDF가 로드되었습니다! (감지된 북마크: ${info.bookmarks.length}개)`
      );
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : '샘플 북마크 PDF 생성 실패');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleSplitPdfExecute = async () => {
    if (!splitFile) {
      setErrorMessage('분할할 PDF 파일을 먼저 선택해주세요.');
      return;
    }

    clearMessages();
    setIsProcessing(true);
    setProcessingStatus('PDF를 분할하는 중입니다...');

    try {
      let results: { fileName: string; blob: Blob; pageCount: number; rangeLabel: string }[] = [];

      if (splitMode === 'range') {
        // Parse range input e.g. "1-2, 3-4"
        const parts = rangeInput.split(',').map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) {
          throw new Error('페이지 범위를 1개 이상 입력해주세요 (예: 1-2, 3-4, 5).');
        }

        const ranges = parts.map((part) => {
          if (part.includes('-')) {
            const [s, e] = part.split('-').map((v) => parseInt(v.trim(), 10));
            return {
              start: Math.max(1, s || 1),
              end: Math.min(splitPdfPageCount, e || splitPdfPageCount),
              label: `${s}~${e}p`,
            };
          } else {
            const p = parseInt(part, 10) || 1;
            return { start: p, end: p, label: `${p}p` };
          }
        });

        results = await splitPdfByRanges(splitFile, ranges, splitFile.name);
      } else {
        // By bookmarks
        if (splitPdfBookmarks.length === 0) {
          throw new Error('해당 PDF에는 분할할 수 있는 북마크(목차)가 없습니다.');
        }

        const filteredBookmarks = splitPdfBookmarks.filter((_, idx) =>
          selectedBookmarkIndices.includes(idx)
        );

        if (filteredBookmarks.length === 0) {
          throw new Error('최소 1개 이상의 북마크를 선택해주세요.');
        }

        const bookmarkResults = await splitPdfByBookmarks(
          splitFile,
          filteredBookmarks,
          splitFile.name
        );
        results = bookmarkResults.map((r) => ({
          fileName: r.fileName,
          blob: r.blob,
          pageCount: r.pageCount,
          rangeLabel: `${r.bookmarkTitle} (${r.rangeLabel})`,
        }));
      }

      if (results.length === 0) {
        throw new Error('분할된 결과 파일이 없습니다. 범위를 확인해주세요.');
      }

      setSplitResults(
        results.map((r) => ({
          fileName: r.fileName,
          blob: r.blob,
          pageCount: r.pageCount,
          label: r.rangeLabel,
        }))
      );

      // Save task to records
      const totalSplitSize = results.reduce((acc, curr) => acc + curr.blob.size, 0);
      saveRecord(
        `${splitFile.name} (분할 ${results.length}개 파일)`,
        'split_pdf',
        splitPdfPageCount,
        totalSplitSize,
        results.length,
        undefined,
        `분할 모드: ${splitMode === 'range' ? '페이지 범위' : '북마크 목차'}`
      );

      // If only 1 result, auto download directly
      if (results.length === 1) {
        downloadBlob(results[0].blob, results[0].fileName);
      }

      setSuccessMessage(
        `성공적으로 ${results.length}개의 PDF 파일로 분할되었습니다! 아래에서 개별 다운로드 또는 ZIP 일괄 다운로드를 진행하세요.`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'PDF 분할 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDownloadAllSplitAsZip = async () => {
    if (splitResults.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('분할된 PDF 파일들을 ZIP 압축하는 중...');
    try {
      const zipName = `${(splitFile?.name || 'split_document').replace(/\.pdf$/i, '')}_분할_모음.zip`;
      await downloadFilesAsZip(splitResults, zipName);
      setSuccessMessage(`ZIP 압축 파일('${zipName}')이 다운로드되었습니다.`);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'ZIP 압축 실패');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // ----------------------------------------------------
  // Tab 4: Records Management
  // ----------------------------------------------------
  const handleDeleteRecord = (id: string) => {
    locaDB.deletePdfRecord(id);
    setRecords(locaDB.getPdfRecords());
    setSuccessMessage('기록이 삭제되었습니다.');
  };

  const handleClearAllRecords = () => {
    if (window.confirm('모든 PDF 작업 기록을 삭제하시겠습니까?')) {
      locaDB.clearPdfRecords();
      setRecords([]);
      setSuccessMessage('전체 작업 기록이 삭제되었습니다.');
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (recordFilter === 'all') return true;
    return rec.taskType === recordFilter;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Workspace Header */}
      <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#edf5f0] text-[#2e523f] flex items-center justify-center border border-[#e2ece5]">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#18181b] tracking-tight">
                PDF 생성 및 관리 스튜디오
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#edf5f0] text-[#2c5340] border border-[#d8e8dc]">
                <Sparkles className="w-3 h-3" />
                웹 전용 도구
              </span>
            </div>
            <p className="text-sm text-[#71717a] leading-relaxed">
              이미지를 하나의 PDF로 합치기, 여러 PDF 병합, 페이지 범위 및 목차 북마크 기준 분할을 완벽하게 지원합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] text-xs text-[#4b5563]">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              Firebase Firestore 실시간 연동
            </div>
          </div>
        </div>

        {/* Workspace Feature Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#f4f4f5]">
          <button
            id="pdf-tab-img-btn"
            onClick={() => {
              setActiveTab('image_to_pdf');
              clearMessages();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              activeTab === 'image_to_pdf'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>이미지 ➔ PDF</span>
          </button>

          <button
            id="pdf-tab-merge-btn"
            onClick={() => {
              setActiveTab('merge_pdf');
              clearMessages();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              activeTab === 'merge_pdf'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>여러 PDF 병합</span>
          </button>

          <button
            id="pdf-tab-split-btn"
            onClick={() => {
              setActiveTab('split_pdf');
              clearMessages();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              activeTab === 'split_pdf'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>PDF 분할 (범위/북마크)</span>
          </button>

          <button
            id="pdf-tab-records-btn"
            onClick={() => {
              setActiveTab('records');
              clearMessages();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              activeTab === 'records'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#fafafa] text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>작업 내역 ({records.length})</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[#10b981] mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-[#065f46] hover:text-[#047857] text-xs font-semibold px-2 py-0.5"
          >
            닫기
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#ef4444] mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#991b1b] hover:text-[#7f1d1d] text-xs font-semibold px-2 py-0.5"
          >
            닫기
          </button>
        </div>
      )}

      {/* Loading Modal / Bar */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-[#edf5f0] border border-[#cbe3d4] text-[#1c402d] text-sm flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2e523f]" />
          <span className="font-semibold">{processingStatus || '처리 중입니다...'}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. TAB: Image to PDF (여러 이미지 파일을 하나의 PDF로 합치기)    */}
      {/* ============================================================== */}
      {activeTab === 'image_to_pdf' && (
        <div className="space-y-6">
          <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f4f4f5]">
              <div>
                <h2 className="text-lg font-bold text-[#18181b] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#2e523f]" />
                  여러 이미지 파일을 하나의 PDF로 합치기
                </h2>
                <p className="text-xs text-[#71717a] mt-1">
                  지원 형식: JPG, JPEG, PNG (순서 변경, 90도 회전, 여백 및 규격 설정 가능)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleImages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#f4f7f5] text-[#2c5340] hover:bg-[#e4ede7] border border-[#d8e6dd] transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2e523f]" />
                  테스트용 샘플 이미지 로드
                </button>
                <button
                  type="button"
                  onClick={() => setImages([])}
                  disabled={images.length === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-[#71717a] hover:text-[#dc2626] hover:bg-[#fef2f2] border border-[#e4e4e7] disabled:opacity-40 transition-colors"
                >
                  전체 비우기
                </button>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => imageFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleImageFilesSelected(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-[#d4d4d8] hover:border-[#2e523f] bg-[#fafafa] hover:bg-[#f5f9f6] rounded-xl p-8 text-center cursor-pointer transition-colors group"
            >
              <input
                ref={imageFileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleImageFilesSelected(e.target.files)}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-[#edf5f0] text-[#2e523f] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#18181b]">
                합칠 이미지 파일들을 드래그하거나 클릭하여 추가하세요
              </p>
              <p className="text-xs text-[#a1a1aa] mt-1">
                JPG, PNG 형식 지원 (다중 선택 가능)
              </p>
            </div>

            {/* Image List Preview */}
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#71717a]">
                  <span>추가된 이미지: <strong className="text-[#18181b]">{images.length}개</strong></span>
                  <span>상/하 화살표로 PDF 페이지 순서를 조절할 수 있습니다.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="bg-[#fafafa] border border-[#e4e4e7] rounded-xl p-3 flex gap-3 items-center relative group hover:border-[#c5dccf] transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#2e523f] text-[#ffffff] text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>

                      <div className="w-16 h-16 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-cover transition-transform"
                          style={{ transform: `rotate(${img.rotation || 0}deg)` }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#18181b] truncate" title={img.name}>
                          {img.name}
                        </p>
                        <p className="text-[11px] text-[#a1a1aa]">
                          {(img.size / 1024).toFixed(1)} KB {img.rotation ? `(${img.rotation}° 회전)` : ''}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="위로 이동"
                            disabled={idx === 0}
                            onClick={() => handleMoveImage(idx, 'up')}
                            className="p-1 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#f4f4f5] disabled:opacity-30 text-[#52525b]"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="아래로 이동"
                            disabled={idx === images.length - 1}
                            onClick={() => handleMoveImage(idx, 'down')}
                            className="p-1 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#f4f4f5] disabled:opacity-30 text-[#52525b]"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="90도 회전"
                            onClick={() => handleRotateImage(img.id)}
                            className="p-1 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#52525b]"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="삭제"
                            onClick={() => handleRemoveImage(img.id)}
                            className="p-1 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#fef2f2] text-[#ef4444]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options Panel */}
            <div className="bg-[#fcfcfd] border border-[#e4e4e7] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#18181b] mb-1.5">
                  페이지 규격
                </label>
                <select
                  value={imagePageSize}
                  onChange={(e) => setImagePageSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d4d4d8] bg-[#ffffff] text-[#18181b] focus:outline-none focus:border-[#2e523f]"
                >
                  <option value="fit">이미지 원본 크기에 맞춤 (권장)</option>
                  <option value="a4_portrait">A4 세로 (210 x 297 mm)</option>
                  <option value="a4_landscape">A4 가로 (297 x 210 mm)</option>
                  <option value="letter">US Letter (216 x 279 mm)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18181b] mb-1.5">
                  페이지 여백
                </label>
                <select
                  value={imageMargin}
                  onChange={(e) => setImageMargin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#d4d4d8] bg-[#ffffff] text-[#18181b] focus:outline-none focus:border-[#2e523f]"
                >
                  <option value={0}>여백 없음 (0 pt)</option>
                  <option value={10}>좁은 여백 (10 pt)</option>
                  <option value={20}>보통 여백 (20 pt)</option>
                  <option value={36}>넓은 여백 (36 pt)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18181b] mb-1.5">
                  저장 파일명
                </label>
                <input
                  type="text"
                  value={imageOutputName}
                  onChange={(e) => setImageOutputName(e.target.value)}
                  placeholder="파일명.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-[#d4d4d8] bg-[#ffffff] text-[#18181b] focus:outline-none focus:border-[#2e523f]"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="btn-convert-images-to-pdf"
                disabled={images.length === 0 || isProcessing}
                onClick={handleGenerateImagePdf}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2e523f] hover:bg-[#254333] text-[#ffffff] font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{images.length}개 이미지 하나의 PDF로 합쳐 생성하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TAB: Merge Multiple PDFs (여러 PDF 를 합칠 수 있다)          */}
      {/* ============================================================== */}
      {activeTab === 'merge_pdf' && (
        <div className="space-y-6">
          <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f4f4f5]">
              <div>
                <h2 className="text-lg font-bold text-[#18181b] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#2e523f]" />
                  여러 PDF 문서 하나로 합치기 (PDF Merge)
                </h2>
                <p className="text-xs text-[#71717a] mt-1">
                  여러 PDF 파일들의 순서를 자유롭게 정렬하고, 필요한 페이지만 골라 하나의 새 PDF로 병합합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSamplePdfsForMerge}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#f4f7f5] text-[#2c5340] hover:bg-[#e4ede7] border border-[#d8e6dd] transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2e523f]" />
                  병합 테스트용 샘플 PDF 로드
                </button>
                <button
                  type="button"
                  onClick={() => setMergeItems([])}
                  disabled={mergeItems.length === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-[#71717a] hover:text-[#dc2626] hover:bg-[#fef2f2] border border-[#e4e4e7] disabled:opacity-40 transition-colors"
                >
                  전체 비우기
                </button>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => mergeFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleMergeFilesSelected(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-[#d4d4d8] hover:border-[#2e523f] bg-[#fafafa] hover:bg-[#f5f9f6] rounded-xl p-8 text-center cursor-pointer transition-colors group"
            >
              <input
                ref={mergeFileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleMergeFilesSelected(e.target.files)}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-[#edf5f0] text-[#2e523f] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#18181b]">
                병합할 PDF 파일들을 드래그하거나 클릭하여 추가하세요
              </p>
              <p className="text-xs text-[#a1a1aa] mt-1">
                2개 이상의 PDF 파일을 추가하여 순서대로 합칩니다
              </p>
            </div>

            {/* Merge Items List */}
            {mergeItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#71717a]">
                  <span>
                    추가된 파일: <strong className="text-[#18181b]">{mergeItems.length}개</strong> (총{' '}
                    {mergeItems.reduce((sum, item) => sum + item.pageCount, 0)}페이지)
                  </span>
                  <span>위/아래 화살표를 눌러 병합 순서를 바꿀 수 있습니다.</span>
                </div>

                <div className="space-y-2">
                  {mergeItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-[#fafafa] border border-[#e4e4e7] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#c5dccf] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#2e523f] text-[#ffffff] text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <FileText className="w-5 h-5 text-[#2e523f] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#18181b] truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[#71717a]">
                            총 {item.pageCount}페이지 • {(item.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#52525b]">
                          <span className="whitespace-nowrap text-[11px]">페이지 범위:</span>
                          <input
                            type="text"
                            placeholder="전체 (예: 1-3, 5)"
                            value={item.selectedRange || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMergeItems((prev) =>
                                prev.map((m) => (m.id === item.id ? { ...m, selectedRange: val } : m))
                              );
                            }}
                            className="w-28 px-2 py-1 text-xs rounded border border-[#d4d4d8] bg-[#ffffff] focus:outline-none focus:border-[#2e523f]"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="위로 이동"
                            disabled={idx === 0}
                            onClick={() => handleMoveMergeItem(idx, 'up')}
                            className="p-1.5 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#f4f4f5] disabled:opacity-30 text-[#52525b]"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="아래로 이동"
                            disabled={idx === mergeItems.length - 1}
                            onClick={() => handleMoveMergeItem(idx, 'down')}
                            className="p-1.5 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#f4f4f5] disabled:opacity-30 text-[#52525b]"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="목록에서 제거"
                            onClick={() => handleRemoveMergeItem(item.id)}
                            className="p-1.5 rounded bg-[#ffffff] border border-[#e4e4e7] hover:bg-[#fef2f2] text-[#ef4444]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Output filename */}
            <div className="bg-[#fcfcfd] border border-[#e4e4e7] rounded-xl p-4 text-xs space-y-1.5">
              <label className="block font-semibold text-[#18181b]">
                병합 후 저장할 파일명
              </label>
              <input
                type="text"
                value={mergeOutputName}
                onChange={(e) => setMergeOutputName(e.target.value)}
                placeholder="merged_document.pdf"
                className="w-full max-w-md px-3 py-2 rounded-lg border border-[#d4d4d8] bg-[#ffffff] text-[#18181b] focus:outline-none focus:border-[#2e523f]"
              />
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="btn-merge-pdfs"
                disabled={mergeItems.length < 2 || isProcessing}
                onClick={handleMergePdfsExecute}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2e523f] hover:bg-[#254333] text-[#ffffff] font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>{mergeItems.length}개 PDF 파일 하나로 병합하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TAB: Split PDF (페이지 범위 또는 북마크 기준 분리)           */}
      {/* ============================================================== */}
      {activeTab === 'split_pdf' && (
        <div className="space-y-6">
          <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f4f4f5]">
              <div>
                <h2 className="text-lg font-bold text-[#18181b] flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-[#2e523f]" />
                  PDF 파일 분리하기 (페이지 범위 & 북마크 목차 기준)
                </h2>
                <p className="text-xs text-[#71717a] mt-1">
                  1) 입력받은 페이지 범위 구간별 분리 &nbsp;|&nbsp; 2) PDF에 포함된 북마크(Outlines) 기준 챕터별 자동 분리
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleBookmarkedPdf}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#f4f7f5] text-[#2c5340] hover:bg-[#e4ede7] border border-[#d8e6dd] transition-colors flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#2e523f]" />
                  북마크 포함 샘플 PDF 불러오기
                </button>
              </div>
            </div>

            {/* Dropzone for Single PDF */}
            {!splitFile ? (
              <div
                onClick={() => splitFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleSplitFileSelected(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-[#d4d4d8] hover:border-[#2e523f] bg-[#fafafa] hover:bg-[#f5f9f6] rounded-xl p-8 text-center cursor-pointer transition-colors group"
              >
                <input
                  ref={splitFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleSplitFileSelected(e.target.files)}
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-[#edf5f0] text-[#2e523f] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Scissors className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[#18181b]">
                  분할할 PDF 파일을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-xs text-[#a1a1aa] mt-1">
                  페이지 범위 또는 파일에 내장된 목차(북마크) 정보를 자동 분석합니다
                </p>
              </div>
            ) : (
              /* Loaded PDF Info Box */
              <div className="bg-[#fcfcfd] border border-[#e4e4e7] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#edf5f0] text-[#2e523f] flex items-center justify-center border border-[#e2ece5] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#18181b]">{splitFile.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#71717a]">
                      <span>총 <strong>{splitPdfPageCount}페이지</strong></span>
                      <span>•</span>
                      <span>{(splitFile.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      {splitPdfBookmarks.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#15803d] font-semibold">
                          <Bookmark className="w-3 h-3" />
                          북마크 {splitPdfBookmarks.length}개 감지됨
                        </span>
                      ) : (
                        <span className="text-[#a1a1aa]">내장 북마크 없음</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitFile(null);
                      setSplitResults([]);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-[#52525b] hover:bg-[#f4f4f5] border border-[#e4e4e7]"
                  >
                    다른 파일 선택
                  </button>
                </div>
              </div>
            )}

            {/* Split Mode Selector (Only when file is loaded) */}
            {splitFile && (
              <div className="space-y-4 pt-2">
                <div className="flex border-b border-[#e4e4e7] text-sm">
                  <button
                    type="button"
                    onClick={() => setSplitMode('range')}
                    className={`flex items-center gap-2 pb-3 px-4 font-semibold border-b-2 transition-colors ${
                      splitMode === 'range'
                        ? 'border-[#2e523f] text-[#2e523f]'
                        : 'border-transparent text-[#71717a] hover:text-[#18181b]'
                    }`}
                  >
                    <Scissors className="w-4 h-4" />
                    <span>페이지 범위로 분할</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('bookmark')}
                    className={`flex items-center gap-2 pb-3 px-4 font-semibold border-b-2 transition-colors ${
                      splitMode === 'bookmark'
                        ? 'border-[#2e523f] text-[#2e523f]'
                        : 'border-transparent text-[#71717a] hover:text-[#18181b]'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>
                      PDF 북마크(목차) 기준으로 분할
                      {splitPdfBookmarks.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#dcfce7] text-[#166534]">
                          {splitPdfBookmarks.length}
                        </span>
                      )}
                    </span>
                  </button>
                </div>

                {/* MODE A: Split by Page Ranges */}
                {splitMode === 'range' && (
                  <div className="space-y-4 bg-[#fafafa] p-4 rounded-xl border border-[#e4e4e7] text-xs">
                    <div>
                      <label className="block font-semibold text-[#18181b] mb-1">
                        분할할 페이지 구간 입력
                      </label>
                      <p className="text-[11px] text-[#71717a] mb-2">
                        쉼표(,)로 구분된 각 구간마다 별도의 PDF 파일이 생성됩니다. 예: <code className="bg-[#ffffff] px-1 py-0.5 rounded border border-[#e4e4e7]">1-2, 3-4, 5-6</code> 또는 <code className="bg-[#ffffff] px-1 py-0.5 rounded border border-[#e4e4e7]">1, 2, 3</code>
                      </p>
                      <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="예: 1-2, 3-4, 5-6"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#d4d4d8] bg-[#ffffff] text-[#18181b] focus:outline-none focus:border-[#2e523f]"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-[#71717a] font-medium">빠른 프리셋:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allSingles = Array.from({ length: splitPdfPageCount }, (_, i) => i + 1).join(', ');
                          setRangeInput(allSingles);
                        }}
                        className="px-2 py-1 rounded bg-[#ffffff] border border-[#d4d4d8] hover:bg-[#f4f4f5] text-[11px] text-[#374151]"
                      >
                        1페이지씩 모두 분리 ({splitPdfPageCount}개 파일)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const mid = Math.ceil(splitPdfPageCount / 2);
                          setRangeInput(`1-${mid}, ${mid + 1}-${splitPdfPageCount}`);
                        }}
                        className="px-2 py-1 rounded bg-[#ffffff] border border-[#d4d4d8] hover:bg-[#f4f4f5] text-[11px] text-[#374151]"
                      >
                        전반부/후반부 2등분
                      </button>
                    </div>
                  </div>
                )}

                {/* MODE B: Split by PDF Bookmarks */}
                {splitMode === 'bookmark' && (
                  <div className="space-y-3 bg-[#fafafa] p-4 rounded-xl border border-[#e4e4e7] text-xs">
                    {splitPdfBookmarks.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[#18181b]">
                            PDF에서 추출된 북마크 목차 ({splitPdfBookmarks.length}개):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedBookmarkIndices(splitPdfBookmarks.map((_, i) => i))
                              }
                              className="text-[11px] text-[#2e523f] hover:underline"
                            >
                              전체 선택
                            </button>
                            <span className="text-[#d4d4d8]">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedBookmarkIndices([])}
                              className="text-[11px] text-[#71717a] hover:underline"
                            >
                              전체 해제
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {splitPdfBookmarks.map((bm, idx) => {
                            const nextBm = splitPdfBookmarks[idx + 1];
                            const endPage = nextBm ? nextBm.pageNumber - 1 : splitPdfPageCount;
                            const isSelected = selectedBookmarkIndices.includes(idx);

                            return (
                              <label
                                key={idx}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#ffffff] border-[#2e523f] shadow-2xs'
                                    : 'bg-[#fafafa] border-[#e4e4e7] opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBookmarkIndices((prev) => [...prev, idx]);
                                      } else {
                                        setSelectedBookmarkIndices((prev) =>
                                          prev.filter((i) => i !== idx)
                                        );
                                      }
                                    }}
                                    className="rounded border-[#d4d4d8] text-[#2e523f] focus:ring-0"
                                  />
                                  <Bookmark className="w-4 h-4 text-[#2e523f] shrink-0" />
                                  <span className="font-semibold text-[#18181b] truncate">
                                    {bm.title}
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-[#71717a] shrink-0 px-2 py-0.5 rounded bg-[#f4f4f5]">
                                  {bm.pageNumber} ~ {Math.max(bm.pageNumber, endPage)} 페이지
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-2">
                        <Info className="w-8 h-8 text-[#a1a1aa] mx-auto" />
                        <p className="text-sm font-semibold text-[#18181b]">
                          선택한 PDF에는 내장된 목차(북마크)가 없습니다.
                        </p>
                        <p className="text-xs text-[#71717a]">
                          [페이지 범위로 분할] 방식을 이용하시거나, 상단의 [북마크 포함 샘플 PDF 불러오기]를 눌러 북마크 분할 기능을 테스트해보세요.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSplitMode('range')}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-[#2e523f] text-[#ffffff] text-xs font-semibold"
                        >
                          페이지 범위 분할 모드로 전환
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Execute Split Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    id="btn-execute-split"
                    disabled={
                      isProcessing ||
                      (splitMode === 'bookmark' && selectedBookmarkIndices.length === 0)
                    }
                    onClick={handleSplitPdfExecute}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2e523f] hover:bg-[#254333] text-[#ffffff] font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>PDF 분할 실행하기</span>
                  </button>
                </div>
              </div>
            )}

            {/* Split Results Downloads */}
            {splitResults.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#e4e4e7] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#18181b] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    분할 완료 결과 ({splitResults.length}개 파일)
                  </h3>

                  {splitResults.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDownloadAllSplitAsZip}
                      className="px-4 py-2 rounded-xl bg-[#1f3a2c] hover:bg-[#162c21] text-[#ffffff] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <FileArchive className="w-4 h-4" />
                      전체 파일 ZIP 일괄 다운로드
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {splitResults.map((res, i) => (
                    <div
                      key={i}
                      className="bg-[#fafafa] border border-[#e4e4e7] rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-[#2e523f] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#18181b] truncate" title={res.fileName}>
                            {res.fileName}
                          </p>
                          <p className="text-[11px] text-[#71717a]">
                            {res.label} ({res.pageCount}p, {(res.blob.size / 1024).toFixed(1)} KB)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadBlob(res.blob, res.fileName)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#ffffff] hover:bg-[#f4f4f5] border border-[#d4d4d8] text-xs font-medium text-[#2e523f] shrink-0 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        다운로드
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB: PDF Records Management (작업 내역 및 관리)              */}
      {/* ============================================================== */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f4f4f5]">
              <div>
                <h2 className="text-lg font-bold text-[#18181b] flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-[#2e523f]" />
                  PDF 작업 내역 및 관리
                </h2>
                <p className="text-xs text-[#71717a] mt-1">
                  생성, 병합, 분할된 PDF 문서 이력이 Firebase Firestore(`pdf_records`)에 안전하게 보관됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={recordFilter}
                  onChange={(e) => setRecordFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#d4d4d8] bg-[#ffffff] text-[#18181b]"
                >
                  <option value="all">전체 작업 유형</option>
                  <option value="image_to_pdf">이미지 합치기</option>
                  <option value="merge_pdf">PDF 병합</option>
                  <option value="split_pdf">PDF 분할</option>
                </select>

                <button
                  type="button"
                  onClick={handleClearAllRecords}
                  disabled={records.length === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-[#71717a] hover:text-[#dc2626] hover:bg-[#fef2f2] border border-[#e4e4e7] disabled:opacity-40"
                >
                  전체 기록 비우기
                </button>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#a1a1aa] space-y-2">
                <FileText className="w-8 h-8 text-[#d4d4d8] mx-auto" />
                <p>아직 처리된 PDF 작업 내역이 없습니다.</p>
                <p className="text-xs text-[#71717a]">
                  [이미지 ➔ PDF], [PDF 병합], [PDF 분할] 도구를 실행하면 기록이 자동 생성됩니다.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#f4f4f5]">
                {filteredRecords.map((rec) => {
                  const typeLabel =
                    rec.taskType === 'image_to_pdf'
                      ? '이미지 ➔ PDF'
                      : rec.taskType === 'merge_pdf'
                      ? 'PDF 병합'
                      : 'PDF 분할';

                  const typeColor =
                    rec.taskType === 'image_to_pdf'
                      ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                      : rec.taskType === 'merge_pdf'
                      ? 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]'
                      : 'bg-[#faf5ff] text-[#6b21a8] border-[#e9d5ff]';

                  const cached = blobCache[rec.id];

                  return (
                    <div
                      key={rec.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafafa] px-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${typeColor}`}
                          >
                            {typeLabel}
                          </span>
                          <span className="text-xs font-bold text-[#18181b] truncate max-w-sm">
                            {rec.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#71717a]">
                          <span>
                            {new Date(rec.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span>총 {rec.pageCount}p</span>
                          <span>•</span>
                          <span>{(rec.fileSizeBytes / 1024).toFixed(1)} KB</span>
                          {rec.notes && (
                            <>
                              <span>•</span>
                              <span className="text-[#a1a1aa] truncate max-w-xs">{rec.notes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cached ? (
                          <button
                            type="button"
                            onClick={() => downloadBlob(cached.blob, cached.fileName)}
                            className="px-3 py-1.5 rounded-lg bg-[#edf5f0] hover:bg-[#dfeee4] text-[#2e523f] text-xs font-semibold flex items-center gap-1 transition-colors border border-[#d6e8dc]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            다운로드
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#a1a1aa] px-2 py-1">
                            다운로드 완료됨
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg text-[#71717a] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                          title="기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
