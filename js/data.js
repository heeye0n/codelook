/* CodeLook — 데이터: 용어 사전, 사용자 표현 → 용어 번역 규칙, 가상 상품 */
window.CL = window.CL || {};

/* ───────── 1. 바지 용어 사전 ─────────
   group: 핏 / 종류 / 디테일 / 기장 / 소재 / 실측
   test(p): 이 용어가 상품에 해당하는지 (번역 칩 검색에 사용) */
CL.TERMS = {
  /* 핏 */
  wide:      { name: '와이드', group: '핏', short: '허벅지부터 밑단까지 통이 넓어요',
    desc: '다리에 달라붙지 않아 편하고 체형이 덜 드러나요. 길이가 길면 바닥에 끌릴 수 있으니 총장을 꼭 확인하세요.',
    ill: { kind: 'fit', fit: 'wide' }, test: p => p.fit === 'wide' },
  semiwide:  { name: '세미와이드', group: '핏', short: '와이드보다 덜 넓은, 적당히 여유 있는 통',
    desc: '편하면서도 너무 커 보이지 않아서 발표나 면접처럼 단정해야 하는 자리에도 무난해요.',
    ill: { kind: 'fit', fit: 'semiwide' }, test: p => p.fit === 'semiwide' },
  straight:  { name: '스트레이트', group: '핏', short: '허벅지부터 밑단까지 일자로 떨어져요',
    desc: '가장 기본적인 모양이라 어떤 상의와도 잘 어울려요. "일자 바지"라고도 불러요.',
    ill: { kind: 'fit', fit: 'straight' }, test: p => p.fit === 'straight' },
  slim:      { name: '슬림', group: '핏', short: '다리 라인을 따라 몸에 가깝게 맞아요',
    desc: '다리가 길고 날씬해 보이지만 앉거나 움직일 때 답답할 수 있어요. 스키니보다는 여유가 있어요.',
    ill: { kind: 'fit', fit: 'slim' }, test: p => p.fit === 'slim' },
  tapered:   { name: '테이퍼드', group: '핏', short: '허벅지는 여유 있고 밑단으로 갈수록 좁아져요',
    desc: '편안함과 깔끔함을 함께 원할 때 좋아요. 발목 쪽이 좁아서 신발이 잘 보여요.',
    ill: { kind: 'fit', fit: 'tapered' }, test: p => p.fit === 'tapered' },

  /* 종류 */
  slacks:    { name: '슬랙스', group: '종류', short: '정장 바지처럼 단정한 천 바지',
    desc: '매끈한 원단에 주름선이 있는 경우가 많아 발표·면접처럼 깔끔해야 하는 자리에 잘 맞아요. 정장 상의 없이 티셔츠와 입어도 돼요.',
    ill: { kind: 'fit', fit: 'straight', details: ['pintuck'] }, test: p => p.type === 'slacks' },
  denim:     { name: '데님', group: '종류', short: '청바지 원단 (청바지)',
    desc: '튼튼한 면 원단으로 만든 바지예요. 연청(밝은 파랑), 인디고·진청(어두운 파랑), 흑청(검정)처럼 색으로 구분해요.',
    ill: { kind: 'fit', fit: 'straight', details: ['denim'], color: '#3E5C86' }, test: p => p.type === 'denim' },
  cargo:     { name: '카고', group: '종류', short: '허벅지 옆에 큰 주머니가 달린 바지',
    desc: '주머니가 많아 실용적이고 캐주얼·스트릿 느낌이 강해요. 단정한 자리에는 잘 안 어울려요.',
    ill: { kind: 'fit', fit: 'wide', details: ['cargo'], color: '#6B6B4A' }, test: p => p.details.includes('cargo') },
  chino:     { name: '치노', group: '종류', short: '면으로 만든 단정한 캐주얼 바지',
    desc: '슬랙스보다 편하고 청바지보다 단정한 중간 느낌이에요. 베이지색이 가장 대표적이에요.',
    ill: { kind: 'fit', fit: 'straight', color: '#C8B08A' }, test: p => p.type === 'chino' },
  jogger:    { name: '조거', group: '종류', short: '발목이 고무줄로 오므려진 바지',
    desc: '운동복에서 온 모양으로 활동하기 편해요. 밑단이 발목에 고정되어 길이가 조금 길어도 괜찮아요.',
    ill: { kind: 'fit', fit: 'jogger', details: ['jogger', 'banding'] }, test: p => p.details.includes('jogger') },

  /* 디테일 */
  banding:   { name: '밴딩', group: '디테일', short: '허리에 고무줄이 들어 있어요',
    desc: '허리 사이즈가 조금 달라도 늘어나서 맞고, 앉았을 때 편해요. 사이즈 고민이 줄어요.',
    ill: { kind: 'fit', fit: 'straight', details: ['banding'] }, test: p => p.details.includes('banding') },
  onetuck:   { name: '원턱', group: '디테일', short: '허리 앞에 주름(턱)이 하나씩 잡혀 있어요',
    desc: '주름이 허벅지 쪽 여유를 만들어 줘서 넉넉하고 편안한 느낌이 나요.',
    ill: { kind: 'fit', fit: 'semiwide', details: ['onetuck'] }, test: p => p.details.includes('onetuck') },
  twotuck:   { name: '투턱', group: '디테일', short: '허리 앞에 주름이 두 개씩 잡혀 있어요',
    desc: '원턱보다 여유가 더 많아요. 통이 넓은 와이드 슬랙스에 자주 쓰여요.',
    ill: { kind: 'fit', fit: 'wide', details: ['twotuck'] }, test: p => p.details.includes('twotuck') },
  pintuck:   { name: '핀턱', group: '디테일', short: '바지 앞 가운데로 세로 주름선이 박혀 있어요',
    desc: '다리가 길고 반듯해 보이게 해요. 다림질하지 않아도 선이 유지돼요.',
    ill: { kind: 'fit', fit: 'straight', details: ['pintuck'] }, test: p => p.details.includes('pintuck') },

  /* 기장 */
  crop:      { name: '크롭', group: '기장', short: '일반 바지보다 짧아서 발목이 보이는 길이',
    desc: '발목이 드러나서 가볍고 깔끔해 보여요. 키가 크면 생각보다 더 짧게 느껴질 수 있어요.',
    ill: { kind: 'fit', fit: 'tapered', details: ['crop'] }, test: p => p.length === 'crop' },
  long:      { name: '롱', group: '기장', short: '일반보다 길어서 신발을 덮는 길이',
    desc: '신발 위로 주름이 쌓이거나 바닥에 닿을 수 있어요. 키가 작다면 총장을 꼭 확인하세요.',
    ill: { kind: 'fit', fit: 'wide', details: ['long'] }, test: p => p.length === 'long' },

  /* 소재 */
  linen:     { name: '린넨', group: '소재', short: '마(麻)로 만든 얇고 시원한 원단',
    desc: '바람이 잘 통해 여름에 좋아요. 구김이 잘 가는 편이에요.',
    ill: { kind: 'fit', fit: 'semiwide', details: ['linen'], color: '#D9CCB0' }, test: p => p.material === 'linen' },
  brushed:   { name: '기모', group: '소재', short: '안쪽에 보송한 털이 있어 따뜻한 원단',
    desc: '겨울에 따뜻하지만 조금 두꺼워 보일 수 있어요.',
    ill: { kind: 'fit', fit: 'straight', details: ['brushed'] }, test: p => p.material === 'brushed' },

  /* 실측 (사이즈표 용어) */
  length:    { name: '총장', group: '실측', short: '허리 맨 위부터 밑단 끝까지, 바지 전체 길이',
    desc: '내 다리에서 어디까지 오는지는 키와 밑위에 따라 달라요. 상품 페이지의 "내 몸 기준으로 보기"에서 확인할 수 있어요.',
    ill: { kind: 'measure', key: 'length' }, test: () => false },
  waist:     { name: '허리단면', group: '실측', short: '바지를 펼쳐 놓고 잰 허리 한쪽 너비',
    desc: '둘레가 아니라 한 면 너비라서 ×2를 해야 허리둘레예요. 예: 허리단면 38cm → 둘레 약 76cm(30인치).',
    ill: { kind: 'measure', key: 'waist' }, test: () => false },
  rise:      { name: '밑위', group: '실측', short: '허리 맨 위부터 가랑이 이음새까지 길이',
    desc: '길면 허리가 배꼽 근처까지 올라오고(하이웨이스트), 짧으면 골반에 걸쳐 입게 돼요.',
    ill: { kind: 'measure', key: 'rise' }, test: () => false },
  thigh:     { name: '허벅지단면', group: '실측', short: '가랑이 바로 아래 허벅지 부분의 한쪽 너비',
    desc: '클수록 허벅지가 넉넉해요. 허벅지가 끼는 게 싫다면 지금 입는 바지보다 크거나 같은 값을 고르세요.',
    ill: { kind: 'measure', key: 'thigh' }, test: () => false },
  hem:       { name: '밑단단면', group: '실측', short: '바지 맨 아래 끝의 한쪽 너비',
    desc: '넓을수록 통이 넓어 보이고, 좁을수록 발목에 붙어요.',
    ill: { kind: 'measure', key: 'hem' }, test: () => false },
};
Object.keys(CL.TERMS).forEach(id => { CL.TERMS[id].id = id; });

/* 상품명에서 용어를 찾을 때 쓰는 이름 → id (긴 이름부터 매칭) */
CL.TERM_ALIASES = [
  ['세미와이드', 'semiwide'], ['와이드', 'wide'], ['스트레이트', 'straight'], ['슬림', 'slim'],
  ['테이퍼드', 'tapered'], ['슬랙스', 'slacks'], ['데님', 'denim'], ['카고', 'cargo'], ['치노', 'chino'],
  ['조거', 'jogger'], ['밴딩', 'banding'], ['원턱', 'onetuck'], ['투턱', 'twotuck'], ['핀턱', 'pintuck'],
  ['크롭', 'crop'], ['롱', 'long'], ['린넨', 'linen'], ['기모', 'brushed'],
];

/* ───────── 2. 색상 ───────── */
CL.COLORS = {
  black:    { name: '블랙',     plain: '검정',       hex: '#2B2B2E' },
  charcoal: { name: '차콜',     plain: '짙은 회색',  hex: '#4A4D52' },
  gray:     { name: '그레이',   plain: '회색',       hex: '#8E9196' },
  navy:     { name: '네이비',   plain: '남색',       hex: '#2E3A57' },
  beige:    { name: '베이지',   plain: '연한 갈색',  hex: '#CDB591' },
  ivory:    { name: '아이보리', plain: '미색',       hex: '#ECE4D3' },
  khaki:    { name: '카키',     plain: '국방색',     hex: '#6B6B4A' },
  lightblue:{ name: '연청',     plain: '밝은 청색',  hex: '#8FA9C8' },
  indigo:   { name: '인디고',   plain: '진한 청색',  hex: '#33476B' },
};

/* ───────── 3. 사용자 표현 → 용어 번역 규칙 (용어 사전 기반 시뮬레이션) ─────────
   words 중 하나가 검색어에 들어 있으면 terms 칩을 제안한다. */
CL.EXPRESSIONS = [
  { words: ['편한', '편하', '편안', '편해', '널널', '여유', '헐렁', '넉넉', '안 끼', '안끼'],
    terms: ['wide', 'semiwide', 'banding'], why: '통이 넓거나 허리가 고무줄인 바지가 편하게 느껴져요' },
  { words: ['깔끔', '단정', '정장', '포멀', '발표', '면접', '출근', '회사', '차려입', '격식'],
    terms: ['slacks', 'straight'], why: '단정한 자리에는 슬랙스나 일자 핏이 무난해요' },
  { words: ['날씬', '슬림', '다리 길', '다리가 길', '딱 붙', '딱붙', '핏되', '스키니', '붙는'],
    terms: ['slim', 'tapered'], why: '다리 라인을 따라가는 핏이 날씬해 보여요' },
  { words: ['운동', '활동', '트레이닝', '츄리닝', '추리닝', '산책', '집에서', '잠옷'],
    terms: ['jogger', 'banding'], why: '고무줄 허리·발목이 활동하기 편해요' },
  { words: ['청바지', '청 바지', '데님', '진 바지'], terms: ['denim'], why: '청바지는 "데님"이라고 불러요' },
  { words: ['주머니', '힙한', '힙하', '스트릿', '캠핑', '등산'], terms: ['cargo'], why: '큰 주머니가 달린 바지는 "카고"예요' },
  { words: ['시원', '여름', '얇은', '얇게'], terms: ['linen'], why: '얇고 바람이 잘 통하는 원단은 "린넨"이에요' },
  { words: ['따뜻', '겨울', '두꺼운', '두툼', '추울'], terms: ['brushed'], why: '안쪽에 털이 있는 따뜻한 원단은 "기모"예요' },
  { words: ['발목 보이', '발목이 보이', '발목 나오', '짧은', '짧게', '9부', '구부'], terms: ['crop'], why: '발목이 보이는 길이는 "크롭"이에요' },
  { words: ['길게', '긴 바지', '바닥까지', '끌리는', '롱'], terms: ['long'], why: '신발을 덮는 긴 길이는 "롱"이에요' },
  { words: ['무난', '기본', '데일리', '아무 데나', '아무데나', '어디에나', '평범'], terms: ['straight', 'chino'], why: '일자 핏과 치노가 가장 기본이에요' },
  { words: ['일자'], terms: ['straight'], why: '일자 바지는 "스트레이트"라고 불러요' },
  { words: ['통 넓', '통넓', '통이 넓', '펑퍼짐', '부해'], terms: ['wide'], why: '통이 넓은 바지는 "와이드"예요' },
  { words: ['고무줄', '허리 편'], terms: ['banding'], why: '허리 고무줄은 "밴딩"이에요' },
  { words: ['주름'], terms: ['pintuck', 'onetuck'], why: '세로 주름선은 "핀턱", 허리 앞 주름은 "턱"이에요' },
  { words: ['아래로 좁', '밑으로 좁', '발목 좁'], terms: ['tapered'], why: '아래로 좁아지는 핏은 "테이퍼드"예요' },
];

/* 색 표현 → 색 칩 */
CL.COLOR_WORDS = [
  { words: ['검정', '검은', '까만', '블랙', '깜장'], color: 'black' },
  { words: ['회색', '그레이', '쥐색'], color: 'gray' },
  { words: ['짙은 회색', '진회색', '차콜'], color: 'charcoal' },
  { words: ['남색', '네이비', '곤색'], color: 'navy' },
  { words: ['베이지', '연갈색', '연한 갈색', '모래색'], color: 'beige' },
  { words: ['흰', '하얀', '화이트', '아이보리', '미색'], color: 'ivory' },
  { words: ['카키', '국방색', '올리브'], color: 'khaki' },
  { words: ['연청', '밝은 청', '하늘색'], color: 'lightblue' },
  { words: ['진청', '인디고', '진한 청', '파란'], color: 'indigo' },
];

/* ───────── 4. 가상 상품 (바지 18종) ───────── */
CL.SIZES = ['S', 'M', 'L', 'XL'];

/* 핏별 M 사이즈 기준 실측(cm). thigh=허벅지단면, hem=밑단단면 */
CL.FIT_BASE = {
  wide:     { thigh: 35.5, hem: 27 },
  semiwide: { thigh: 33,   hem: 23.5 },
  straight: { thigh: 31,   hem: 20.5 },
  slim:     { thigh: 28,   hem: 16.5 },
  tapered:  { thigh: 32.5, hem: 16.5 },
  jogger:   { thigh: 32,   hem: 12 },
};
CL.LENGTH_BASE = { crop: 93, regular: 101, long: 108 };

const RAW_PRODUCTS = [
  { id: 'p01', brand: '모노웍스',    name: '세미와이드 원턱 슬랙스',        fit: 'semiwide', type: 'slacks', details: ['onetuck'],            material: 'poly',    length: 'regular', color: 'gray',      price: 49000, rise: 31 },
  { id: 'p02', brand: '아카이브 나인', name: '와이드 투턱 슬랙스',          fit: 'wide',     type: 'slacks', details: ['twotuck'],            material: 'poly',    length: 'regular', color: 'black',     price: 59000, rise: 32 },
  { id: 'p03', brand: '모노웍스',    name: '스트레이트 핀턱 슬랙스',        fit: 'straight', type: 'slacks', details: ['pintuck'],            material: 'poly',    length: 'regular', color: 'navy',      price: 52000, rise: 29.5 },
  { id: 'p04', brand: '데일리폼',    name: '테이퍼드 밴딩 슬랙스',          fit: 'tapered',  type: 'slacks', details: ['banding'],            material: 'poly',    length: 'regular', color: 'charcoal',  price: 39000, rise: 30 },
  { id: 'p05', brand: '블루노트',    name: '와이드 데님 팬츠',              fit: 'wide',     type: 'denim',  details: [],                     material: 'cotton',  length: 'regular', color: 'lightblue', price: 62000, rise: 31 },
  { id: 'p06', brand: '블루노트',    name: '스트레이트 데님 팬츠',          fit: 'straight', type: 'denim',  details: [],                     material: 'cotton',  length: 'regular', color: 'indigo',    price: 58000, rise: 28.5 },
  { id: 'p07', brand: '어반스톤',    name: '슬림 데님 팬츠',                fit: 'slim',     type: 'denim',  details: [],                     material: 'cotton',  length: 'regular', color: 'black',     price: 55000, rise: 27.5 },
  { id: 'p08', brand: '필드레코드',  name: '와이드 카고 팬츠',              fit: 'wide',     type: 'cargo',  details: ['cargo'],              material: 'cotton',  length: 'regular', color: 'khaki',     price: 69000, rise: 31 },
  { id: 'p09', brand: '필드레코드',  name: '테이퍼드 카고 조거팬츠',        fit: 'jogger',   type: 'jogger', details: ['cargo', 'jogger', 'banding'], material: 'nylon', length: 'regular', color: 'black', price: 64000, rise: 29 },
  { id: 'p10', brand: '데일리폼',    name: '기모 밴딩 조거팬츠',            fit: 'jogger',   type: 'jogger', details: ['jogger', 'banding'],  material: 'brushed', length: 'regular', color: 'gray',      price: 35000, rise: 29 },
  { id: 'p11', brand: '쇼어라인',    name: '스트레이트 치노 팬츠',          fit: 'straight', type: 'chino',  details: [],                     material: 'cotton',  length: 'regular', color: 'beige',     price: 45000, rise: 29 },
  { id: 'p12', brand: '쇼어라인',    name: '슬림 치노 팬츠',                fit: 'slim',     type: 'chino',  details: [],                     material: 'cotton',  length: 'regular', color: 'navy',      price: 45000, rise: 28 },
  { id: 'p13', brand: '썸머랩',      name: '세미와이드 린넨 밴딩 팬츠',     fit: 'semiwide', type: 'chino',  details: ['banding'],            material: 'linen',   length: 'regular', color: 'beige',     price: 48000, rise: 30.5 },
  { id: 'p14', brand: '아카이브 나인', name: '크롭 테이퍼드 슬랙스',        fit: 'tapered',  type: 'slacks', details: ['onetuck'],            material: 'poly',    length: 'crop',    color: 'black',     price: 54000, rise: 30.5 },
  { id: 'p15', brand: '어반스톤',    name: '롱 와이드 데님 팬츠',           fit: 'wide',     type: 'denim',  details: [],                     material: 'cotton',  length: 'long',    color: 'indigo',    price: 66000, rise: 32 },
  { id: 'p16', brand: '데일리폼',    name: '기모 와이드 밴딩 팬츠',         fit: 'wide',     type: 'chino',  details: ['banding'],            material: 'brushed', length: 'regular', color: 'charcoal',  price: 42000, rise: 31 },
  { id: 'p17', brand: '모노웍스',    name: '슬림 크롭 슬랙스',              fit: 'slim',     type: 'slacks', details: ['pintuck'],            material: 'poly',    length: 'crop',    color: 'beige',     price: 47000, rise: 28.5 },
  { id: 'p18', brand: '쇼어라인',    name: '와이드 원턱 치노 팬츠',         fit: 'wide',     type: 'chino',  details: ['onetuck'],            material: 'cotton',  length: 'regular', color: 'ivory',     price: 51000, rise: 31.5 },
];

const TYPE_LABEL = { slacks: '슬랙스', denim: '데님', cargo: '카고', chino: '치노', jogger: '조거' };
const MATERIAL_LABEL = { poly: '폴리 혼방', cotton: '면', nylon: '나일론', linen: '린넨', brushed: '기모' };
CL.TYPE_LABEL = TYPE_LABEL;
CL.MATERIAL_LABEL = MATERIAL_LABEL;

CL.PRODUCTS = RAW_PRODUCTS.map((p, idx) => {
  const base = CL.FIT_BASE[p.fit];
  const len = CL.LENGTH_BASE[p.length];
  const isBanding = p.details.includes('banding');
  const measures = {};
  CL.SIZES.forEach((s, i) => {
    const d = i - 1; // M 기준
    measures[s] = {
      length: +(len + 1.5 * d).toFixed(1),
      waist:  +(37 + 2 * d + (isBanding ? -1 : 0)).toFixed(1),
      rise:   +(p.rise + 0.7 * d).toFixed(1),
      thigh:  +(base.thigh + 1.3 * d).toFixed(1),
      hem:    +(base.hem + 0.6 * d).toFixed(1),
    };
  });
  const color = CL.COLORS[p.color];
  return {
    ...p,
    fullName: `${p.name} (${color.name})`,
    typeLabel: TYPE_LABEL[p.type],
    materialLabel: MATERIAL_LABEL[p.material],
    measures,
    reviews: 40 + ((idx * 137) % 900),
    rating: (4.3 + ((idx * 7) % 7) / 10).toFixed(1),
    /* "현재 앱 방식" 검색에 쓰는 텍스트: 상품명·브랜드·종류·색 이름 + 범용어(바지/팬츠) */
    searchText: [p.brand, p.name, TYPE_LABEL[p.type], color.name, MATERIAL_LABEL[p.material], '바지', '팬츠'].join(' ').toLowerCase(),
  };
});
CL.productById = id => CL.PRODUCTS.find(p => p.id === id);

/* 입문자 모드 그림 필터: 4개로 묶음 */
CL.SIMPLE_FITS = [
  { id: 'wide',     label: '와이드',     plain: '통이 넓어요',       sub: '세미와이드 포함', match: p => p.fit === 'wide' || p.fit === 'semiwide' },
  { id: 'straight', label: '스트레이트', plain: '일자로 떨어져요',   sub: '',              match: p => p.fit === 'straight' },
  { id: 'slim',     label: '슬림',       plain: '몸에 가깝게 맞아요', sub: '',              match: p => p.fit === 'slim' },
  { id: 'tapered',  label: '테이퍼드',   plain: '아래로 좁아져요',   sub: '조거 포함',     match: p => p.fit === 'tapered' || p.fit === 'jogger' },
];

CL.PRICE_RANGES = [
  { id: 'u40', label: '4만원 미만', test: v => v < 40000 },
  { id: '40-55', label: '4~5.5만원', test: v => v >= 40000 && v < 55000 },
  { id: 'o55', label: '5.5만원 이상', test: v => v >= 55000 },
];

CL.EXAMPLE_QUERIES = ['편하고 깔끔한 바지', '발표 때 입을 단정한 바지', '운동할 때 입는 편한 바지', '발목 보이는 검은 바지', '여름에 시원한 바지'];
