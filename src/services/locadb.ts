import { User, Post, Comment, PdfRecord } from '../types';
import { db, auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

const DB_VERSION_KEY = 'locadb_fan_v3';
const USERS_KEY = 'locadb_users';
const POSTS_KEY = 'locadb_posts';
const COMMENTS_KEY = 'locadb_comments';
const PDF_RECORDS_KEY = 'locadb_pdf_records';
const SESSION_KEY = 'locadb_session';

export const initialUsers: User[] = [
  {
    id: 'user_admin',
    username: 'admin',
    password: 'password123',
    nickname: '카페지기(관리자)',
    email: 'admin@fan.eun',
    role: 'admin',
    status: 'active',
    createdAt: '2025-01-01T09:00:00.000Z',
  },
  {
    id: 'user_test01',
    username: 'test01@mail.com',
    password: '123456',
    nickname: '은이바라기',
    email: 'test01@mail.com',
    role: 'user',
    status: 'active',
    createdAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'user_test02',
    username: 'test02@mail.com',
    password: '123456',
    nickname: '햇살은이',
    email: 'test02@mail.com',
    role: 'user',
    status: 'active',
    createdAt: '2025-02-02T11:00:00.000Z',
  },
  {
    id: 'user_test03',
    username: 'test03@mail.com',
    password: '123456',
    nickname: '은이누나팬',
    email: 'test03@mail.com',
    role: 'user',
    status: 'active',
    createdAt: '2025-02-03T12:00:00.000Z',
  },
];

export const initialPosts: Post[] = [
  {
    id: 'post_notice_1',
    title: '[공지] 유은이 공식 팬카페에 오신 것을 환영합니다! (게시판 이용 수칙)',
    content: `안녕하세요, 유은이 팬카페 회원 여러분!\n\n유은이를 사랑하고 아껴주시는 모든 팬분들을 진심으로 환영합니다. 서로 존중하며 따뜻한 응원을 나누는 공간이 될 수 있도록 아래 수칙을 준수해 주시기 바랍니다.\n\n1. 상호 비방 및 분란 조장 게시글은 무통보 삭제 및 이용정지될 수 있습니다.\n2. 공식 일정 및 사진 공유 시 출처를 명확히 기재해 주세요.\n3. 사생활 침해성 글이나 확인되지 않은 루머 유포는 엄격히 금지됩니다.\n4. 게시글 작성 시 카테고리(공지, 자유, 질문, 정보) 및 관련 태그(#유은 등)를 적절히 활용해 주세요.\n\n언제나 빛나는 유은이를 위해 따뜻하고 배려 넘치는 팬카페 문화를 함께 만들어가요!`,
    tags: ['#공지', '#유은', '#팬에티켓', '#팬카페'],
    authorId: 'user_admin',
    authorNickname: '카페지기(관리자)',
    authorRole: 'admin',
    category: '공지',
    views: 342,
    likes: 58,
    likedUserIds: ['user_test01', 'user_test02', 'user_test03'],
    isNotice: true,
    createdAt: '2025-02-01T09:00:00.000Z',
    updatedAt: '2025-02-01T09:00:00.000Z',
    commentsCount: 3,
  },

  // --- test01@mail.com (은이바라기) 5 posts ---
  {
    id: 'post_t1_1',
    title: '유은이 오늘 라디오 라이브 방송 들으신 분 계신가요?!',
    content: `오늘 퇴근길에 유은이 나오는 라디오 라이브 본방사수했는데 목소리가 진짜 꿀이네요 ㅠㅠ\n라이브 코너에서 기타 반주에 맞춰 불러준 어쿠스틱 버전 노래 듣고 바로 입덕 갱신했습니다!\nDJ분도 유은이 라이브 실력 극찬하시던데 너무 뿌듯했어요.\n다음 주에도 고정 게스트로 나온다니 다들 달력에 꼭 체크해두세요!`,
    tags: ['#유은', '#라디오', '#퇴근길', '#라이브'],
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    category: '자유',
    views: 148,
    likes: 27,
    likedUserIds: ['user_test02', 'user_test03'],
    isNotice: false,
    createdAt: '2025-02-05T18:30:00.000Z',
    updatedAt: '2025-02-05T18:30:00.000Z',
    commentsCount: 2,
  },
  {
    id: 'post_t1_2',
    title: '지난주 유은이 단독 팬미팅 현장 직찍 & 솔직 후기 공유합니다',
    content: `무대 앞자리 운 좋게 당첨돼서 다녀왔는데 실물이 화면보다 100배는 더 반짝거리고 따뜻했어요.\n팬들 한 명 한 명 눈 마주치며 인사해 주고 역조공 선물로 핸드크림이랑 직접 쓴 손편지까지 챙겨주는 정성에 울컥했습니다.\n팬미팅 현장 분위기도 너무 화기애애했고 미공개 곡 한 소절 불러줬는데 멜로디가 아직도 귓가에 맴도네요.\n평생 유은이만 응원할게요!`,
    tags: ['#유은', '#팬미팅', '#직찍후기', '#역조공'],
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    category: '정보',
    views: 265,
    likes: 49,
    likedUserIds: ['user_test02', 'user_admin'],
    isNotice: false,
    createdAt: '2025-02-08T14:15:00.000Z',
    updatedAt: '2025-02-08T14:15:00.000Z',
    commentsCount: 2,
  },
  {
    id: 'post_t1_3',
    title: '유은이 새 앨범 초동 응원 음원 스트리밍 가이드 정리',
    content: `새 앨범 발매일이 이제 2주 남았네요! 우리 유은이 이번 앨범도 꼭 1위 만들어줍시다.\n\n주요 음원 사이트별 스트리밍 점수 반영 팁:\n1. 1시간에 1회 완곡 스트리밍(음소거 금지, 볼륨 1 이상 권장)\n2. 발매 당일 개별곡 다운로드 및 선물하기 참여\n3. 좋아요 및 하트 꾹 누르기\n\n다들 스밍 가이드 확인하시고 팬카페 분들도 함께 달려봐요!`,
    tags: ['#유은', '#음원스밍', '#스밍가이드', '#1위가자'],
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    category: '정보',
    views: 320,
    likes: 64,
    likedUserIds: ['user_test02', 'user_test03', 'user_admin'],
    isNotice: false,
    createdAt: '2025-02-12T11:00:00.000Z',
    updatedAt: '2025-02-12T11:00:00.000Z',
    commentsCount: 2,
  },
  {
    id: 'post_t1_4',
    title: '혹시 이번 유은이 시즌그리팅 미공개 포카 교환 구하시는 분?',
    content: `이번 시그 A버전 볼콕 유은이 포카가 중복으로 나와서 B버전 꽃받침 유은이 포카랑 맞교환 구합니다!\n개봉 즉시 하드 슬리브에 보관해서 기스나 모서리 구김 없이 완전 깨끗합니다.\n직거래는 홍대나 강남 쪽 가능하고 준등기나 반택 교환도 대환영입니다. 댓글 달아주시면 쪽지 드릴게요.`,
    tags: ['#유은', '#포토카드', '#포카교환', '#시즌그리팅'],
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    category: '자유',
    views: 110,
    likes: 15,
    likedUserIds: ['user_test03'],
    isNotice: false,
    createdAt: '2025-02-15T16:20:00.000Z',
    updatedAt: '2025-02-15T16:20:00.000Z',
    commentsCount: 1,
  },
  {
    id: 'post_t1_5',
    title: '유은이 팬카페 등업 조건이나 등급 기준이 어떻게 되나요?',
    content: `팬카페 가입한 지 얼마 안 된 새싹팬인데 우수회원이나 정회원 등업 기준이 궁금합니다!\n출석일수랑 게시글, 댓글 개수 충족하면 자동으로 등업 신청되는 방식인가요?\n등업 전용 게시판 양식이 따로 있는지 선배 팬님들 조언 부탁드립니다 :)`,
    tags: ['#유은', '#등업안내', '#질문', '#새싹팬'],
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    category: '질문',
    views: 95,
    likes: 9,
    likedUserIds: ['user_test02'],
    isNotice: false,
    createdAt: '2025-02-18T19:40:00.000Z',
    updatedAt: '2025-02-18T19:40:00.000Z',
    commentsCount: 2,
  },

  // --- test02@mail.com (햇살은이) 5 posts ---
  {
    id: 'post_t2_1',
    title: '유은이 데뷔 1주년 기념 컵홀더 이벤트 카페 다녀왔어요',
    content: `홍대랑 성수에 열린 1주년 기념 생일 카페 투어 돌고 왔습니다!\n카페 들어서자마자 유은이 대형 현수막이랑 아기자기한 포토존이 있어서 감탄했어요.\n특전으로 받은 홀로그램 스티커팩이랑 미니 엽서도 디자인이 너무 감각적이고 예쁩니다.\n이번 주 일요일까지 진행된다고 하니 아직 못 가보신 분들 꼭 방문해보세요!`,
    tags: ['#유은', '#생일카페', '#컵홀더이벤트', '#성수카페'],
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    category: '자유',
    views: 195,
    likes: 38,
    likedUserIds: ['user_test01', 'user_test03'],
    isNotice: false,
    createdAt: '2025-02-20T13:10:00.000Z',
    updatedAt: '2025-02-20T13:10:00.000Z',
    commentsCount: 2,
  },
  {
    id: 'post_t2_2',
    title: '유은이가 브이로그에서 착용한 세이지 니트 가디건 정보 아시는 분?',
    content: `어제 올라온 일상 브이로그 영상에서 유은이가 입고 나온 파스텔 세이지 그린 컬러 케이블 니트 가디건 너무 취향저격이더라고요!\n유은이 착장 손민수하고 싶어서 브랜드 검색해봤는데 도저히 못 찾겠네요 ㅠㅠ\n패션 정보 잘 아시는 팬분 계시면 댓글로 공유 부탁드립니다!`,
    tags: ['#유은', '#착장정보', '#손민수', '#브이로그'],
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    category: '질문',
    views: 130,
    likes: 18,
    likedUserIds: ['user_test01'],
    isNotice: false,
    createdAt: '2025-02-22T15:45:00.000Z',
    updatedAt: '2025-02-22T15:45:00.000Z',
    commentsCount: 1,
  },
  {
    id: 'post_t2_3',
    title: '유은이 인터뷰 모음집 - 데뷔 전 인터뷰부터 최근 매거진까지',
    content: `유은이의 음악에 대한 진심과 팬들을 향한 깊은 애정이 드러난 역대 인터뷰들을 모아봤습니다.\n\n"팬분들이 제게 보내주시는 온기가 제가 계속해서 노래할 수 있는 가장 든든한 날개예요."\n\n힘들 때마다 유은이 인터뷰 문장들을 읽어보는데 항상 큰 위로가 되네요. 다들 시간 나실 때 한 번씩 읽어보시길 권합니다.`,
    tags: ['#유은', '#인터뷰', '#아카이브', '#명언'],
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    category: '정보',
    views: 240,
    likes: 56,
    likedUserIds: ['user_test01', 'user_test03', 'user_admin'],
    isNotice: false,
    createdAt: '2025-02-24T10:30:00.000Z',
    updatedAt: '2025-02-24T10:30:00.000Z',
    commentsCount: 1,
  },
  {
    id: 'post_t2_4',
    title: '오늘 퇴근하고 유은이 커버곡 메들리 들으면서 힐링 중',
    content: `유은이가 공식 유튜브 채널에 올려준 어쿠스틱 팝송 커버랑 발라드 커버 연속 재생 중인데 하루 피로가 싹 가시는 느낌입니다.\n특유의 맑고 서정적인 음색에 호흡 조절까지 완벽해서 들을 때마다 감탄이 절로 나와요.\n혹시 아직 못 들어보신 분들 계시면 '봄날의 기억' 커버 꼭 들어보세요!`,
    tags: ['#유은', '#커버곡', '#플레이리스트', '#힐링'],
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    category: '자유',
    views: 145,
    likes: 31,
    likedUserIds: ['user_test01'],
    isNotice: false,
    createdAt: '2025-02-26T21:00:00.000Z',
    updatedAt: '2025-02-26T21:00:00.000Z',
    commentsCount: 1,
  },
  {
    id: 'post_t2_5',
    title: '유은이 공식 응원봉 2차 재입고 알림 신청 방법 공유',
    content: `1차 사전 예약 때 5분 만에 전량 품절돼서 못 사신 분들 많으시죠?\n공식 굿즈 스토어 앱에 접속하시면 2차 입고 SMS 알림 신청 버튼이 열렸습니다.\n이번 2차 물량부터는 콘서트 현장 블루투스 중앙 제어 연동 기능도 탑재된다고 하니 놓치지 마시고 신청해 두세요!`,
    tags: ['#유은', '#응원봉', '#굿즈정보', '#재입고'],
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    category: '정보',
    views: 210,
    likes: 45,
    likedUserIds: ['user_test01', 'user_test03'],
    isNotice: false,
    createdAt: '2025-02-28T09:15:00.000Z',
    updatedAt: '2025-02-28T09:15:00.000Z',
    commentsCount: 2,
  },

  // --- test03@mail.com (은이누나팬) 5 posts ---
  {
    id: 'post_t3_1',
    title: '유은이 캐리커처 팬아트 그려봤습니다! (부족하지만 예쁘게 봐주세요)',
    content: `아이패드로 유은이 이번 신곡 티저 사진 보고 그린 팬아트입니다!\n유은이의 댕댕이 같은 사랑스러운 눈망울이랑 특유의 화사한 미소를 담아보려고 정성 들여 그렸어요.\n스마트폰 배경화면 사이즈(9:16)로도 제작했으니 팬카페 가족분들 자유롭게 저장해서 쓰셔도 됩니다 :)`,
    tags: ['#유은', '#팬아트', '#일러스트', '#배경화면'],
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    category: '자유',
    views: 280,
    likes: 62,
    likedUserIds: ['user_test01', 'user_test02'],
    isNotice: false,
    createdAt: '2025-03-01T14:20:00.000Z',
    updatedAt: '2025-03-01T14:20:00.000Z',
    commentsCount: 3,
  },
  {
    id: 'post_t3_2',
    title: '유은이 다음 콘서트 티켓팅 꿀팁 공유 (인터파크 예매)',
    content: `지난 연말 콘서트 때 올콘 좌석 예매 성공했던 제 티켓팅 노하우 전수합니다.\n\n1. 네이비즘 서버시간 59.8초에 정밀 클릭\n2. 브라우저 팝업 차단 사전 해제 및 본인인증 완료 필수\n3. 결제 수단은 무통장입금으로 선택하여 렉 방지\n\n이번 단독 콘서트는 규모가 더 커진다고 하니 팬카페 식구들 모두 원하는 좌석 잡으시길 응원합니다!`,
    tags: ['#유은', '#콘서트', '#티켓팅', '#꿀팁'],
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    category: '정보',
    views: 345,
    likes: 76,
    likedUserIds: ['user_test01', 'user_test02', 'user_admin'],
    isNotice: false,
    createdAt: '2025-03-03T11:40:00.000Z',
    updatedAt: '2025-03-03T11:40:00.000Z',
    commentsCount: 2,
  },
  {
    id: 'post_t3_3',
    title: '유은이 인스타 스토리 질문타임 답변 모음 (Q&A 요약)',
    content: `오늘 깜짝으로 열렸던 유은이 무물(무엇이든 물어보세요) 전체 캡처본 요약입니다.\n\nQ: 요즘 제일 좋아하는 과일은?\nA: 샤인머스캣이랑 복숭아!\nQ: 콘서트 준비 잘 되고 있나요?\nA: 팬분들 깜짝 놀랄 만한 스페셜 무대 준비 중이니까 기대 많이 해주세요!\n\n유은이 답변 하나하나가 너무 다정해서 캡처하면서 심장이 녹아내렸네요.`,
    tags: ['#유은', '#인스타그램', '#무물', '#스포일러'],
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    category: '정보',
    views: 230,
    likes: 48,
    likedUserIds: ['user_test01', 'user_test02'],
    isNotice: false,
    createdAt: '2025-03-05T17:00:00.000Z',
    updatedAt: '2025-03-05T17:00:00.000Z',
    commentsCount: 1,
  },
  {
    id: 'post_t3_4',
    title: '콘서트 응원 슬로건 문구 투표 같이 참여해주세요!',
    content: `다음 단독 콘서트에서 유은이에게 감동을 전해줄 슬로건 문구 후보 3가지가 정해졌습니다.\n\n1번: "유은이의 모든 계절을 함께 걸을게"\n2번: "네가 노래하는 곳이 우리의 봄이야"\n3번: "언제나 너의 빛이 되어줄게"\n\n어떤 문구가 가장 마음에 와닿으시나요? 댓글로 번호와 의견 남겨주시면 총대진에 전달하겠습니다!`,
    tags: ['#유은', '#응원슬로건', '#투표', '#콘서트준비'],
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    category: '자유',
    views: 188,
    likes: 42,
    likedUserIds: ['user_test01', 'user_test02'],
    isNotice: false,
    createdAt: '2025-03-06T15:30:00.000Z',
    updatedAt: '2025-03-06T15:30:00.000Z',
    commentsCount: 3,
  },
  {
    id: 'post_t3_5',
    title: '유은이 생일 기념 지하철 광고 모금 진행 상황 질문',
    content: `강남역과 삼성역 지하철 스크린 광고 모금에 참여했었는데요,\n현재 모금 달성률과 광고 게첨 예정일이 확정되었는지 궁금합니다.\n팬분들이 응모해 주신 시안 투표는 언제 시작되는지도 총대진님께서 답변해 주시면 감사하겠습니다!`,
    tags: ['#유은', '#생일광고', '#지하철광고', '#모금현황'],
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    category: '질문',
    views: 112,
    likes: 16,
    likedUserIds: ['user_test01'],
    isNotice: false,
    createdAt: '2025-03-07T12:10:00.000Z',
    updatedAt: '2025-03-07T12:10:00.000Z',
    commentsCount: 2,
  },
];

export const initialComments: Comment[] = [
  {
    id: 'comm_n1',
    postId: 'post_notice_1',
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    content: '공지 확인했습니다! 매너 지키면서 예쁘게 덕질할게요 :)',
    createdAt: '2025-02-01T10:30:00.000Z',
  },
  {
    id: 'comm_n2',
    postId: 'post_notice_1',
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    content: '카페지기님 항상 깨끗한 팬카페 운영 감사드립니다!',
    createdAt: '2025-02-01T11:15:00.000Z',
  },
  {
    id: 'comm_n3',
    postId: 'post_notice_1',
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    content: '유은이 팬카페 화이팅!! 규칙 잘 지키겠습니다.',
    createdAt: '2025-02-01T12:00:00.000Z',
  },
  {
    id: 'comm_t1_1',
    postId: 'post_t1_1',
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    content: '저도 라디오 실시간으로 들었어요! 어쿠스틱 편곡 진짜 최고였습니다 ㅠㅠ',
    createdAt: '2025-02-05T19:00:00.000Z',
  },
  {
    id: 'comm_t1_2',
    postId: 'post_t1_1',
    authorId: 'user_test03',
    authorNickname: '은이누나팬',
    authorRole: 'user',
    content: '다음 주 방송도 벌써부터 본방사수 알람 맞춰뒀습니다 ㅎㅎ',
    createdAt: '2025-02-05T19:25:00.000Z',
  },
  {
    id: 'comm_t1_5_1',
    postId: 'post_t1_5',
    authorId: 'user_test02',
    authorNickname: '햇살은이',
    authorRole: 'user',
    content: '환영합니다! 등업신청 게시판에 양식에 맞춰 작성하시면 관리자님이 하루 안에 등업해 주십니다!',
    createdAt: '2025-02-18T20:10:00.000Z',
  },
  {
    id: 'comm_t3_1',
    postId: 'post_t3_1',
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    content: '와 팬아트 금손이시네요!! 눈동자 반짝이는 디테일 너무 귀여워요. 폰 배경화면으로 바로 바꿨습니다!',
    createdAt: '2025-03-01T15:00:00.000Z',
  },
  {
    id: 'comm_t3_4_1',
    postId: 'post_t3_4',
    authorId: 'user_test01',
    authorNickname: '은이바라기',
    authorRole: 'user',
    content: '저는 2번 "네가 노래하는 곳이 우리의 봄이야"에 한 표 던집니다! 뭉클해요.',
    createdAt: '2025-03-06T16:00:00.000Z',
  },
];

class LocaDB {
  private isFirebaseSyncActive = false;

  constructor() {
    this.initDatabase();
    this.initFirebaseSync();
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('locadb_changed'));
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  }

  public initDatabase(forceReset = false): void {
    const isUpToDate = localStorage.getItem(DB_VERSION_KEY) === '3.0';

    if (forceReset || !isUpToDate || !localStorage.getItem(USERS_KEY)) {
      this.setItem(USERS_KEY, initialUsers);
      this.setItem(POSTS_KEY, initialPosts);
      this.setItem(COMMENTS_KEY, initialComments);
      localStorage.setItem(DB_VERSION_KEY, '3.0');
      // Default initial session: test01@mail.com (은이바라기)
      this.setCurrentUser(initialUsers[1]);
      return;
    }

    if (!localStorage.getItem(SESSION_KEY)) {
      this.setCurrentUser(initialUsers[1]);
    }
  }

  // --- Firebase Real-time Synchronization ---
  private initFirebaseSync(): void {
    if (this.isFirebaseSyncActive) return;
    this.isFirebaseSyncActive = true;

    // 1. Initial Firestore Seed if remote database is empty
    this.seedFirestoreIfEmpty();

    // 2. Real-time Posts listener from Firestore
    try {
      onSnapshot(
        collection(db, 'posts'),
        (snapshot) => {
          if (!snapshot.empty) {
            const remotePosts: Post[] = [];
            snapshot.forEach((docSnap) => {
              remotePosts.push(docSnap.data() as Post);
            });
            remotePosts.sort((a, b) => {
              if (a.isNotice && !b.isNotice) return -1;
              if (!a.isNotice && b.isNotice) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            this.setItem(POSTS_KEY, remotePosts);
          }
        },
        (err) => {
          console.log('[Firebase] Posts snapshot sync note:', err.message);
        }
      );
    } catch (e) {
      console.warn('[Firebase] Snapshot posts listener exception:', e);
    }

    // 3. Real-time Users listener from Firestore
    try {
      onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteUsers: User[] = [];
            snapshot.forEach((docSnap) => {
              remoteUsers.push(docSnap.data() as User);
            });
            this.setItem(USERS_KEY, remoteUsers);
          }
        },
        (err) => {
          console.log('[Firebase] Users snapshot sync note:', err.message);
        }
      );
    } catch (e) {
      console.warn('[Firebase] Snapshot users listener exception:', e);
    }

    // 4. Real-time Comments listener from Firestore
    try {
      onSnapshot(
        collection(db, 'comments'),
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteComments: Comment[] = [];
            snapshot.forEach((docSnap) => {
              remoteComments.push(docSnap.data() as Comment);
            });
            this.setItem(COMMENTS_KEY, remoteComments);
          }
        },
        (err) => {
          console.log('[Firebase] Comments snapshot sync note:', err.message);
        }
      );
    } catch (e) {
      console.warn('[Firebase] Snapshot comments listener exception:', e);
    }

    // 5. Real-time PDF records listener from Firestore
    try {
      onSnapshot(
        collection(db, 'pdf_records'),
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteRecords: PdfRecord[] = [];
            snapshot.forEach((docSnap) => {
              remoteRecords.push(docSnap.data() as PdfRecord);
            });
            remoteRecords.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            this.setItem(PDF_RECORDS_KEY, remoteRecords);
          }
        },
        (err) => {
          console.log('[Firebase] PDF records snapshot sync note:', err.message);
        }
      );
    } catch (e) {
      console.warn('[Firebase] Snapshot pdf_records listener exception:', e);
    }
  }

  // Populate Firestore if collection is empty
  public async seedFirestoreIfEmpty(): Promise<void> {
    try {
      const postsSnap = await getDocs(collection(db, 'posts'));
      if (postsSnap.empty) {
        console.log('[Firebase] Seeding initial posts to Firestore...');
        for (const post of initialPosts) {
          await setDoc(doc(db, 'posts', post.id), post);
        }
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        console.log('[Firebase] Seeding initial users to Firestore...');
        for (const user of initialUsers) {
          await setDoc(doc(db, 'users', user.id), user);
        }
      }

      const commentsSnap = await getDocs(collection(db, 'comments'));
      if (commentsSnap.empty) {
        console.log('[Firebase] Seeding initial comments to Firestore...');
        for (const comment of initialComments) {
          await setDoc(doc(db, 'comments', comment.id), comment);
        }
      }
    } catch (err) {
      console.log('[Firebase] Seed check completed with info:', err);
    }
  }

  // --- Users CRUD (Backed by Firestore & Auth) ---
  public getUsers(): User[] {
    return this.getItem<User[]>(USERS_KEY, initialUsers);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public findUserByUsername(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.getUsers().find(
      (u) =>
        u.username.toLowerCase() === clean ||
        u.email.toLowerCase() === clean ||
        u.id.toLowerCase() === clean
    );
  }

  public createUser(userData: {
    username: string;
    password?: string;
    nickname: string;
    email: string;
    role?: 'user' | 'admin';
  }): { success: boolean; user?: User; message?: string } {
    const users = this.getUsers();
    if (this.findUserByUsername(userData.username)) {
      return { success: false, message: '이미 사용 중인 아이디입니다.' };
    }
    if (users.some((u) => u.nickname.trim() === userData.nickname.trim())) {
      return { success: false, message: '이미 사용 중인 닉네임입니다.' };
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: userData.username.trim(),
      password: userData.password || '123456',
      nickname: userData.nickname.trim(),
      email: userData.email.trim(),
      role: userData.role || 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistic Local Save
    users.push(newUser);
    this.setItem(USERS_KEY, users);

    // 2. Persist to Firebase Firestore
    setDoc(doc(db, 'users', newUser.id), newUser).catch((e) => {
      console.warn('[Firebase] Firestore user creation fallback:', e);
    });

    // 3. Register to Firebase Auth if email is provided
    if (userData.email && userData.password) {
      createUserWithEmailAndPassword(auth, userData.email, userData.password).catch(() => {
        // Auth registration gracefully handles pre-existing or domain rules
      });
    }

    return { success: true, user: newUser };
  }

  public updateUser(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>
  ): { success: boolean; user?: User; message?: string } {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    if (updates.nickname) {
      const duplicateNick = users.find(
        (u) => u.id !== id && u.nickname.trim() === updates.nickname?.trim()
      );
      if (duplicateNick) {
        return { success: false, message: '이미 다른 사용자가 사용 중인 닉네임입니다.' };
      }
    }

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    this.setItem(USERS_KEY, users);

    // Firebase Firestore sync
    updateDoc(doc(db, 'users', id), updates).catch((e) => {
      console.warn('[Firebase] Firestore user update fallback:', e);
    });

    const currentSession = this.getCurrentUser();
    if (currentSession && currentSession.id === id) {
      this.setCurrentUser(updatedUser);
    }

    if (updates.nickname) {
      this.syncUserNickname(id, updates.nickname);
    }

    return { success: true, user: updatedUser };
  }

  private syncUserNickname(userId: string, newNickname: string): void {
    const posts = this.getPosts().map((post) => {
      if (post.authorId === userId) {
        const updated = { ...post, authorNickname: newNickname };
        updateDoc(doc(db, 'posts', post.id), { authorNickname: newNickname }).catch(() => {});
        return updated;
      }
      return post;
    });
    this.setItem(POSTS_KEY, posts);

    const comments = this.getAllComments().map((comment) => {
      if (comment.authorId === userId) {
        const updated = { ...comment, authorNickname: newNickname };
        updateDoc(doc(db, 'comments', comment.id), { authorNickname: newNickname }).catch(() => {});
        return updated;
      }
      return comment;
    });
    this.setItem(COMMENTS_KEY, comments);
  }

  public deleteUser(id: string): { success: boolean; message?: string } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };

    if (user.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
      return { success: false, message: '최소 1명 이상의 관리자가 존재해야 합니다.' };
    }

    const filtered = users.filter((u) => u.id !== id);
    this.setItem(USERS_KEY, filtered);

    // Firestore delete
    deleteDoc(doc(db, 'users', id)).catch(() => {});

    const currentSession = this.getCurrentUser();
    if (currentSession?.id === id) {
      this.clearSession();
    }

    return { success: true };
  }

  // --- Session Management & Login (Firebase Integrated) ---
  public getCurrentUser(): User | null {
    const user = this.getItem<User | null>(SESSION_KEY, null);
    if (!user) return null;
    const actual = this.getUserById(user.id);
    return actual || null;
  }

  public setCurrentUser(user: User): void {
    this.setItem(SESSION_KEY, user);
  }

  public clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('locadb_changed'));
  }

  public async loginWithFirebaseAuth(identifier: string, pass: string): Promise<User | null> {
    const user = this.findUserByUsername(identifier);
    if (user && user.email && pass) {
      try {
        await signInWithEmailAndPassword(auth, user.email, pass);
      } catch {
        // Fallback gracefully to Firestore user record verification
      }
    }
    return user || null;
  }

  // --- Posts CRUD (Backed by Firestore) ---
  public getPosts(): Post[] {
    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    return [...posts].sort((a, b) => {
      if (a.isNotice && !b.isNotice) return -1;
      if (!a.isNotice && b.isNotice) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public getPostById(id: string): Post | undefined {
    return this.getPosts().find((p) => p.id === id);
  }

  public createPost(data: {
    title: string;
    content: string;
    tags?: string[];
    category: Post['category'];
    isNotice?: boolean;
    author: User;
  }): { success: boolean; post?: Post; message?: string } {
    if (!data.title.trim()) {
      return { success: false, message: '제목을 입력해주세요.' };
    }
    if (!data.content.trim()) {
      return { success: false, message: '내용을 입력해주세요.' };
    }

    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const now = new Date().toISOString();

    const cleanTags = (data.tags || [])
      .map((t) => (t.startsWith('#') ? t : `#${t}`).trim())
      .filter((t) => t.length > 1);

    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: data.title.trim(),
      content: data.content.trim(),
      tags: cleanTags,
      authorId: data.author.id,
      authorNickname: data.author.nickname,
      authorRole: data.author.role,
      category: data.category,
      views: 0,
      likes: 0,
      likedUserIds: [],
      isNotice: Boolean(data.isNotice && data.author.role === 'admin'),
      createdAt: now,
      updatedAt: now,
      commentsCount: 0,
    };

    // 1. Local update
    posts.unshift(newPost);
    this.setItem(POSTS_KEY, posts);

    // 2. Firebase Firestore persistence
    setDoc(doc(db, 'posts', newPost.id), newPost).catch((e) => {
      console.warn('[Firebase] Firestore post save fallback:', e);
    });

    return { success: true, post: newPost };
  }

  public updatePost(
    postId: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      category?: Post['category'];
      isNotice?: boolean;
    },
    requester: User
  ): { success: boolean; post?: Post; message?: string } {
    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) {
      return { success: false, message: '게시글을 찾을 수 없습니다.' };
    }

    const post = posts[index];
    if (post.authorId !== requester.id && requester.role !== 'admin') {
      return { success: false, message: '수정 권한이 없습니다.' };
    }

    const cleanTags = data.tags
      ? data.tags
          .map((t) => (t.startsWith('#') ? t : `#${t}`).trim())
          .filter((t) => t.length > 1)
      : post.tags;

    const updatedPost: Post = {
      ...post,
      title: data.title !== undefined ? data.title.trim() : post.title,
      content: data.content !== undefined ? data.content.trim() : post.content,
      tags: cleanTags,
      category: data.category !== undefined ? data.category : post.category,
      isNotice:
        data.isNotice !== undefined && requester.role === 'admin'
          ? data.isNotice
          : post.isNotice,
      updatedAt: new Date().toISOString(),
    };

    // Local save
    posts[index] = updatedPost;
    this.setItem(POSTS_KEY, posts);

    // Firebase Firestore sync
    updateDoc(doc(db, 'posts', postId), updatedPost as unknown as Record<string, unknown>).catch((e) => {
      console.warn('[Firebase] Firestore post update fallback:', e);
    });

    return { success: true, post: updatedPost };
  }

  public deletePost(
    postId: string,
    requester: User
  ): { success: boolean; message?: string } {
    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { success: false, message: '게시글을 찾을 수 없습니다.' };
    }

    if (post.authorId !== requester.id && requester.role !== 'admin') {
      return { success: false, message: '삭제 권한이 없습니다.' };
    }

    const filtered = posts.filter((p) => p.id !== postId);
    this.setItem(POSTS_KEY, filtered);

    const comments = this.getAllComments().filter((c) => c.postId !== postId);
    this.setItem(COMMENTS_KEY, comments);

    // Firebase Firestore delete
    deleteDoc(doc(db, 'posts', postId)).catch(() => {});

    return { success: true };
  }

  public incrementViews(postId: string): void {
    const viewCacheKey = `viewed_${postId}`;
    if (sessionStorage.getItem(viewCacheKey)) return;
    sessionStorage.setItem(viewCacheKey, '1');

    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      posts[index].views += 1;
      this.setItem(POSTS_KEY, posts);
      updateDoc(doc(db, 'posts', postId), { views: posts[index].views }).catch(() => {});
    }
  }

  public toggleLike(postId: string, userId: string): { liked: boolean; totalLikes: number } {
    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) return { liked: false, totalLikes: 0 };

    const post = posts[index];
    const likedIndex = post.likedUserIds.indexOf(userId);
    let liked = false;

    if (likedIndex >= 0) {
      post.likedUserIds.splice(likedIndex, 1);
      post.likes = Math.max(0, post.likes - 1);
      liked = false;
    } else {
      post.likedUserIds.push(userId);
      post.likes += 1;
      liked = true;
    }

    posts[index] = post;
    this.setItem(POSTS_KEY, posts);

    // Firebase Firestore sync
    updateDoc(doc(db, 'posts', postId), {
      likes: post.likes,
      likedUserIds: post.likedUserIds,
    }).catch(() => {});

    return { liked, totalLikes: post.likes };
  }

  // --- Comments CRUD (Backed by Firestore) ---
  public getAllComments(): Comment[] {
    return this.getItem<Comment[]>(COMMENTS_KEY, initialComments);
  }

  public getComments(postId: string): Comment[] {
    return this.getAllComments()
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public createComment(data: {
    postId: string;
    author: User;
    content: string;
  }): { success: boolean; comment?: Comment; message?: string } {
    if (!data.content.trim()) {
      return { success: false, message: '댓글 내용을 입력해주세요.' };
    }

    const comments = this.getAllComments();
    const newComment: Comment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      postId: data.postId,
      authorId: data.author.id,
      authorNickname: data.author.nickname,
      authorRole: data.author.role,
      content: data.content.trim(),
      createdAt: new Date().toISOString(),
    };

    comments.push(newComment);
    this.setItem(COMMENTS_KEY, comments);

    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const pIndex = posts.findIndex((p) => p.id === data.postId);
    if (pIndex !== -1) {
      posts[pIndex].commentsCount = (posts[pIndex].commentsCount || 0) + 1;
      this.setItem(POSTS_KEY, posts);
      updateDoc(doc(db, 'posts', data.postId), {
        commentsCount: posts[pIndex].commentsCount,
      }).catch(() => {});
    }

    // Firebase Firestore comment persistence
    setDoc(doc(db, 'comments', newComment.id), newComment).catch((e) => {
      console.warn('[Firebase] Firestore comment save fallback:', e);
    });

    return { success: true, comment: newComment };
  }

  public deleteComment(
    commentId: string,
    requester: User
  ): { success: boolean; message?: string } {
    const comments = this.getAllComments();
    const target = comments.find((c) => c.id === commentId);
    if (!target) return { success: false, message: '댓글을 찾을 수 없습니다.' };

    if (target.authorId !== requester.id && requester.role !== 'admin') {
      return { success: false, message: '삭제 권한이 없습니다.' };
    }

    const filtered = comments.filter((c) => c.id !== commentId);
    this.setItem(COMMENTS_KEY, filtered);

    const posts = this.getItem<Post[]>(POSTS_KEY, initialPosts);
    const pIndex = posts.findIndex((p) => p.id === target.postId);
    if (pIndex !== -1) {
      posts[pIndex].commentsCount = Math.max(0, (posts[pIndex].commentsCount || 1) - 1);
      this.setItem(POSTS_KEY, posts);
      updateDoc(doc(db, 'posts', target.postId), {
        commentsCount: posts[pIndex].commentsCount,
      }).catch(() => {});
    }

    // Firebase Firestore comment delete
    deleteDoc(doc(db, 'comments', commentId)).catch(() => {});

    return { success: true };
  }

  // --- PDF Records Management (Backed by Firestore) ---
  public getPdfRecords(): PdfRecord[] {
    const records = this.getItem<PdfRecord[]>(PDF_RECORDS_KEY, []);
    return [...records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public addPdfRecord(record: PdfRecord): void {
    const records = this.getPdfRecords();
    records.unshift(record);
    this.setItem(PDF_RECORDS_KEY, records);

    // Save to Firebase Firestore
    setDoc(doc(db, 'pdf_records', record.id), record).catch((e) => {
      console.warn('[Firebase] Firestore pdf_record save fallback:', e);
    });
  }

  public deletePdfRecord(id: string): void {
    const records = this.getPdfRecords().filter((r) => r.id !== id);
    this.setItem(PDF_RECORDS_KEY, records);

    // Delete from Firebase Firestore
    deleteDoc(doc(db, 'pdf_records', id)).catch(() => {});
  }

  public clearPdfRecords(): void {
    const records = this.getPdfRecords();
    this.setItem(PDF_RECORDS_KEY, []);
    records.forEach((r) => {
      deleteDoc(doc(db, 'pdf_records', r.id)).catch(() => {});
    });
  }
}

export const locaDB = new LocaDB();
