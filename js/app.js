/* CodeLook — 화면 렌더링과 상호작용 (해시 라우팅 SPA, 빌드 도구 없음) */
(function () {
  'use strict';
  const T = CL.TERMS, P = CL.PRODUCTS;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = v => v.toLocaleString('ko-KR') + '원';

  /* ───── 저장소 (실패해도 동작) ───── */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('codelook:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('codelook:' + k, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
  };

  /* ───── 상태 ───── */
  const emptyFilters = () => ({ fit: new Set(), type: new Set(), material: new Set(), rise: new Set(), length: new Set(), color: new Set(), price: new Set() });
  const state = {
    mode: store.get('mode', 'translate'),   // translate = 번역 도우미 ON(개선안), plain = 현재 앱 방식
    height: null,                            // 키는 저장하지 않음 (기획서: 신체 정보 최소 수집)
    waistInch: null,
    q: null, chips: [], chipsOff: new Set(),
    filters: emptyFilters(), sort: 'rec', showOriginal: false,
    sizeOf: {},
    ut: store.get('utActive', null),
  };
  const isTr = () => state.mode === 'translate';

  /* ───── 번역 엔진 (용어 사전 기반 시뮬레이션) ───── */
  function translate(q) {
    const lower = q.toLowerCase();
    let rest = ' ' + lower + ' ';
    const chips = [], seen = new Set();
    const add = (c) => { const key = c.kind + ':' + c.id; if (!seen.has(key)) { seen.add(key); chips.push(c); } };
    // 사용자가 실제로 쓴 단어 전체를 보여 준다 (예: "편하" → "편하고")
    const wordOf = hit => { const i = lower.indexOf(hit); if (i < 0) return hit.trim(); let s = i, e = i + hit.length; while (s > 0 && !/\s/.test(lower[s - 1])) s--; while (e < lower.length && !/\s/.test(lower[e])) e++; return q.slice(s, e); };
    // 1) 색 표현 (긴 표현 우선)
    const colorPairs = [];
    CL.COLOR_WORDS.forEach(cw => cw.words.forEach(w => colorPairs.push([w, cw.color])));
    colorPairs.sort((a, b) => b[0].length - a[0].length).forEach(([w, c]) => {
      if (rest.includes(w)) { add({ kind: 'color', id: c, group: 'color', from: wordOf(w), direct: w === CL.COLORS[c].name }); rest = rest.split(w).join(' '); }
    });
    // 2) 이미 입력한 패션 용어 (예: "세미와이드")
    CL.TERM_ALIASES.forEach(([name, id]) => {
      if (rest.includes(name)) { add({ kind: 'term', id, group: 'direct:' + id, from: name, direct: true }); rest = rest.split(name).join(' '); }
    });
    // 3) 일상 표현 → 용어 (같은 표현에서 나온 칩은 한 그룹)
    CL.EXPRESSIONS.forEach((ex, i) => {
      const hit = ex.words.find(w => rest.includes(w));
      if (hit) ex.terms.forEach(id => add({ kind: 'term', id, group: 'ex' + i, from: wordOf(hit), why: ex.why }));
    });
    return chips;
  }

  /* 현재 앱 방식: 검색어 글자 그대로 상품명과 맞추기 (모든 단어 포함) */
  function literalSearch(q) {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
      .map(t => t.length > 2 ? t.replace(/(으로|에서|은|는|이|가|을|를|의|로|에|도)$/, '') : t);
    if (!tokens.length) return P.slice();
    return P.filter(p => tokens.every(t => p.searchText.includes(t)));
  }

  /* 같은 표현에서 나온 칩끼리는 OR, 서로 다른 표현끼리는 AND.
     ("편한" → 와이드|세미와이드|밴딩) AND ("깔끔한" → 슬랙스|스트레이트) */
  function chipMatch(p, chips) {
    const groups = {};
    chips.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
    const keys = Object.keys(groups);
    let hit = 0; const labels = [];
    keys.forEach(g => {
      const ok = groups[g].filter(c => c.kind === 'color' ? p.color === c.id : T[c.id].test(p));
      if (ok.length) { hit++; ok.forEach(c => labels.push(c.kind === 'color' ? CL.COLORS[c.id].name : T[c.id].name)); }
    });
    return { hit, total: keys.length, labels: [...new Set(labels)] };
  }
  function chipResults(active) {
    const all = P.filter(passFilters).map(p => ({ p, m: chipMatch(p, active) }));
    let list = all.filter(x => x.m.hit === x.m.total);
    let partial = false;
    if (!list.length) { list = all.filter(x => x.m.hit > 0); partial = true; }
    const labels = new Map(list.map(x => [x.p.id, x.m]));
    return { list: sortList(list.map(x => x.p), p => labels.get(p.id).hit), labels, partial };
  }

  const riseCat = p => { const r = p.measures.M.rise; return r < 28.5 ? 'low' : r < 31 ? 'mid' : 'high'; };
  function passFilters(p) {
    const f = state.filters;
    if (f.fit.size) {
      if (isTr()) { if (![...f.fit].some(id => CL.SIMPLE_FITS.find(s => s.id === id).match(p))) return false; }
      else if (!f.fit.has(p.fit)) return false;
    }
    if (f.type.size && !f.type.has(p.type)) return false;
    if (f.material.size && !f.material.has(p.material)) return false;
    if (f.rise.size && !f.rise.has(riseCat(p))) return false;
    if (f.length.size && !f.length.has(p.length)) return false;
    if (f.color.size && !f.color.has(p.color)) return false;
    if (f.price.size && ![...f.price].some(id => CL.PRICE_RANGES.find(r => r.id === id).test(p.price))) return false;
    return true;
  }
  const filterCount = () => Object.values(state.filters).reduce((n, s) => n + s.size, 0);
  function sortList(list, getScore) {
    const arr = list.slice();
    if (state.sort === 'low') arr.sort((a, b) => a.price - b.price);
    else if (state.sort === 'review') arr.sort((a, b) => b.reviews - a.reviews);
    else if (getScore) arr.sort((a, b) => getScore(b) - getScore(a) || b.reviews - a.reviews);
    return arr;
  }

  /* ───── UT 기록 ───── */
  function utSave() { store.set('utActive', state.ut); renderUtBar(); }
  function utLog(type, data) {
    if (!state.ut) return;
    const t = Math.round((Date.now() - state.ut.start) / 1000);
    state.ut.events.push(Object.assign({ type, t }, data || {}));
    utSave();
  }
  const utCount = (s, type) => s.events.filter(e => e.type === type).length;
  function utSummary(s) {
    const searches = utCount(s, 'search');
    return {
      sec: s.end ? Math.round((s.end - s.start) / 1000) : null,
      searches, reentry: Math.max(0, searches - 1),
      exits: utCount(s, 'exit'), filters: utCount(s, 'filter'), terms: utCount(s, 'term'), chips: utCount(s, 'chip'),
      queries: s.events.filter(e => e.type === 'search').map(e => e.q),
    };
  }
  const fmtSec = sec => sec == null ? '-' : `${Math.floor(sec / 60)}분 ${String(sec % 60).padStart(2, '0')}초`;

  /* ───── 공통 UI 조각 ───── */
  function header() {
    return `<header class="topbar">
      <a href="#/" class="brand" aria-label="CodeLook 홈"><span class="brand-mark" aria-hidden="true">{ }</span>CodeLook</a>
      <button class="mode-toggle ${isTr() ? 'on' : ''}" data-act="toggle-mode" aria-pressed="${isTr()}" title="번역 도우미 켜기/끄기">
        <span class="dot" aria-hidden="true"></span>번역 도우미 ${isTr() ? 'ON' : 'OFF'}
      </button>
    </header>`;
  }
  function searchForm(q) {
    return `<form class="searchbar" data-form="search" role="search">
      <label class="sr-only" for="q">바지 검색</label>
      <input id="q" name="q" type="search" autocomplete="off" value="${esc(q || '')}"
        placeholder="${isTr() ? '예: 편하고 깔끔한 바지' : '상품명, 브랜드 검색'}">
      <button type="submit" aria-label="검색"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    </form>`;
  }
  function productCard(p, labels) {
    return `<a class="card" href="#/p/${p.id}">
      <div class="thumb">${CL.illus.productImage(p)}</div>
      <div class="card-body">
        <div class="brand-name">${esc(p.brand)}</div>
        <div class="pname">${esc(p.fullName)}</div>
        <div class="price">${won(p.price)}</div>
        ${labels && labels.length ? `<div class="match" aria-label="일치한 조건">✓ ${labels.map(esc).join(' · ')}</div>` : ''}
      </div>
    </a>`;
  }
  const grid = (list, labelsFn) => list.length ? `<div class="grid">${list.map(p => productCard(p, labelsFn && labelsFn(p))).join('')}</div>` : '';

  function nameWithTerms(name) {
    if (!isTr()) return esc(name);
    let out = '', i = 0;
    while (i < name.length) {
      const hit = CL.TERM_ALIASES.find(([n]) => name.startsWith(n, i));
      if (hit) { out += `<button class="term-link" data-act="term" data-id="${hit[1]}">${hit[0]}</button>`; i += hit[0].length; }
      else { out += esc(name[i]); i++; }
    }
    return out;
  }

  /* ───── 페이지: 홈 ───── */
  function pageHome() {
    const tr = isTr();
    return `${header()}
    <main class="page" id="main">
      <section class="hero">
        <h1>${tr ? '원하는 바지를<br><em>내 말로</em> 찾아보세요' : '바지'}</h1>
        ${tr ? '<p class="lead">패션 용어를 몰라도 괜찮아요. 내가 쓰는 말을 쇼핑 용어로 바꿔서 찾아 드려요.</p>' : ''}
        ${searchForm('')}
        ${tr ? `<div class="examples" aria-label="검색 예시">${CL.EXAMPLE_QUERIES.map(q => `<a class="ex" href="#/search?q=${encodeURIComponent(q)}">${esc(q)}</a>`).join('')}</div>` : ''}
      </section>
      ${tr ? `<section class="section">
        <h2>핏으로 둘러보기 <span class="muted">그림으로 골라요</span></h2>
        <div class="fit-row">${CL.SIMPLE_FITS.map(f => `<button class="fit-tile" data-act="fit-browse" data-id="${f.id}">${CL.illus.fitIcon(f.id)}<b>${f.label}</b><span>${f.plain}</span></button>`).join('')}</div>
      </section>
      <section class="section how">
        <h2>CodeLook은 이렇게 도와줘요</h2>
        <ol>
          <li><b>말로 찾기</b> "편한 바지"라고 써도 <span class="chip-demo">편한 → 와이드</span> 처럼 쇼핑 용어로 바꿔 줘요.</li>
          <li><b>그림 필터</b> 와이드, 테이퍼드 같은 핏을 그림으로 보고 골라요.</li>
          <li><b>내 몸 기준 사이즈</b> 총장·밑위 숫자를 "키 170 기준 발목까지"처럼 보여 줘요.</li>
        </ol>
      </section>` : ''}
      <section class="section">
        <div class="section-head"><h2>${tr ? '모든 바지' : '전체 상품'}</h2><a href="#/search?q=" class="more">전체 보기</a></div>
        ${grid(P.slice(0, 6))}
      </section>
      <p class="disclaimer">무신사 앱 개선 기획(HCI 수업 개인 프로젝트)을 바탕으로 만든 학습용 컨셉 프로토타입입니다. 상품·브랜드는 모두 가상이며 실제 판매·결제는 일어나지 않습니다.</p>
    </main>`;
  }

  /* ───── 페이지: 검색 결과 ───── */
  function pageSearch(q) {
    if (q !== state.q) { // 새 검색
      state.q = q; state.chips = isTr() ? translate(q) : []; state.chipsOff = new Set(); state.showOriginal = false;
    }
    const tr = isTr();
    const original = literalSearch(q).filter(passFilters);
    const active = state.chips.filter(c => !state.chipsOff.has(c.kind + ':' + c.id));
    let main = [], labels = new Map(), partial = false;
    const useChips = tr && state.chips.length > 0;
    if (useChips && active.length) {
      ({ list: main, labels, partial } = chipResults(active));
    } else if (useChips) {
      main = sortList(P.filter(passFilters));
    } else {
      main = sortList(original);
    }

    const chipsHtml = useChips ? `<section class="translate-box" aria-live="polite">
      <div class="tb-head"><span class="tb-icon" aria-hidden="true">⇄</span><div><b>“${esc(q)}”</b>를 쇼핑 용어로 바꿨어요</div></div>
      <div class="chips">${state.chips.map(c => {
        const key = c.kind + ':' + c.id, on = !state.chipsOff.has(key);
        const name = c.kind === 'term' ? T[c.id].name : CL.COLORS[c.id].name;
        const from = c.direct ? '' : `<span class="from">${esc(c.from)}</span><span class="arrow" aria-hidden="true">→</span>`;
        return `<span class="tchip ${on ? 'on' : ''}">
          <button class="tchip-main" data-act="chip" data-key="${key}" aria-pressed="${on}">${from}<b>${esc(name)}</b></button>
          ${c.kind === 'term' ? `<button class="tchip-info" data-act="term" data-id="${c.id}" aria-label="${esc(name)} 뜻 보기">?</button>` : ''}
        </span>`;
      }).join('')}</div>
      <p class="tb-help">칩을 누르면 켜고 끌 수 있어요. <b>?</b>를 누르면 용어 뜻을 그림으로 보여 줘요.</p>
    </section>` : '';

    const emptyTr = tr && !useChips && !main.length;
    return `${header()}
    <main class="page" id="main">
      <div class="search-top"><a href="#/" class="back" aria-label="홈으로">‹</a>${searchForm(q)}</div>
      ${chipsHtml}
      <div class="toolbar">
        <button class="filter-btn" data-act="open-filter">${tr ? '그림 필터' : '필터'}${filterCount() ? ` <span class="badge">${filterCount()}</span>` : ''}</button>
        <label class="sr-only" for="sort">정렬</label>
        <select id="sort" data-act="sort">
          <option value="rec" ${state.sort === 'rec' ? 'selected' : ''}>추천순</option>
          <option value="low" ${state.sort === 'low' ? 'selected' : ''}>낮은 가격순</option>
          <option value="review" ${state.sort === 'review' ? 'selected' : ''}>후기 많은순</option>
        </select>
      </div>
      ${activeFilterPills()}
      <h2 class="result-title">${useChips ? '내 말로 찾은 바지' : q ? `“${esc(q)}” 검색 결과` : '전체 바지'} <span class="count">${main.length}개</span></h2>
      ${partial && main.length ? '<p class="partial-note">모든 조건에 맞는 바지가 없어서, 일부 조건이 맞는 바지를 보여 드려요. 위의 칩을 꺼서 조건을 줄여 보세요.</p>' : ''}
      ${main.length ? grid(main, p => labels.get(p.id) ? labels.get(p.id).labels : null) :
        emptyTr ? `<div class="empty"><p><b>이 말은 아직 번역하지 못했어요.</b></p><p>이렇게 말해 보세요: ${CL.EXAMPLE_QUERIES.slice(0, 3).map(x => `<a href="#/search?q=${encodeURIComponent(x)}">${esc(x)}</a>`).join(', ')}</p><p><a href="#/glossary">용어 사전에서 직접 고르기 →</a></p></div>` :
        `<div class="empty"><p>검색 결과가 없습니다.</p><p class="muted">다른 검색어를 입력해 보세요.</p></div>`}
      ${useChips ? `<section class="original">
        <button class="orig-toggle" data-act="toggle-original" aria-expanded="${state.showOriginal}">원래 검색어 “${esc(q)}” 결과 ${original.length}개 ${state.showOriginal ? '접기 ▲' : '보기 ▼'}</button>
        ${state.showOriginal ? (original.length ? grid(sortList(original)) : '<p class="muted pad">원래 검색어로는 찾은 상품이 없어요. 위의 번역 결과를 확인해 보세요.</p>') : ''}
      </section>` : ''}
    </main>`;
  }

  function activeFilterPills() {
    const pills = [];
    const f = state.filters;
    f.fit.forEach(id => pills.push(['fit', id, isTr() ? CL.SIMPLE_FITS.find(s => s.id === id).label : (T[id] || { name: '조거' }).name]));
    f.type.forEach(id => pills.push(['type', id, CL.TYPE_LABEL[id]]));
    f.material.forEach(id => pills.push(['material', id, CL.MATERIAL_LABEL[id]]));
    f.rise.forEach(id => pills.push(['rise', id, { low: '로우라이즈', mid: '미드라이즈', high: '하이라이즈' }[id]]));
    f.length.forEach(id => pills.push(['length', id, { crop: '크롭', regular: '레귤러', long: '롱' }[id]]));
    f.color.forEach(id => pills.push(['color', id, CL.COLORS[id].name]));
    f.price.forEach(id => pills.push(['price', id, CL.PRICE_RANGES.find(r => r.id === id).label]));
    if (!pills.length) return '';
    return `<div class="pills">${pills.map(([g, id, l]) => `<button class="pill" data-act="filter" data-g="${g}" data-id="${id}" aria-label="${esc(l)} 필터 해제">${esc(l)} ✕</button>`).join('')}<button class="pill clear" data-act="filter-reset">초기화</button></div>`;
  }

  /* ───── 필터 시트 ───── */
  function filterSheet() {
    const f = state.filters, tr = isTr();
    const on = (g, id) => f[g].has(id) ? 'on' : '';
    const pressed = (g, id) => `aria-pressed="${f[g].has(id)}"`;
    const textChips = (g, items) => `<div class="fchips">${items.map(([id, l]) => `<button class="fchip ${on(g, id)}" data-act="filter" data-g="${g}" data-id="${id}" ${pressed(g, id)}>${esc(l)}</button>`).join('')}</div>`;
    const colorRow = `<div class="swatches">${Object.entries(CL.COLORS).map(([id, c]) => `<button class="swatch ${on('color', id)}" data-act="filter" data-g="color" data-id="${id}" ${pressed('color', id)}><span class="sw" style="background:${c.hex}"></span><span>${c.name}${tr ? `<small>${c.plain}</small>` : ''}</span></button>`).join('')}</div>`;
    let body;
    if (tr) {
      body = `<h3>핏 <span class="muted">그림을 보고 골라요</span></h3>
        <div class="fit-grid">${CL.SIMPLE_FITS.map(s => `<button class="fit-opt ${on('fit', s.id)}" data-act="filter" data-g="fit" data-id="${s.id}" ${pressed('fit', s.id)}>
          ${CL.illus.fitIcon(s.id)}<b>${s.label}</b><span>${s.plain}</span>${s.sub ? `<small>${s.sub}</small>` : ''}</button>`).join('')}</div>
        <h3>색상</h3>${colorRow}
        <h3>가격</h3>${textChips('price', CL.PRICE_RANGES.map(r => [r.id, r.label]))}
        <p class="muted small">입문자용으로 꼭 필요한 필터만 보여 드려요. 번역 도우미를 끄면 전체 필터가 나와요.</p>`;
    } else {
      body = `<h3>핏</h3>${textChips('fit', [['wide', '와이드'], ['semiwide', '세미와이드'], ['straight', '스트레이트'], ['slim', '슬림'], ['tapered', '테이퍼드'], ['jogger', '조거']])}
        <h3>종류</h3>${textChips('type', Object.entries(CL.TYPE_LABEL))}
        <h3>소재</h3>${textChips('material', Object.entries(CL.MATERIAL_LABEL))}
        <h3>밑위</h3>${textChips('rise', [['low', '로우라이즈'], ['mid', '미드라이즈'], ['high', '하이라이즈']])}
        <h3>기장</h3>${textChips('length', [['crop', '크롭'], ['regular', '레귤러'], ['long', '롱']])}
        <h3>색상</h3>${colorRow}
        <h3>가격</h3>${textChips('price', CL.PRICE_RANGES.map(r => [r.id, r.label]))}`;
    }
    const count = currentResultCount();
    return `<div class="sheet-head"><h2 id="sheet-title">${tr ? '그림 필터' : '필터'}</h2><button class="x" data-act="close-sheet" aria-label="닫기">✕</button></div>
      <div class="sheet-body">${body}</div>
      <div class="sheet-foot"><button class="btn ghost" data-act="filter-reset">초기화</button><button class="btn primary" data-act="close-sheet">${count}개 상품 보기</button></div>`;
  }
  function currentResultCount() {
    const q = state.q || '';
    if (isTr() && state.chips.length) {
      const active = state.chips.filter(c => !state.chipsOff.has(c.kind + ':' + c.id));
      if (!active.length) return P.filter(passFilters).length;
      return chipResults(active).list.length;
    }
    return literalSearch(q).filter(passFilters).length;
  }

  /* ───── 용어 시트 ───── */
  function termSheet(id, opts) {
    const t = T[id];
    const isMeasure = t.group === '실측';
    return `<div class="sheet-head"><h2 id="sheet-title"><span class="tag">${t.group}</span> ${t.name}</h2><button class="x" data-act="close-sheet" aria-label="닫기">✕</button></div>
      <div class="sheet-body term-sheet">
        <div class="term-ill">${CL.illus.termIllustration(t)}${t.ill.kind === 'fit' && t.ill.fit !== 'straight' ? '<p class="ill-note">점선은 비교용 기본(스트레이트) 바지예요</p>' : ''}</div>
        <p class="term-short">${t.short}</p>
        <p class="term-desc">${t.desc}</p>
        ${isMeasure ? '' : `<button class="btn primary block" data-act="search-term" data-id="${id}">‘${t.name}’ 바지 보기</button>`}
      </div>`;
  }

  /* ───── 페이지: 상품 상세 ───── */
  function pageProduct(id) {
    const p = CL.productById(id);
    if (!p) return `${header()}<main class="page"><div class="empty">상품을 찾을 수 없어요. <a href="#/">홈으로</a></div></main>`;
    const tr = isTr();
    const size = state.sizeOf[p.id] || 'M';
    const m = p.measures[size];
    const H = state.height || 170;
    const fit = CL.illus.bodyFit(H, m);
    const fitTerm = T[p.fit] || T.jogger;
    const keys = ['length', 'waist', 'rise', 'thigh', 'hem'];
    const head = k => tr ? `<button class="term-link th" data-act="term" data-id="${k}">${T[k].name}<span class="q" aria-hidden="true">?</span></button>` : T[k].name;

    // 허리 사이즈 추천
    let rec = '';
    if (tr && state.waistInch) {
      const userCirc = state.waistInch * 2.54;
      const best = CL.SIZES.slice().sort((a, b) => Math.abs(p.measures[a].waist * 2 - userCirc) - Math.abs(p.measures[b].waist * 2 - userCirc))[0];
      rec = `<p class="rec">평소 <b>${state.waistInch}인치</b>(허리둘레 약 ${Math.round(userCirc)}cm)라면 <b>${best}</b> 사이즈 허리가 가장 가까워요.${p.details.includes('banding') ? ' 밴딩이라 조금 여유가 있어요.' : ''}</p>`;
    }

    const glance = tr ? `<section class="glance" aria-label="이 바지 한눈에 보기">
        <h2>이 바지, 쉽게 말하면</h2>
        <dl>
          <div><dt>통</dt><dd><button class="term-link" data-act="term" data-id="${fitTerm.id}">${fitTerm.name}</button> · ${fitTerm.short}</dd></div>
          <div><dt>허리</dt><dd>${p.details.includes('banding') ? '고무줄(<button class="term-link" data-act="term" data-id="banding">밴딩</button>)이라 허리 사이즈 부담이 적어요' : '단추·지퍼로 잠그는 허리라 허리 사이즈를 맞춰야 해요'}</dd></div>
          <div><dt>길이</dt><dd>키 ${H}cm, ${size} 기준 ${fit.lengthText}</dd></div>
          <div><dt>소재</dt><dd>${p.material === 'linen' ? '린넨 · 얇고 시원해요' : p.material === 'brushed' ? '기모 · 안쪽이 보송하고 따뜻해요' : p.materialLabel}</dd></div>
        </dl>
      </section>` : '';

    const bodySection = tr ? `<section class="body-sec" aria-labelledby="body-h">
        <h2 id="body-h">내 몸 기준으로 보기</h2>
        <div class="inputs">
          <label>키 <input type="number" inputmode="numeric" min="140" max="200" step="1" data-act="height" value="${state.height || ''}" placeholder="170"> cm</label>
          <label>평소 허리 <select data-act="waist"><option value="">선택 안 함</option>${[26, 27, 28, 29, 30, 31, 32, 33, 34, 36].map(i => `<option value="${i}" ${state.waistInch === i ? 'selected' : ''}>${i}인치</option>`).join('')}</select></label>
        </div>
        <p class="muted small">입력한 키와 허리는 이 화면에서만 쓰고 저장하지 않아요.${state.height ? '' : ' 지금은 키 170cm 예시로 보여 드려요.'}</p>
        ${rec}
        <div class="body-wrap">
          <div class="body-fig">${CL.illus.bodyView(H, m, CL.COLORS[p.color].hex)}</div>
          <ul class="body-facts">
            <li><span class="k">길이</span>${fit.lengthText}</li>
            <li><span class="k">허리</span>허리둘레 약 ${Math.round(fit.waistCirc)}cm (약 ${fit.inch.toFixed(1)}인치)${p.details.includes('banding') ? ', 밴딩이라 늘어나요' : ''}</li>
            <li><span class="k">허리 높이</span>${fit.riseText}</li>
            <li><span class="k">허벅지</span>${fit.thighText}</li>
          </ul>
        </div>
        <p class="muted small">표준 신체 비율로 계산한 참고 그림이에요. 다리 길이와 체형에 따라 달라질 수 있어요.</p>
      </section>` : '';

    return `${header()}
    <main class="page product" id="main">
      <div class="search-top"><button class="back" data-act="back" aria-label="뒤로">‹</button><span class="crumb">${esc(p.typeLabel)}</span></div>
      <div class="hero-img">${CL.illus.productImage(p, size)}</div>
      <div class="pinfo">
        <div class="brand-name">${esc(p.brand)}</div>
        <h1 class="ptitle">${nameWithTerms(p.name)} <span class="muted">(${CL.COLORS[p.color].name})</span></h1>
        ${tr ? '<p class="muted small">밑줄 친 용어를 누르면 뜻을 그림으로 보여 줘요.</p>' : ''}
        <div class="pprice">${won(p.price)} <span class="rating">★ ${p.rating} · 후기 ${p.reviews}</span></div>
      </div>
      ${glance}
      <section class="size-sec" aria-labelledby="size-h">
        <h2 id="size-h">사이즈 선택</h2>
        <div class="sizes" role="radiogroup" aria-label="사이즈">${CL.SIZES.map(s => `<button role="radio" aria-checked="${s === size}" class="size ${s === size ? 'on' : ''}" data-act="size" data-id="${p.id}" data-size="${s}">${s}</button>`).join('')}</div>
      </section>
      ${bodySection}
      <section class="measure-sec" aria-labelledby="m-h">
        <h2 id="m-h">실측 사이즈 <span class="muted small">(단위 cm)</span></h2>
        <div class="table-wrap"><table class="mtable">
          <thead><tr><th scope="col">사이즈</th>${keys.map(k => `<th scope="col">${head(k)}</th>`).join('')}</tr></thead>
          <tbody>${CL.SIZES.map(s => `<tr class="${s === size ? 'sel' : ''}"><th scope="row">${s}</th>${keys.map(k => `<td>${p.measures[s][k]}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        ${tr ? '<p class="muted small">표 머리의 용어를 누르면 어디를 잰 값인지 그림으로 보여 줘요.</p>' : '<p class="muted small">측정 방법에 따라 1~3cm 오차가 있을 수 있습니다.</p>'}
      </section>
      <div class="buybar"><div><b>${size}</b> 선택됨<br><span class="muted small">결제는 진행되지 않아요</span></div><button class="btn primary" data-act="decide" data-id="${p.id}">이 사이즈로 결정</button></div>
    </main>`;
  }

  function decideSheet(p) {
    const size = state.sizeOf[p.id] || 'M';
    const H = state.height || 170;
    const f = CL.illus.bodyFit(H, p.measures[size]);
    return `<div class="sheet-head"><h2 id="sheet-title">이 바지로 결정할까요?</h2><button class="x" data-act="close-sheet" aria-label="닫기">✕</button></div>
      <div class="sheet-body">
        <div class="decide-item"><div class="thumb sm">${CL.illus.productImage(p, size)}</div><div><b>${esc(p.fullName)}</b><br>사이즈 <b>${size}</b> · ${won(p.price)}</div></div>
        ${isTr() ? `<div class="reason-auto"><h3>CodeLook이 정리한 선택 근거</h3><ul>
          <li>${state.height ? `키 ${H}cm` : '키 170cm(예시)'} 기준: ${f.lengthText}</li>
          <li>허리둘레 약 ${Math.round(f.waistCirc)}cm (약 ${f.inch.toFixed(1)}인치)</li>
          <li>${f.riseText}</li></ul></div>` : ''}
        <label class="field">이 사이즈를 고른 이유 (선택)<textarea id="reason" rows="3" placeholder="예: 발목까지 오는 길이가 좋아서"></textarea></label>
      </div>
      <div class="sheet-foot"><button class="btn ghost" data-act="close-sheet">다시 고를래요</button><button class="btn primary" data-act="confirm-decide" data-id="${p.id}">결정하기</button></div>`;
  }

  /* ───── 페이지: 용어 사전 ───── */
  function pageGlossary(filterText) {
    const groups = ['핏', '종류', '디테일', '기장', '소재', '실측'];
    const ft = (filterText || '').trim();
    const list = Object.values(T).filter(t => !ft || t.name.includes(ft) || t.short.includes(ft) || t.desc.includes(ft));
    return `${header()}
    <main class="page" id="main">
      <h1 class="page-title">바지 용어 사전</h1>
      <p class="lead">상품명과 사이즈표에 나오는 말을 그림과 쉬운 말로 풀었어요.</p>
      <label class="sr-only" for="gq">용어 찾기</label>
      <input id="gq" class="g-search" type="search" placeholder="용어 찾기 (예: 밑위)" value="${esc(ft)}" data-act="gsearch">
      ${groups.map(g => { const items = list.filter(t => t.group === g); return items.length ? `<section class="section"><h2>${g}</h2><div class="term-list">${items.map(t => `<button class="term-card" data-act="term" data-id="${t.id}"><div class="tc-ill">${CL.illus.termIllustration(t)}</div><div><b>${t.name}</b><p>${t.short}</p></div></button>`).join('')}</div></section>` : ''; }).join('')}
      ${list.length ? '' : '<div class="empty">찾는 용어가 없어요.</div>'}
      <section class="section">
        <h2>이렇게 말하면 → 이렇게 찾아요</h2>
        <p class="muted small">검색창에 이런 말을 쓰면 오른쪽 용어로 바꿔서 찾아 드려요.</p>
        <table class="dict"><thead><tr><th scope="col">내가 쓰는 말</th><th scope="col">쇼핑 용어</th></tr></thead><tbody>
          ${CL.EXPRESSIONS.map(ex => `<tr><td>${ex.words.slice(0, 4).map(esc).join(', ')}</td><td>${ex.terms.map(id => `<button class="term-link" data-act="term" data-id="${id}">${T[id].name}</button>`).join(' ')}</td></tr>`).join('')}
        </tbody></table>
      </section>
    </main>`;
  }

  /* ───── 페이지: UT 기록 ───── */
  function pageUT() {
    const sessions = store.get('utSessions', []);
    const done = sessions.filter(s => s.end);
    const avg = (arr, k) => arr.length ? arr.reduce((n, s) => n + utSummary(s)[k], 0) / arr.length : null;
    const A = done.filter(s => s.condition === 'A'), B = done.filter(s => s.condition === 'B');
    const aT = avg(A, 'sec'), bT = avg(B, 'sec');
    const aR = A.length ? A.reduce((n, s) => { const u = utSummary(s); return n + u.reentry + u.exits; }, 0) / A.length : null;
    const bR = B.length ? B.reduce((n, s) => { const u = utSummary(s); return n + u.reentry + u.exits; }, 0) / B.length : null;
    const pct = (a, b) => a ? Math.round((1 - b / a) * 100) : null;
    const timeGoal = aT && bT != null ? pct(aT, bT) : null;
    const rGoal = aR != null && bR != null ? (aR === 0 ? null : bR / aR) : null;
    const nextId = 'P' + String(new Set(sessions.map(s => s.participant)).size + 1).padStart(2, '0');

    return `${header()}
    <main class="page" id="main">
      <h1 class="page-title">비교 사용성 평가(UT) 기록</h1>
      <p class="lead">기획서의 평가 계획대로 <b>현재 방식(A)</b>과 <b>번역 도우미(B)</b>로 같은 과업을 수행하고 지표를 비교해요.</p>
      ${state.ut ? `<div class="notice">진행 중인 과업이 있어요 (${esc(state.ut.participant)} · 조건 ${state.ut.condition}). 상품 상세에서 “이 사이즈로 결정”을 누르면 끝나요. <button class="btn ghost sm" data-act="ut-abort">과업 중단</button></div>` : `
      <section class="card-box">
        <h2>새 과업 시작</h2>
        <div class="scenario"><b>과업 시나리오</b><p>“다음 주 발표 날 입을 바지가 필요해요. 이 앱에서 원하는 바지를 하나 골라 사이즈까지 정해 주세요. 결제는 하지 않습니다. 평소처럼 하시고, 생각나는 것을 소리 내어 말해 주세요.”</p></div>
        <div class="form-row">
          <label>참여자 ID <input id="ut-pid" value="${nextId}" maxlength="8"></label>
          <fieldset><legend>조건</legend>
            <label class="radio"><input type="radio" name="cond" value="A"> A · 현재 방식 (번역 OFF)</label>
            <label class="radio"><input type="radio" name="cond" value="B" checked> B · 번역 도우미 (번역 ON)</label>
          </fieldset>
        </div>
        <p class="muted small">순서 효과를 줄이려면 참여자마다 A→B, B→A 순서를 번갈아 진행하세요. 개인정보는 기록하지 않아요. 기록은 이 브라우저에만 저장돼요.</p>
        <button class="btn primary block" data-act="ut-start">과업 시작 (타이머 시작)</button>
      </section>`}
      <section class="section">
        <h2>지표 요약 <span class="muted small">완료 ${done.length}건</span></h2>
        <div class="kpis">
          <div class="kpi"><span>평균 과업 시간</span><b>A ${fmtSec(aT == null ? null : Math.round(aT))}</b><b>B ${fmtSec(bT == null ? null : Math.round(bT))}</b><em class="${timeGoal != null && timeGoal >= 30 ? 'ok' : ''}">${timeGoal == null ? '목표: 30% 이상 단축' : `${timeGoal}% 단축 ${timeGoal >= 30 ? '· 목표 달성' : '· 목표 30%'}`}</em></div>
          <div class="kpi"><span>평균 검색어 재입력 + 이탈</span><b>A ${aR == null ? '-' : aR.toFixed(1)}회</b><b>B ${bR == null ? '-' : bR.toFixed(1)}회</b><em class="${rGoal != null && rGoal <= 0.5 ? 'ok' : ''}">${rGoal == null ? '목표: 절반 이하' : `A의 ${Math.round(rGoal * 100)}% ${rGoal <= 0.5 ? '· 목표 달성' : '· 목표 50% 이하'}`}</em></div>
        </div>
        <p class="muted small">참여자가 적으므로 통계 검정이 아니라 경향을 보는 용도예요.</p>
      </section>
      <section class="section">
        <div class="section-head"><h2>세션 기록</h2>${sessions.length ? '<div class="row-btns"><button class="btn ghost sm" data-act="ut-csv">CSV 내보내기</button><button class="btn ghost sm danger" data-act="ut-clear">전체 삭제</button></div>' : ''}</div>
        ${sessions.length ? `<div class="table-wrap"><table class="uttable"><thead><tr><th>ID</th><th>조건</th><th>시간</th><th>검색어(순서)</th><th>재입력</th><th>이탈</th><th>필터</th><th>용어</th><th>칩</th><th>선택</th><th>성공</th></tr></thead><tbody>
          ${sessions.slice().reverse().map(s => { const u = utSummary(s); const pr = s.choice ? CL.productById(s.choice.productId) : null; return `<tr>
            <td>${esc(s.participant)}</td><td>${s.condition}</td><td>${s.end ? fmtSec(u.sec) : '진행/중단'}</td>
            <td class="qs">${u.queries.map(esc).join(' → ') || '-'}</td><td>${u.reentry}</td><td>${u.exits}</td><td>${u.filters}</td><td>${u.terms}</td><td>${u.chips}</td>
            <td>${pr ? `${esc(pr.name)} ${s.choice.size}${s.choice.reason ? `<br><small>“${esc(s.choice.reason)}”</small>` : ''}` : '-'}</td>
            <td><select data-act="ut-success" data-id="${s.id}" aria-label="${esc(s.participant)} 과업 성공 여부"><option value="" ${s.success == null ? 'selected' : ''}>-</option><option value="y" ${s.success === true ? 'selected' : ''}>성공</option><option value="n" ${s.success === false ? 'selected' : ''}>실패</option></select></td>
          </tr>`; }).join('')}
        </tbody></table></div>` : '<p class="muted">아직 기록이 없어요.</p>'}
      </section>
    </main>`;
  }

  function renderUtBar() {
    let bar = $('#utbar');
    if (!state.ut) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'utbar'; bar.setAttribute('role', 'status'); document.body.appendChild(bar); }
    const exits = utCount(state.ut, 'exit');
    bar.innerHTML = `<span class="rec-dot" aria-hidden="true"></span><b>${esc(state.ut.participant)}</b> · 조건 ${state.ut.condition} · <span id="ut-clock">00:00</span>
      <button data-act="ut-exit" title="참여자가 앱 밖으로 나가 정보를 찾으면 연구자가 누르세요">이탈 +1 (${exits})</button>
      <button data-act="ut-abort">중단</button>`;
    tickClock();
  }
  function tickClock() {
    const el = $('#ut-clock');
    if (!el || !state.ut) return;
    const s = Math.floor((Date.now() - state.ut.start) / 1000);
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  setInterval(tickClock, 1000);

  /* ───── 시트(바텀시트) ───── */
  let lastFocus = null, sheetKind = null;
  function openSheet(html, kind) {
    const sheet = $('#sheet'), panel = $('#sheet .panel');
    lastFocus = document.activeElement; sheetKind = kind;
    panel.innerHTML = html;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    const f = panel.querySelector('button, input, textarea, select'); if (f) f.focus();
  }
  function closeSheet() {
    const sheet = $('#sheet');
    if (sheet.hidden) return;
    sheet.classList.remove('open');
    sheet.hidden = true;
    const kind = sheetKind; sheetKind = null;
    if (kind === 'filter') render();
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ───── 라우팅 ───── */
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    const params = new URLSearchParams(qs || '');
    return { path, params };
  }
  let lastPath = null;
  function render() {
    const { path, params } = parseHash();
    let html;
    if (path === '/' || path === '') html = pageHome();
    else if (path === '/search') html = pageSearch(params.get('q') || '');
    else if (path.startsWith('/p/')) html = pageProduct(path.slice(3));
    else if (path.startsWith('/glossary')) html = pageGlossary(params.get('q') || '');
    else if (path === '/ut') html = pageUT();
    else html = pageHome();
    app.innerHTML = html + bottomNav(path);
    const full = location.hash;
    if (full !== lastPath) { window.scrollTo(0, 0); lastPath = full; }
    const tab = path.startsWith('/glossary') ? '용어 사전' : path === '/ut' ? 'UT 기록' : path.startsWith('/p/') ? '상품 상세' : path === '/search' ? '검색 결과' : '홈';
    document.title = `${tab} · CodeLook`;
  }
  function bottomNav(path) {
    const item = (href, label, icon, active) => `<a href="${href}" class="${active ? 'on' : ''}" ${active ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
    const ic = d => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<nav class="bottomnav" aria-label="주 메뉴">
      ${item('#/', '홈', ic('M3 11 12 4l9 7v9H3z'), path === '/' || path === '')}
      ${item('#/search?q=', '전체 바지', ic('M8 3h8l1 18h-4l-1-10-1 10H7z'), path === '/search' || path.startsWith('/p/'))}
      ${item('#/glossary', '용어 사전', ic('M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-4a2 2 0 0 0-2 2'), path.startsWith('/glossary'))}
      ${item('#/ut', 'UT 기록', ic('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'), path === '/ut')}
    </nav>`;
  }

  /* ───── 이벤트 ───── */
  document.addEventListener('submit', e => {
    const form = e.target.closest('[data-form="search"]');
    if (!form) return;
    e.preventDefault();
    const q = form.q.value.trim();
    utLog('search', { q });
    state.q = null; // 같은 검색어도 새 검색으로 처리
    const target = '#/search?q=' + encodeURIComponent(q);
    if (location.hash === target) render(); else location.hash = target;
  });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      if (e.target.id === 'sheet') closeSheet();
      return;
    }
    const act = el.dataset.act, id = el.dataset.id;
    switch (act) {
      case 'toggle-mode':
        state.mode = isTr() ? 'plain' : 'translate'; store.set('mode', state.mode);
        state.filters = emptyFilters(); state.q = null;
        utLog('mode', { mode: state.mode });
        render(); toast(isTr() ? '번역 도우미를 켰어요' : '번역 도우미를 껐어요 (현재 앱 방식)');
        break;
      case 'chip': {
        const key = el.dataset.key;
        state.chipsOff.has(key) ? state.chipsOff.delete(key) : state.chipsOff.add(key);
        utLog('chip', { key, on: !state.chipsOff.has(key) });
        render(); break;
      }
      case 'term':
        utLog('term', { id });
        openSheet(termSheet(id), 'term'); break;
      case 'search-term':
        closeSheet(); state.q = null;
        utLog('chip', { key: 'term:' + id, from: 'glossary' });
        location.hash = '#/search?q=' + encodeURIComponent(T[id].name); break;
      case 'fit-browse':
        state.filters = emptyFilters(); state.filters.fit.add(id);
        state.q = ''; state.chips = []; state.chipsOff = new Set();
        utLog('filter', { g: 'fit', id });
        if (location.hash === '#/search?q=') render(); else location.hash = '#/search?q=';
        break;
      case 'open-filter': openSheet(filterSheet(), 'filter'); break;
      case 'filter': {
        const g = el.dataset.g, set = state.filters[g];
        set.has(id) ? set.delete(id) : set.add(id);
        utLog('filter', { g, id });
        if (sheetKind === 'filter') { const scroll = $('#sheet .sheet-body').scrollTop; $('#sheet .panel').innerHTML = filterSheet(); $('#sheet .sheet-body').scrollTop = scroll; }
        else render();
        break;
      }
      case 'filter-reset':
        state.filters = emptyFilters();
        if (sheetKind === 'filter') $('#sheet .panel').innerHTML = filterSheet(); else render();
        break;
      case 'close-sheet': closeSheet(); break;
      case 'toggle-original': state.showOriginal = !state.showOriginal; render(); break;
      case 'size': state.sizeOf[id] = el.dataset.size; utLog('size', { id, size: el.dataset.size }); render(); break;
      case 'back': history.length > 1 ? history.back() : (location.hash = '#/'); break;
      case 'decide': openSheet(decideSheet(CL.productById(id)), 'decide'); break;
      case 'confirm-decide': {
        const reason = ($('#reason') || {}).value || '';
        const size = state.sizeOf[id] || 'M';
        closeSheet();
        if (state.ut) {
          const s = state.ut; s.end = Date.now(); s.choice = { productId: id, size, reason }; s.mode = state.mode;
          const all = store.get('utSessions', []); all.push(s); store.set('utSessions', all);
          state.ut = null; utSave();
          location.hash = '#/ut';
          toast(`과업 완료! ${fmtSec(Math.round((s.end - s.start) / 1000))} 걸렸어요`);
        } else toast(`${CL.productById(id).name} ${size} 사이즈로 결정했어요 (실제 결제는 없어요)`);
        break;
      }
      case 'ut-start': {
        const pid = ($('#ut-pid').value || 'P00').trim().slice(0, 8);
        const cond = (document.querySelector('input[name="cond"]:checked') || {}).value || 'B';
        state.mode = cond === 'A' ? 'plain' : 'translate'; store.set('mode', state.mode);
        state.filters = emptyFilters(); state.q = null; state.sizeOf = {}; state.height = null; state.waistInch = null;
        state.ut = { id: 's' + Date.now(), participant: pid, condition: cond, start: Date.now(), end: null, events: [], choice: null, success: null };
        utSave(); location.hash = '#/'; toast(`${pid} 조건 ${cond} 과업을 시작했어요`);
        break;
      }
      case 'ut-exit': utLog('exit'); break;
      case 'ut-abort': {
        const all = store.get('utSessions', []); all.push(state.ut); store.set('utSessions', all);
        state.ut = null; utSave(); toast('과업을 중단했어요 (기록에 “중단”으로 남아요)');
        if (parseHash().path === '/ut') render();
        break;
      }
      case 'ut-csv': exportCsv(); break;
      case 'ut-clear':
        if (el.dataset.confirm === '1') { store.set('utSessions', []); render(); toast('기록을 모두 삭제했어요'); }
        else { el.dataset.confirm = '1'; el.textContent = '한 번 더 누르면 삭제'; setTimeout(() => { if (el.isConnected) { el.dataset.confirm = ''; el.textContent = '전체 삭제'; } }, 3000); }
        break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.act === 'sort') { state.sort = el.value; render(); }
    if (el.dataset.act === 'waist') { state.waistInch = el.value ? +el.value : null; render(); }
    if (el.dataset.act === 'height') {
      const v = parseInt(el.value, 10);
      state.height = v >= 140 && v <= 200 ? v : null;
      if (el.value && !state.height) toast('키는 140~200cm 사이로 입력해 주세요');
      utLog('height');
      render();
      const inp = document.querySelector('[data-act="height"]'); if (inp) inp.focus();
    }
    if (el.dataset.act === 'ut-success') {
      const all = store.get('utSessions', []);
      const s = all.find(x => x.id === el.dataset.id);
      if (s) { s.success = el.value === 'y' ? true : el.value === 'n' ? false : null; store.set('utSessions', all); }
    }
  });
  let gTimer;
  document.addEventListener('input', e => {
    if (e.target.dataset.act === 'gsearch') {
      clearTimeout(gTimer);
      const v = e.target.value;
      gTimer = setTimeout(() => { history.replaceState(null, '', '#/glossary' + (v ? '?q=' + encodeURIComponent(v) : '')); render(); const g = $('#gq'); g.focus(); g.setSelectionRange(v.length, v.length); }, 250);
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  function exportCsv() {
    const all = store.get('utSessions', []);
    const rows = [['참여자', '조건', '완료', '과업시간(초)', '검색어(순서)', '검색횟수', '재입력', '이탈', '필터사용', '용어열람', '칩조작', '선택상품', '사이즈', '선택이유', '성공']];
    all.forEach(s => {
      const u = utSummary(s), pr = s.choice ? CL.productById(s.choice.productId) : null;
      rows.push([s.participant, s.condition, s.end ? 'Y' : 'N', u.sec == null ? '' : u.sec, u.queries.join(' > '), u.searches, u.reentry, u.exits, u.filters, u.terms, u.chips, pr ? pr.fullName : '', s.choice ? s.choice.size : '', s.choice ? s.choice.reason : '', s.success == null ? '' : s.success ? '성공' : '실패']);
    });
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'codelook-ut-기록.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.addEventListener('hashchange', () => { closeSheet(); render(); });
  render();
  renderUtBar();
})();
