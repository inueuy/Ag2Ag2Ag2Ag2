import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Edit3,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileCheck,
  Printer,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRightLeft,
  Cloud,
  Layers,
} from 'lucide-react';
import {
  createEditor,
  RhwpEditor,
  loadHwpWithCore,
  renderHwpPageSvg,
  exportHwpDocument,
  createSampleHwpDocument,
  HwpDocFormat,
  ensureHwpCoreInit,
} from '../services/hwpService';
import {
  saveHwpRecord,
  getHwpRecords,
  deleteHwpRecord,
  HwpRecord,
} from '../services/hwpFirebaseService';
import { User } from '../types';

interface HwpWorkspaceProps {
  currentUser: User | null;
}

type WorkspaceMode = 'editor' | 'viewer' | 'convert' | 'history';

export const HwpWorkspace: React.FC<HwpWorkspaceProps> = ({ currentUser }) => {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('editor');

  // File State
  const [currentFileName, setCurrentFileName] = useState<string>('무제_문서.hwpx');
  const [currentFileBytes, setCurrentFileBytes] = useState<Uint8Array | null>(null);
  const [currentFormat, setCurrentFormat] = useState<HwpDocFormat>('hwpx');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Editor State (@rhwp/editor)
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<RhwpEditor | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState<boolean>(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState<boolean>(false);

  // Viewer State (@rhwp/core WASM)
  const [isViewerLoading, setIsViewerLoading] = useState<boolean>(false);
  const [viewerSvgPages, setViewerSvgPages] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewLayout, setViewLayout] = useState<'single' | 'continuous'>('single');
  const [viewerError, setViewerError] = useState<string | null>(null);

  // Convert Mode State
  const [convertSourceBytes, setConvertSourceBytes] = useState<Uint8Array | null>(null);
  const [convertSourceName, setConvertSourceName] = useState<string>('');
  const [convertSourceFormat, setConvertSourceFormat] = useState<HwpDocFormat>('hwp');
  const [convertTargetFormat, setConvertTargetFormat] = useState<'hwpx' | 'hwp' | 'hml'>('hwpx');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertSuccess, setConvertSuccess] = useState<boolean>(false);

  // Cloud Records State
  const [records, setRecords] = useState<HwpRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

  // UI Status
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load Cloud Records on mount
  useEffect(() => {
    loadCloudRecords();
  }, []);

  const loadCloudRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const data = await getHwpRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load HWP records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Initialize @rhwp/editor when in 'editor' mode
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeMode !== 'editor') return;

    let isMounted = true;

    async function initEditor() {
      if (!editorContainerRef.current) return;
      if (editorInstanceRef.current) return; // already initialized

      setIsEditorLoading(true);
      setEditorError(null);

      try {
        console.log('[RHWP Workspace] Initializing @rhwp/editor in container...');
        const editor = await createEditor(editorContainerRef.current, {
          studioUrl: 'https://edwardkim.github.io/rhwp/',
          width: '100%',
          height: '650px',
        });

        if (!isMounted) {
          editor.destroy();
          return;
        }

        editorInstanceRef.current = editor;
        setEditorReady(true);
        setIsEditorLoading(false);

        // If we already have bytes loaded, transfer to editor
        if (currentFileBytes) {
          try {
            const res = await editor.loadFile(currentFileBytes.buffer, currentFileName);
            if (res?.pageCount) {
              setTotalPages(res.pageCount);
            }
          } catch (loadErr) {
            console.warn('[RHWP Workspace] Could not preload existing document:', loadErr);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[RHWP Workspace] Error launching @rhwp/editor:', err);
        setEditorError(
          `rhwp-studio 임베드 중 문제가 발생했습니다 (${msg}). 상단 [고속 벡터 뷰어] 탭에서 @rhwp/core WASM 엔진으로 문서를 열람하실 수 있습니다.`
        );
        setIsEditorLoading(false);
      }
    }

    const timer = setTimeout(() => {
      initEditor();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeMode]);

  // Clean up editor on unmount
  useEffect(() => {
    return () => {
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.destroy();
        } catch {
          // ignore
        }
        editorInstanceRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. Render Document in @rhwp/core WASM Viewer
  // ─────────────────────────────────────────────────────────────
  const renderDocumentWithCore = async (bytes: Uint8Array, fileName: string) => {
    setIsViewerLoading(true);
    setViewerError(null);
    try {
      await ensureHwpCoreInit();
      const { viewer, pageCount, format } = await loadHwpWithCore(bytes);
      setCurrentFormat(format);
      setTotalPages(pageCount);

      const svgs: string[] = [];
      for (let i = 0; i < pageCount; i++) {
        const svg = renderHwpPageSvg(viewer, i);
        svgs.push(svg);
      }

      setViewerSvgPages(svgs);
      setCurrentPage(1);
      setIsViewerLoading(false);
      return pageCount;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[RHWP Core] Rendering error:', err);
      setViewerError(`WASM 문서 렌더링 오류: ${msg}`);
      setIsViewerLoading(false);
      throw err;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. File Upload Handler (.hwp, .hwpx, .hml)
  // ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      setCurrentFileName(file.name);
      setCurrentFileBytes(bytes);

      // Determine extension format
      const lower = file.name.toLowerCase();
      const fmt: HwpDocFormat = lower.endsWith('.hwpx') ? 'hwpx' : lower.endsWith('.hml') ? 'hml' : 'hwp';
      setCurrentFormat(fmt);

      // If in editor mode and editor ready, load directly
      if (activeMode === 'editor' && editorInstanceRef.current) {
        setIsEditorLoading(true);
        try {
          const res = await editorInstanceRef.current.loadFile(bytes.buffer, file.name);
          if (res?.pageCount) {
            setTotalPages(res.pageCount);
          }
          showToast(`'${file.name}' 문서를 편집기에 성공적으로 불러왔습니다.`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`에디터 로드 경고: ${msg}`, 'error');
        } finally {
          setIsEditorLoading(false);
        }
      }

      // Pre-render with WASM Core for viewer mode
      await renderDocumentWithCore(bytes, file.name);

      // Record to Firestore
      await saveHwpRecord({
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        format: fmt,
        pageCount: totalPages || 1,
        fileSize: file.size,
        userId: currentUser?.id,
        userNickname: currentUser?.nickname,
      });
      loadCloudRecords();

      showToast(`'${file.name}' (${fmt.toUpperCase()}) 파일을 성공적으로 열었습니다.`);
    } catch (err) {
      console.error('File load failed:', err);
      showToast('문서 파일을 읽는 중 오류가 발생했습니다. HWP/HWPX 규격 파일을 확인해 주세요.', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Sample Document Loader
  // ─────────────────────────────────────────────────────────────
  const handleLoadSample = async (type: 'notice' | 'support' | 'rules') => {
    try {
      setIsEditorLoading(true);
      setIsViewerLoading(true);

      const sample = await createSampleHwpDocument(type);
      setCurrentFileName(sample.fileName);
      setCurrentFileBytes(sample.bytes);
      setCurrentFormat(sample.format);

      // Render with WASM Core
      await renderDocumentWithCore(sample.bytes, sample.fileName);

      // If editor is mounted, load into editor
      if (editorInstanceRef.current) {
        try {
          const res = await editorInstanceRef.current.loadFile(sample.bytes.buffer, sample.fileName);
          if (res?.pageCount) {
            setTotalPages(res.pageCount);
          }
        } catch (e) {
          console.warn('Editor load warning:', e);
        }
      }

      // Save to Cloud History
      await saveHwpRecord({
        title: sample.fileName.replace(/\.[^/.]+$/, ''),
        fileName: sample.fileName,
        format: sample.format,
        pageCount: 1,
        fileSize: sample.bytes.length,
        userId: currentUser?.id,
        userNickname: currentUser?.nickname,
      });
      loadCloudRecords();

      showToast(`샘플 문서 [${sample.fileName}]를 불러왔습니다.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`샘플 생성 오류: ${msg}`, 'error');
    } finally {
      setIsEditorLoading(false);
      setIsViewerLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Export / Download Handlers
  // ─────────────────────────────────────────────────────────────
  const handleExportFromEditor = async (targetFormat: 'hwpx' | 'hwp' | 'hml') => {
    if (!editorInstanceRef.current) {
      showToast('에디터가 아직 준비되지 않았습니다.', 'error');
      return;
    }

    try {
      showToast(`${targetFormat.toUpperCase()} 파일로 내보내는 중...`);
      let bytes: Uint8Array;

      if (targetFormat === 'hwpx') {
        bytes = await editorInstanceRef.current.exportHwpx();
      } else if (targetFormat === 'hwp') {
        bytes = await editorInstanceRef.current.exportHwp();
      } else {
        bytes = await editorInstanceRef.current.exportHml();
      }

      const mime =
        targetFormat === 'hwpx'
          ? 'application/vnd.hancom.hwpx'
          : targetFormat === 'hwp'
          ? 'application/x-hwp'
          : 'application/xml';

      const blob = new Blob([bytes], { type: mime });
      const baseTitle = currentFileName.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseTitle}_저장.${targetFormat}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Record to history
      await saveHwpRecord({
        title: baseTitle,
        fileName: downloadName,
        format: targetFormat,
        pageCount: totalPages,
        fileSize: bytes.length,
        userId: currentUser?.id,
        userNickname: currentUser?.nickname,
      });
      loadCloudRecords();

      showToast(`${downloadName} 다운로드가 완료되었습니다.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`내보내기 실패: ${msg}`, 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Format Converter Handler (HWP ⮂ HWPX ⮂ HML)
  // ─────────────────────────────────────────────────────────────
  const handleConvertFile = async () => {
    if (!convertSourceBytes) {
      showToast('변환할 원본 문서를 먼저 선택해 주세요.', 'error');
      return;
    }

    setIsConverting(true);
    setConvertSuccess(false);

    try {
      await ensureHwpCoreInit();
      const { doc } = await loadHwpWithCore(convertSourceBytes);
      const exportedBytes = exportHwpDocument(doc, convertTargetFormat);

      const baseName = convertSourceName.replace(/\.[^/.]+$/, '');
      const convertedName = `${baseName}_변환.${convertTargetFormat}`;

      const mime =
        convertTargetFormat === 'hwpx'
          ? 'application/vnd.hancom.hwpx'
          : convertTargetFormat === 'hwp'
          ? 'application/x-hwp'
          : 'application/xml';

      const blob = new Blob([exportedBytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = convertedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setConvertSuccess(true);
      showToast(`변환 완료: ${convertedName} 파일이 저장되었습니다.`);

      await saveHwpRecord({
        title: baseName + ` (${convertTargetFormat.toUpperCase()} 변환)`,
        fileName: convertedName,
        format: convertTargetFormat,
        pageCount: 1,
        fileSize: exportedBytes.length,
        userId: currentUser?.id,
        userNickname: currentUser?.nickname,
      });
      loadCloudRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`포맷 변환 오류: ${msg}`, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-[#edf5f0] border-[#cbe2d4] text-[#1c4832]'
              : 'bg-[#fdf2f2] border-[#f8d7da] text-[#9b1c1c]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#2c5340] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#9b1c1c] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-[#ffffff] rounded-2xl p-6 sm:p-8 border border-[#ececed] shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#edf5f0] border border-[#d6e7dc] flex items-center justify-center text-[#2e523f]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#18181b] tracking-tight">
                    한글 HWP / HWPX 문서 스튜디오
                  </h1>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#edf5f0] text-[#2c5340] border border-[#d6e7dc]">
                    rhwp v0.8.6 탑재
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#71717a] mt-0.5">
                  한글 표준 문서(.hwp, .hwpx, .hml)의 실시간 웹 뷰어, 강력한 브라우저 편집기 및 상호 포맷 변환
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".hwp,.hwpx,.hml"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#2e523f] text-[#ffffff] hover:bg-[#254233] transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              내 PC 파일 열기
            </button>

            {/* Sample Dropdown / Quick Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleLoadSample('notice')}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl bg-[#f4f7f5] text-[#2c5340] border border-[#e0ece4] hover:bg-[#eaf1ec] transition-colors"
                title="팬카페 안내문 샘플 열기"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#3a6951]" />
                샘플 1 (안내문.hwpx)
              </button>
              <button
                onClick={() => handleLoadSample('support')}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl bg-[#f4f7f5] text-[#2c5340] border border-[#e0ece4] hover:bg-[#eaf1ec] transition-colors"
                title="커피차 서포트 공문 샘플 열기"
              >
                <FileCheck className="w-3.5 h-3.5 text-[#3a6951]" />
                샘플 2 (공문.hwp)
              </button>
            </div>
          </div>
        </div>

        {/* Current Document Summary Strip */}
        <div className="mt-5 pt-4 border-t border-[#f0f0f1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#71717a]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#18181b] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#315643]"></span>
              현재 작업 문서:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#f4f4f5] text-[#27272a] font-mono font-medium border border-[#e4e4e7]">
              {currentFileName}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#edf5f0] text-[#2c5340] border border-[#d6e7dc]">
              {currentFormat}
            </span>
            <span>총 {totalPages}페이지</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
            <span>엔진: Rust + WebAssembly (@rhwp/core)</span>
            <span>•</span>
            <span>에디터: @rhwp/editor (rhwp-studio)</span>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ececed] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode('editor')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all border ${
              activeMode === 'editor'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#ffffff] text-[#71717a] border-[#ececed] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            한글 에디터 모드 (편집)
          </button>

          <button
            onClick={() => {
              setActiveMode('viewer');
              if (currentFileBytes && viewerSvgPages.length === 0) {
                renderDocumentWithCore(currentFileBytes, currentFileName);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all border ${
              activeMode === 'viewer'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#ffffff] text-[#71717a] border-[#ececed] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <Eye className="w-4 h-4" />
            고속 벡터 뷰어 모드 (열람)
          </button>

          <button
            onClick={() => {
              setActiveMode('convert');
              if (currentFileBytes) {
                setConvertSourceBytes(currentFileBytes);
                setConvertSourceName(currentFileName);
                setConvertSourceFormat(currentFormat);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all border ${
              activeMode === 'convert'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#ffffff] text-[#71717a] border-[#ececed] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            포맷 변환 (HWP ⮂ HWPX)
          </button>

          <button
            onClick={() => setActiveMode('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all border ${
              activeMode === 'history'
                ? 'bg-[#2e523f] text-[#ffffff] border-[#2e523f] shadow-xs'
                : 'bg-[#ffffff] text-[#71717a] border-[#ececed] hover:bg-[#f4f4f5] hover:text-[#18181b]'
            }`}
          >
            <Cloud className="w-4 h-4" />
            문서 보관함 ({records.length})
          </button>
        </div>

        {/* Action Toolbar on Editor Mode */}
        {activeMode === 'editor' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExportFromEditor('hwpx')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4] hover:bg-[#e2ede6] transition-colors"
              title="HWPX로 파일 저장"
            >
              <Download className="w-3.5 h-3.5" />
              HWPX 다운로드
            </button>
            <button
              onClick={() => handleExportFromEditor('hwp')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4] hover:bg-[#e2ede6] transition-colors"
              title="HWP(5.0)로 파일 저장"
            >
              <Download className="w-3.5 h-3.5" />
              HWP 다운로드
            </button>
            <button
              onClick={() => handleExportFromEditor('hml')}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#ffffff] text-[#71717a] border border-[#ececed] hover:bg-[#f4f4f5] transition-colors"
              title="HML XML 형식으로 저장"
            >
              HML
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 1: HWP/HWPX Interactive Editor Mode */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeMode === 'editor' && (
        <div className="space-y-3">
          {/* Editor Quick Command Bar */}
          <div className="bg-[#ffffff] px-4 py-2.5 rounded-xl border border-[#ececed] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#18181b]">편집 도구:</span>
              <button
                onClick={async () => {
                  if (editorInstanceRef.current) {
                    try {
                      await editorInstanceRef.current.commands.execute('edit:undo');
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="px-2 py-1 rounded bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]"
              >
                실행 취소 (Undo)
              </button>
              <button
                onClick={async () => {
                  if (editorInstanceRef.current) {
                    try {
                      await editorInstanceRef.current.commands.execute('edit:redo');
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="px-2 py-1 rounded bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]"
              >
                다시 실행 (Redo)
              </button>
              <button
                onClick={async () => {
                  if (editorInstanceRef.current) {
                    try {
                      await editorInstanceRef.current.commands.execute('table:insert', {}, { allowDialog: true });
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="px-2 py-1 rounded bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]"
              >
                표 삽입
              </button>
              <button
                onClick={async () => {
                  if (editorInstanceRef.current) {
                    try {
                      await editorInstanceRef.current.commands.execute('file:print');
                    } catch {
                      window.print();
                    }
                  }
                }}
                className="px-2 py-1 rounded bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7] flex items-center gap-1"
              >
                <Printer className="w-3 h-3" />
                인쇄
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#71717a]">
              <span>💡 문서를 직접 수정하거나 키보드로 자유롭게 내용을 작성할 수 있습니다.</span>
            </div>
          </div>

          {/* Editor Container Area */}
          <div className="relative bg-[#ffffff] rounded-2xl border border-[#ececed] overflow-hidden shadow-xs">
            {isEditorLoading && (
              <div className="absolute inset-0 z-20 bg-[#ffffff]/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <RefreshCw className="w-7 h-7 text-[#2e523f] animate-spin mb-3" />
                <p className="text-sm font-semibold text-[#18181b]">한글 에디터를 불러오는 중입니다...</p>
                <p className="text-xs text-[#71717a] mt-1">@rhwp/editor 엔진 및 한글 폰트를 초기화하고 있습니다.</p>
              </div>
            )}

            {editorError && (
              <div className="p-6 bg-[#fff8f8] border-b border-[#fcdada] text-[#9b1c1c] text-xs">
                <p className="font-semibold mb-1">에디터 로드 알림</p>
                <p className="mb-3">{editorError}</p>
                <button
                  onClick={() => setActiveMode('viewer')}
                  className="px-3 py-1.5 bg-[#9b1c1c] text-[#ffffff] font-medium rounded-lg text-xs"
                >
                  고속 벡터 뷰어 모드로 전환하기
                </button>
              </div>
            )}

            {/* The Mount Target for createEditor */}
            <div
              id="hwp-editor-container"
              ref={editorContainerRef}
              className="w-full min-h-[650px] h-[75vh]"
              style={{ minHeight: '650px' }}
            />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 2: High-Fidelity WASM Vector Viewer Mode (@rhwp/core) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeMode === 'viewer' && (
        <div className="space-y-4">
          {/* Viewer Control Strip */}
          <div className="bg-[#ffffff] p-3 sm:p-4 rounded-xl border border-[#ececed] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#e4e4e7] disabled:opacity-40 hover:bg-[#f4f4f5] transition-colors"
                title="이전 페이지"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-medium text-[#18181b] px-2">
                {currentPage} / {totalPages} 페이지
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#e4e4e7] disabled:opacity-40 hover:bg-[#f4f4f5] transition-colors"
                title="다음 페이지"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-1.5 bg-[#f4f4f5] p-1 rounded-lg">
              <button
                onClick={() => setViewLayout('single')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewLayout === 'single' ? 'bg-[#ffffff] text-[#18181b] shadow-xs' : 'text-[#71717a]'
                }`}
              >
                단일 페이지
              </button>
              <button
                onClick={() => setViewLayout('continuous')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewLayout === 'continuous' ? 'bg-[#ffffff] text-[#18181b] shadow-xs' : 'text-[#71717a]'
                }`}
              >
                연속 스크롤
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1.5 rounded-lg border border-[#e4e4e7] hover:bg-[#f4f4f5] transition-colors"
                title="축소"
              >
                <ZoomOut className="w-4 h-4 text-[#52525b]" />
              </button>

              <span className="w-12 text-center font-mono font-medium text-[#27272a]">{zoomLevel}%</span>

              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                className="p-1.5 rounded-lg border border-[#e4e4e7] hover:bg-[#f4f4f5] transition-colors"
                title="확대"
              >
                <ZoomIn className="w-4 h-4 text-[#52525b]" />
              </button>

              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-1 rounded border border-[#e4e4e7] text-[11px] font-medium text-[#71717a] hover:bg-[#f4f4f5]"
              >
                100%
              </button>
            </div>

            {/* Direct Switch to Editor */}
            <button
              onClick={() => setActiveMode('editor')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#edf5f0] text-[#2c5340] border border-[#d6e7dc] font-semibold hover:bg-[#e2ede6]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              에디터에서 수정하기
            </button>
          </div>

          {/* SVG Page Display Stage */}
          <div className="bg-[#f0f1f2] rounded-2xl p-4 sm:p-8 border border-[#e4e4e7] min-h-[600px] flex flex-col items-center justify-center overflow-auto max-h-[85vh]">
            {isViewerLoading && (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-[#2e523f] animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#18181b]">WASM 벡터 렌더러로 페이지 변환 중...</p>
                <p className="text-xs text-[#71717a] mt-1">한글 조판 엔진이 레이아웃을 계산하고 있습니다.</p>
              </div>
            )}

            {viewerError && (
              <div className="p-8 text-center max-w-md bg-[#ffffff] rounded-xl border border-[#f8d7da]">
                <AlertCircle className="w-8 h-8 text-[#9b1c1c] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#9b1c1c]">문서 열람 중 문제가 발생했습니다</p>
                <p className="text-xs text-[#71717a] mt-1 mb-4">{viewerError}</p>
                <button
                  onClick={() => handleLoadSample('notice')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2e523f] text-[#ffffff]"
                >
                  표준 샘플 문서 로드하기
                </button>
              </div>
            )}

            {!isViewerLoading && !viewerError && viewerSvgPages.length === 0 && (
              <div className="p-12 text-center max-w-md">
                <BookOpen className="w-10 h-10 text-[#a1a1aa] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#18181b]">불러온 한글 문서가 없습니다</p>
                <p className="text-xs text-[#71717a] mt-1 mb-4">
                  상단 [내 PC 파일 열기] 버튼을 통해 HWP/HWPX 문서를 선택하거나, 샘플 문서를 로드해 보세요.
                </p>
                <button
                  onClick={() => handleLoadSample('notice')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2e523f] text-[#ffffff] hover:bg-[#254233]"
                >
                  샘플 1 (정기모임 안내문.hwpx) 로드
                </button>
              </div>
            )}

            {/* Displaying Rendered SVG Pages */}
            {!isViewerLoading && viewerSvgPages.length > 0 && (
              <div className="w-full flex flex-col items-center gap-6">
                {viewLayout === 'single' ? (
                  /* Single Page View */
                  <div
                    className="bg-[#ffffff] shadow-md border border-[#e2e2e4] rounded-sm transition-transform duration-150 origin-top overflow-hidden"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      maxWidth: '100%',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: viewerSvgPages[currentPage - 1] || '<div class="p-8">페이지 렌더링 실패</div>',
                    }}
                  />
                ) : (
                  /* Continuous Scroll View */
                  viewerSvgPages.map((svg, idx) => (
                    <div
                      key={idx}
                      className="bg-[#ffffff] shadow-md border border-[#e2e2e4] rounded-sm transition-transform duration-150 origin-top overflow-hidden"
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: 'top center',
                        maxWidth: '100%',
                      }}
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 3: Format Converter Mode (HWP ⮂ HWPX ⮂ HML) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeMode === 'convert' && (
        <div className="bg-[#ffffff] rounded-2xl p-6 sm:p-8 border border-[#ececed] space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181b]">한글 문서 포맷 변환기</h2>
            <p className="text-xs text-[#71717a] mt-0.5">
              HWP 5.0 구버전 문서와 최신 개방형 표준 HWPX(KS X 6101), HML(XML) 간 자유로운 상호 변환을 지원합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#fbfbfb] rounded-xl border border-[#f0f0f1]">
            {/* Source Document Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#27272a] block">변환할 원본 문서:</label>
              {convertSourceBytes ? (
                <div className="p-4 bg-[#ffffff] rounded-xl border border-[#e4e4e7] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-[#2e523f]" />
                    <div>
                      <p className="text-xs font-bold text-[#18181b]">{convertSourceName}</p>
                      <p className="text-[11px] text-[#71717a]">
                        형식: {convertSourceFormat.toUpperCase()} • 크기: {(convertSourceBytes.length / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConvertSourceBytes(null);
                      setConvertSourceName('');
                    }}
                    className="text-xs text-[#9b1c1c] hover:underline"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-[#e4e4e7] rounded-xl text-center cursor-pointer hover:border-[#2e523f] hover:bg-[#fafdfb] transition-colors"
                >
                  <Upload className="w-6 h-6 text-[#71717a] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[#18181b]">클릭하여 파일 선택 (.hwp, .hwpx, .hml)</p>
                  <p className="text-[11px] text-[#a1a1aa] mt-0.5">또는 샘플 문서를 먼저 로드하세요</p>
                </div>
              )}
            </div>

            {/* Target Format Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#27272a] block">변환 대상 포맷 (출력):</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setConvertTargetFormat('hwpx')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    convertTargetFormat === 'hwpx'
                      ? 'bg-[#edf5f0] border-[#2e523f] text-[#2c5340] font-bold shadow-xs'
                      : 'bg-[#ffffff] border-[#e4e4e7] text-[#52525b] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <div className="text-sm">HWPX</div>
                  <div className="text-[10px] text-[#71717a] mt-0.5">개방형 표준</div>
                </button>

                <button
                  type="button"
                  onClick={() => setConvertTargetFormat('hwp')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    convertTargetFormat === 'hwp'
                      ? 'bg-[#edf5f0] border-[#2e523f] text-[#2c5340] font-bold shadow-xs'
                      : 'bg-[#ffffff] border-[#e4e4e7] text-[#52525b] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <div className="text-sm">HWP</div>
                  <div className="text-[10px] text-[#71717a] mt-0.5">한글 5.0 레거시</div>
                </button>

                <button
                  type="button"
                  onClick={() => setConvertTargetFormat('hml')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    convertTargetFormat === 'hml'
                      ? 'bg-[#edf5f0] border-[#2e523f] text-[#2c5340] font-bold shadow-xs'
                      : 'bg-[#ffffff] border-[#e4e4e7] text-[#52525b] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <div className="text-sm">HML</div>
                  <div className="text-[10px] text-[#71717a] mt-0.5">XML 마크업</div>
                </button>
              </div>

              <div className="p-3 bg-[#f4f7f5] rounded-xl border border-[#e0ece4] text-[11px] text-[#2c5340]">
                ✓ 변환은 외부 서버로 문서를 전송하지 않고 브라우저 내 WASM 엔진에서 안전하게 수행됩니다.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              disabled={!convertSourceBytes || isConverting}
              onClick={handleConvertFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2e523f] text-[#ffffff] text-xs sm:text-sm font-semibold hover:bg-[#254233] disabled:opacity-50 transition-colors shadow-xs"
            >
              {isConverting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  변환 진행 중...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  {convertTargetFormat.toUpperCase()}로 변환 및 다운로드
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 4: Cloud Document Storage & History (Firebase) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeMode === 'history' && (
        <div className="bg-[#ffffff] rounded-2xl p-6 sm:p-8 border border-[#ececed] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#18181b]">HWP / HWPX 문서 보관함</h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                생성, 변환 및 편집된 문서 이력이 Firebase Firestore(`hwp_documents`)에 안전하게 보관됩니다.
              </p>
            </div>
            <button
              onClick={loadCloudRecords}
              className="p-2 rounded-lg border border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#52525b]"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingRecords ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 text-[#2e523f] animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#71717a]">보관함 목록을 불러오는 중...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-[#71717a] text-xs bg-[#fafafa] rounded-xl border border-[#f0f0f1]">
              <Cloud className="w-8 h-8 text-[#a1a1aa] mx-auto mb-2" />
              <p className="font-semibold text-[#18181b]">보관된 문서 이력이 없습니다.</p>
              <p className="mt-1">에디터에서 문서를 열거나 샘플 문서를 생성해 보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#ececed] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9f9fb] border-b border-[#ececed] text-[#71717a] font-medium">
                  <tr>
                    <th className="py-2.5 px-3">문서 제목 / 파일명</th>
                    <th className="py-2.5 px-3">포맷</th>
                    <th className="py-2.5 px-3">페이지</th>
                    <th className="py-2.5 px-3">용량</th>
                    <th className="py-2.5 px-3">작업 일시</th>
                    <th className="py-2.5 px-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f1]">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#fafafa] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#18181b]">{rec.title}</div>
                        <div className="text-[11px] text-[#71717a] font-mono">{rec.fileName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#edf5f0] text-[#2c5340] border border-[#d6e7dc]">
                          {rec.format}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#52525b]">{rec.pageCount} p</td>
                      <td className="py-3 px-3 text-[#52525b]">
                        {(rec.fileSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-3 text-[#71717a]">
                        {new Date(rec.createdAt).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={async () => {
                            await deleteHwpRecord(rec.id);
                            loadCloudRecords();
                            showToast('문서 기록이 삭제되었습니다.');
                          }}
                          className="p-1 rounded text-[#9b1c1c] hover:bg-[#fdf2f2] transition-colors"
                          title="기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
