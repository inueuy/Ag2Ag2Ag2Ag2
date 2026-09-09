import init, { HwpDocument, HwpViewer, version as coreVersion } from '@rhwp/core';
import { createEditor, RhwpEditor } from '@rhwp/editor';

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize the @rhwp/core WebAssembly module safely
 */
export async function ensureHwpCoreInit(): Promise<boolean> {
  if (wasmInitialized) return true;
  if (wasmInitPromise) {
    await wasmInitPromise;
    return wasmInitialized;
  }

  wasmInitPromise = (async () => {
    try {
      await init();
      wasmInitialized = true;
      console.log(`[RHWP Core] WebAssembly initialized successfully. Version: ${coreVersion()}`);
    } catch (err) {
      console.error('[RHWP Core] Failed to initialize WASM directly, attempting fallback URL:', err);
      try {
        // Fallback: load wasm from CDN / explicit URL if bundler path needs assistance
        const wasmUrl = new URL('@rhwp/core/rhwp_bg.wasm', import.meta.url).href;
        await init(wasmUrl);
        wasmInitialized = true;
      } catch (innerErr) {
        console.error('[RHWP Core] WASM fallback also failed:', innerErr);
        throw innerErr;
      }
    }
  })();

  await wasmInitPromise;
  return wasmInitialized;
}

export type HwpDocFormat = 'hwp' | 'hwpx' | 'hml' | 'unknown';

export interface HwpFileInfo {
  fileName: string;
  fileSize: number;
  format: HwpDocFormat;
  pageCount: number;
  lastModified?: number;
}

/**
 * Detect document format by magic bytes and extension
 */
export function detectDocumentFormat(bytes: Uint8Array, fileName = ''): HwpDocFormat {
  const lowerName = fileName.toLowerCase();

  // 1. Check for OLE2 CFB (HWP 5.x)
  // D0 CF 11 E0 A1 B1 1A E1
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  ) {
    return 'hwp';
  }

  // 2. Check for ZIP (HWPX is a zip file)
  // 50 4B 03 04
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'hwpx';
  }

  // 3. Check for XML / HWPML
  if (bytes.length >= 5) {
    const headerStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 300));
    if (headerStr.includes('<HWPML') || headerStr.includes('<?xml')) {
      return 'hml';
    }
  }

  if (lowerName.endsWith('.hwpx')) return 'hwpx';
  if (lowerName.endsWith('.hwp')) return 'hwp';
  if (lowerName.endsWith('.hml')) return 'hml';

  return 'unknown';
}

/**
 * Load an HWP/HWPX/HML document via @rhwp/core WASM
 */
export async function loadHwpWithCore(data: Uint8Array | ArrayBuffer): Promise<{
  doc: HwpDocument;
  viewer: HwpViewer;
  pageCount: number;
  format: HwpDocFormat;
}> {
  await ensureHwpCoreInit();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const format = detectDocumentFormat(bytes);

  const doc = new HwpDocument(bytes);
  const viewer = new HwpViewer(doc);
  const pageCount = viewer.pageCount();

  return {
    doc,
    viewer,
    pageCount: Math.max(1, pageCount),
    format,
  };
}

/**
 * Render an SVG for a specific page using @rhwp/core
 */
export function renderHwpPageSvg(viewer: HwpViewer, pageNum: number): string {
  try {
    return viewer.renderPageSvg(pageNum);
  } catch (err) {
    console.error(`[RHWP Core] Error rendering page ${pageNum}:`, err);
    throw err;
  }
}

/**
 * Export document using @rhwp/core to desired format
 */
export function exportHwpDocument(
  doc: HwpDocument,
  targetFormat: 'hwp' | 'hwpx' | 'hml'
): Uint8Array {
  if (targetFormat === 'hwpx') {
    return doc.exportHwpx();
  } else if (targetFormat === 'hwp') {
    return doc.exportHwp();
  } else {
    return doc.exportHml();
  }
}

/**
 * Sample Document Generator (Generates authentic HWPX / HWP / HML test files)
 */
export async function createSampleHwpDocument(
  type: 'notice' | 'support' | 'rules'
): Promise<{ fileName: string; format: HwpDocFormat; bytes: Uint8Array }> {
  await ensureHwpCoreInit();

  let title = '';
  let dateStr = new Date().toISOString().slice(0, 10);
  let paragraphs: string[] = [];

  if (type === 'notice') {
    title = '2026년도 유은이 팬카페 상반기 정기모임 및 팬미팅 안내문';
    paragraphs = [
      '【 2026년도 유은이 팬카페 상반기 정기모임 개최 공지 】',
      `공지 일자: ${dateStr} | 작성자: 팬카페 운영위원회`,
      '1. 개요',
      '유은이를 사랑하고 아껴주시는 팬카페 회원 여러분, 안녕하세요.',
      '팬 여러분의 열렬한 성원에 힘입어 2026년도 상반기 정기 오프라인 팬미팅 및 응원 세션을 개최합니다.',
      '2. 행사 일시 및 장소',
      '- 일시: 2026년 10월 18일 (일) 오후 2시 ~ 5시',
      '- 장소: 서울 코엑스 아티움 3층 그랜드 콘퍼런스홀',
      '- 참석 대상: 유은이 공식 팬카페 정회원 및 우수회원',
      '3. 주요 프로그램',
      '- 1부: 유은이와 함께하는 토크 콘서트 & Q&A 코너',
      '- 2부: 팬아트 및 응원 메시지 시상식',
      '- 3부: 공식 굿즈 나눔 및 단체 기념사진 촬영',
      '4. 참가 신청 및 유의사항',
      '- 신청 기간: 2026년 9월 15일부터 선착순 300명 마감 시까지',
      '- 본 안내 문서는 공식 HWPX 문서로 배포되었으며 무단 전재를 금합니다.',
      '팬 여러분의 많은 참여와 따뜻한 응원 부탁드립니다. 감사합니다.',
    ];
  } else if (type === 'support') {
    title = '유은이 드라마 촬영장 커피차 서포트 계획 공문';
    paragraphs = [
      '【 공문서: 유은이 드라마 촬영장 커피차 서포트 진행 건 】',
      `문서 번호: YUEUN-FAN-2026-0042 | 시행 일자: ${dateStr}`,
      '수신: 유은이 소속사 매니지먼트 팀',
      '발신: 유은이 팬카페 서포트 총괄위원회',
      '제목: 신작 드라마 촬영장 케이터링 & 커피차 서포트 승인의 건',
      '1. 귀사의 무궁한 발전을 기원합니다.',
      '2. 팬카페 회원들의 자발적 모금으로 유은이 배우님의 신작 드라마 촬영을 격려하고자 아래와 같이 커피차 서포트를 제안하오니 검토 후 승인하여 주시기 바랍니다.',
      '- 지원 품목: 프리미엄 커피/에이드 음료 200잔 및 수제 디저트 박스 150세트',
      '- 배너 문구: "빛나는 유은이와 모든 스태프분들을 응원합니다!"',
      '- 희망 일자: 2026년 10월 둘째 주 야외 촬영일 (협의 요망)',
      '3. 서포트 진행을 위해 담당 매니저님의 확인 서명을 요청드립니다.',
    ];
  } else {
    title = '유은이 팬카페 회원 회칙 및 커뮤니티 가이드라인';
    paragraphs = [
      '【 유은이 공식 팬카페 회칙 및 운영 가이드라인 】',
      `개정 일자: ${dateStr} (제4차 개정판)`,
      '제1조 (목적) 본 회칙은 유은이를 지지하는 팬들의 건강하고 예의 바른 커뮤니티 형성을 목적으로 한다.',
      '제2조 (회원의 의무) 모든 회원은 상호 존중하며, 비방이나 악의적 루머 유포를 일체 금지한다.',
      '제3조 (게시글 및 자료 공유)',
      '① 회원은 자유롭게 팬아트, 직캠, 응원글을 작성할 수 있다.',
      '② 공식 자료 및 저작권이 있는 저작물은 출처를 반드시 명기하여야 한다.',
      '③ HWP 및 HWPX 양식을 통한 공식 서포트 신청서는 정해진 규격에 맞춰 제출한다.',
      '제4조 (벌칙 규정) 회칙을 위반한 회원은 운영진 회의를 거쳐 활동 정지 또는 강제 탈퇴 조치할 수 있다.',
      '부칙: 본 규정은 공포한 날부터 즉시 효력을 발생한다.',
    ];
  }

  // Build compliant HWPML 2.1 document
  const paragraphsXml = paragraphs
    .map(
      (p) => `<P><TEXT><CHAR>${escapeXml(p)}</CHAR></TEXT></P>`
    )
    .join('\n      ');

  const hmlXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<HWPML Style="embed" Version="2.1">
  <HEAD>
    <DOCSUMMARY>
      <TITLE>${escapeXml(title)}</TITLE>
      <AUTHOR>유은이 팬카페</AUTHOR>
      <DATE>${dateStr}</DATE>
    </DOCSUMMARY>
    <DOCSETTING/>
  </HEAD>
  <BODY>
    <SECTION Id="0">
      ${paragraphsXml}
    </SECTION>
  </BODY>
</HWPML>`;

  const doc = new HwpDocument(new TextEncoder().encode(hmlXml));
  const format: HwpDocFormat = type === 'support' ? 'hwp' : 'hwpx';
  const bytes = format === 'hwp' ? doc.exportHwp() : doc.exportHwpx();
  const fileName = `${title}.${format}`;

  return {
    fileName,
    format,
    bytes,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export { createEditor, RhwpEditor };
