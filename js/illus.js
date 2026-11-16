/* CodeLook — 그림 생성 (SVG): 바지 실루엣, 실측 설명 그림, 내 몸 기준 보기 */
window.CL = window.CL || {};

(function () {
  const ACCENT = '#E0582F';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amt)));
    g = Math.max(0, Math.min(255, Math.round(g + amt)));
    b = Math.max(0, Math.min(255, Math.round(b + amt)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const isDark = hex => {
    const n = parseInt(hex.slice(1), 16);
    return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 110;
  };

  /* 바지 형태 계산 (viewBox 0 0 160 200) */
  function pantsGeometry(o) {
    const S = 1.25;                      // cm → px
    const T = o.thigh * S, H = o.hem * S;
    const lenF = o.lenF || 1;
    const top = 14, bandH = 8;
    const hemY = Math.min(top + 172 * lenF, 196);
    const crotchY = 62;
    const kneeY = top + (hemY - top) * 0.56;
    const K = o.fit === 'wide' ? T * 0.9 : o.fit === 'jogger' ? T * 0.72 : (T + H) / 2;
    const Wh = 25;
    const legR = sign => {
      const c = 80 + sign * (1 + T / 2);
      const kc = c + sign * 1.5, hc = c + sign * 3;
      return {
        thighOut: [80 + sign * (1 + T), crotchY + 2],
        kneeOut: [kc + sign * K / 2, kneeY], kneeIn: [kc - sign * K / 2, kneeY],
        hemOut: [hc + sign * H / 2, hemY], hemIn: [hc - sign * H / 2, hemY],
      };
    };
    return { top, bandH, hemY, crotchY, kneeY, Wh, R: legR(1), L: legR(-1), T, H };
  }

  /* 바지 그림. o = {fit, thigh, hem, color, details[], lenF, highlight, ghost} */
  function pants(o) {
    o = Object.assign({ fit: 'straight', color: '#8E9196', details: [], lenF: 1 }, o);
    if (o.thigh == null) {
      const b = CL.FIT_BASE[o.fit] || CL.FIT_BASE.straight;
      o.thigh = b.thigh; o.hem = b.hem;
    }
    if (o.details.includes('crop')) o.lenF = 0.9;
    if (o.details.includes('long')) o.lenF = 1.05;
    const g = pantsGeometry(o);
    const { R, L, top, bandH, Wh, crotchY, hemY } = g;
    const p = (pt) => pt[0].toFixed(1) + ' ' + pt[1].toFixed(1);
    const d = [
      `M ${80 - Wh} ${top}`, `L ${80 + Wh} ${top}`,
      `Q ${R.thighOut[0] + 1} ${top + 22} ${p(R.thighOut)}`,
      `L ${p(R.kneeOut)}`, `L ${p(R.hemOut)}`, `L ${p(R.hemIn)}`, `L ${p(R.kneeIn)}`,
      `L 80 ${crotchY}`,
      `L ${p(L.kneeIn)}`, `L ${p(L.hemIn)}`, `L ${p(L.hemOut)}`, `L ${p(L.kneeOut)}`, `L ${p(L.thighOut)}`,
      `Q ${L.thighOut[0] - 1} ${top + 22} ${80 - Wh} ${top}`, 'Z',
    ].join(' ');
    const fill = o.color, line = shade(o.color, isDark(o.color) ? 55 : -60);
    const det = [];
    const dl = (x1, y1, x2, y2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${line}" stroke-width="1.2" stroke-linecap="round" ${extra}/>`;

    // 허리 밴드
    if (o.details.includes('banding')) {
      let w = `M ${80 - Wh} ${top + 4}`;
      for (let x = 80 - Wh; x < 80 + Wh; x += 5) w += ` q 1.25 -2 2.5 0 q 1.25 2 2.5 0`;
      det.push(`<rect x="${80 - Wh}" y="${top}" width="${Wh * 2}" height="${bandH}" fill="${shade(o.color, isDark(o.color) ? 18 : -18)}"/>`);
      det.push(`<path d="${w}" fill="none" stroke="${line}" stroke-width="0.9"/>`);
    } else {
      det.push(`<rect x="${80 - Wh}" y="${top}" width="${Wh * 2}" height="${bandH}" fill="${shade(o.color, isDark(o.color) ? 12 : -12)}"/>`);
      det.push(dl(80, top + bandH, 80, top + bandH + 26));
      det.push(`<circle cx="80" cy="${top + 4}" r="1.6" fill="${line}"/>`);
    }
    // 벨트 고리
    if (!o.details.includes('banding')) [-18, -6, 6, 18].forEach(x => det.push(dl(80 + x, top, 80 + x, top + bandH)));
    // 턱 주름
    const tucks = o.details.includes('twotuck') ? [9, 15] : o.details.includes('onetuck') ? [11] : [];
    tucks.forEach(x => { det.push(dl(80 + x, top + bandH, 80 + x + 1, top + bandH + 16)); det.push(dl(80 - x, top + bandH, 80 - x - 1, top + bandH + 16)); });
    // 핀턱(세로 주름선)
    if (o.details.includes('pintuck') || o.details.includes('slacksCrease')) {
      [R, L].forEach(S => {
        const cx1 = (S.thighOut[0] + 80) / 2, cx2 = (S.hemOut[0] + S.hemIn[0]) / 2;
        det.push(dl(cx1, top + bandH + 2, cx2, hemY - 2, 'stroke-dasharray="0"'));
      });
    }
    // 카고 주머니
    if (o.details.includes('cargo')) {
      [R, L].forEach((S, i) => {
        const sx = i === 0 ? 1 : -1;
        const x = S.thighOut[0] - sx * 4, y = g.kneeY - 26;
        const w = 15;
        const rx = sx > 0 ? x - w : x;
        det.push(`<rect x="${rx}" y="${y}" width="${w}" height="20" rx="1.5" fill="${shade(o.color, isDark(o.color) ? 14 : -14)}" stroke="${line}" stroke-width="1"/>`);
        det.push(dl(rx, y + 6, rx + w, y + 6));
      });
    }
    // 데님 스티치
    if (o.details.includes('denim') || o.denim) {
      [R, L].forEach(S => det.push(`<polyline points="${p(S.thighOut)} ${p(S.kneeOut)} ${p(S.hemOut)}" fill="none" stroke="#E7B65C" stroke-width="0.9" stroke-dasharray="2 2" transform="translate(${S === R ? -3 : 3} 0)"/>`));
      det.push(`<path d="M ${80 - Wh + 4} ${top + bandH + 4} q 8 10 18 4" fill="none" stroke="#E7B65C" stroke-width="0.9" stroke-dasharray="2 2"/>`);
      det.push(`<path d="M ${80 + Wh - 4} ${top + bandH + 4} q -8 10 -18 4" fill="none" stroke="#E7B65C" stroke-width="0.9" stroke-dasharray="2 2"/>`);
    }
    // 조거 시보리
    if (o.details.includes('jogger')) {
      [R, L].forEach(S => {
        const x1 = Math.min(S.hemIn[0], S.hemOut[0]), w = Math.abs(S.hemOut[0] - S.hemIn[0]);
        det.push(`<rect x="${x1 - 1}" y="${hemY - 9}" width="${w + 2}" height="9" rx="2" fill="${shade(o.color, isDark(o.color) ? 22 : -22)}"/>`);
        for (let k = 2; k < w; k += 3) det.push(dl(x1 + k, hemY - 8, x1 + k, hemY - 1, 'stroke-width="0.6"'));
      });
    }
    // 롱: 밑단 주름
    if (o.details.includes('long')) {
      [R, L].forEach(S => {
        const x1 = Math.min(S.hemIn[0], S.hemOut[0]), x2 = Math.max(S.hemIn[0], S.hemOut[0]);
        det.push(`<path d="M ${x1 + 1} ${hemY - 16} q ${(x2 - x1) / 2} 5 ${x2 - x1 - 2} 0 M ${x1 + 1} ${hemY - 9} q ${(x2 - x1) / 2} 5 ${x2 - x1 - 2} 0" fill="none" stroke="${line}" stroke-width="1"/>`);
      });
    }
    // 린넨 질감
    if (o.details.includes('linen')) {
      for (let i = 0; i < 26; i++) {
        const y = top + 14 + (i * 37) % (hemY - top - 20), x = 80 + ((i * 29) % 2 ? 1 : -1) * (6 + (i * 13) % 18);
        det.push(dl(x, y, x + 5, y, 'stroke-width="0.6" opacity="0.6"'));
      }
    }
    // 기모: 안쪽 털 표시
    if (o.details.includes('brushed')) {
      det.push(`<path d="M ${80 - Wh + 2} ${top + bandH + 1} ${Array.from({ length: 16 }, (_, i) => `l 1.5 ${i % 2 ? -3 : 3}`).join(' ')}" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.85"/>`);
    }

    // 비교용 고스트(스트레이트 외곽선)
    let ghost = '';
    if (o.ghost) {
      const gb = CL.FIT_BASE.straight;
      const gg = pantsGeometry({ fit: 'straight', thigh: gb.thigh, hem: gb.hem, lenF: 1 });
      const gd = [`M ${80 - gg.Wh} ${gg.top}`, `L ${80 + gg.Wh} ${gg.top}`, `Q ${gg.R.thighOut[0] + 1} ${gg.top + 22} ${p(gg.R.thighOut)}`, `L ${p(gg.R.kneeOut)}`, `L ${p(gg.R.hemOut)}`, `L ${p(gg.R.hemIn)}`, `L ${p(gg.R.kneeIn)}`, `L 80 ${gg.crotchY}`, `L ${p(gg.L.kneeIn)}`, `L ${p(gg.L.hemIn)}`, `L ${p(gg.L.hemOut)}`, `L ${p(gg.L.kneeOut)}`, `L ${p(gg.L.thighOut)}`, `Q ${gg.L.thighOut[0] - 1} ${gg.top + 22} ${80 - gg.Wh} ${gg.top}`, 'Z'].join(' ');
      ghost = `<path d="${gd}" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="3 3"/>`;
    }

    // 실측 강조선
    let hl = '';
    if (o.highlight) {
      const a = ACCENT;
      const tick = (x, y, vertical) => vertical ? `<line x1="${x - 4}" y1="${y}" x2="${x + 4}" y2="${y}" stroke="${a}" stroke-width="2"/>` : `<line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}" stroke="${a}" stroke-width="2"/>`;
      const lab = (x, y, t, anchor = 'start') => `<text x="${x}" y="${y}" fill="${a}" font-size="10" font-weight="700" text-anchor="${anchor}">${t}</text>`;
      if (o.highlight === 'length') {
        const x = Math.max(R.hemOut[0], R.thighOut[0]) + 9;
        hl = `<line x1="${x}" y1="${top}" x2="${x}" y2="${hemY}" stroke="${a}" stroke-width="2"/>${tick(x, top, true)}${tick(x, hemY, true)}<line x1="${80 + Wh}" y1="${top}" x2="${x}" y2="${top}" stroke="${a}" stroke-dasharray="2 2"/>`;
        hl += `<text x="${x - 4}" y="${(top + hemY) / 2}" fill="${a}" font-size="10" font-weight="700" text-anchor="middle" transform="rotate(-90 ${x - 4} ${(top + hemY) / 2})">총장</text>`;
      } else if (o.highlight === 'waist') {
        hl = `<line x1="${80 - Wh}" y1="${top - 6}" x2="${80 + Wh}" y2="${top - 6}" stroke="${a}" stroke-width="2"/>${tick(80 - Wh, top - 6)}${tick(80 + Wh, top - 6)}${lab(80, top - 9, '허리단면', 'middle')}`;
      } else if (o.highlight === 'rise') {
        hl = `<line x1="80" y1="${top}" x2="80" y2="${crotchY}" stroke="${a}" stroke-width="2.4"/>${tick(80, top, true)}${tick(80, crotchY, true)}<rect x="84" y="${(top + crotchY) / 2 - 8}" width="26" height="13" rx="3" fill="#fff" opacity="0.9"/>${lab(87, (top + crotchY) / 2 + 2, '밑위')}`;
      } else if (o.highlight === 'thigh') {
        const y = crotchY + 4;
        hl = `<line x1="81" y1="${y}" x2="${R.thighOut[0]}" y2="${y}" stroke="${a}" stroke-width="2.4"/>${tick(81, y)}${tick(R.thighOut[0], y)}${lab(R.thighOut[0] + 3, y + 3, '허벅지단면')}`;
      } else if (o.highlight === 'hem') {
        const y = hemY - 3;
        const x1 = Math.min(R.hemIn[0], R.hemOut[0]), x2 = Math.max(R.hemIn[0], R.hemOut[0]);
        hl = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${a}" stroke-width="2.4"/>${tick(x1, y)}${tick(x2, y)}${lab(x2 - 2, y - 8, '밑단단면', 'middle')}`;
      }
    }
    const vb = o.highlight === 'thigh' ? '0 0 190 200' : o.highlight === 'length' ? '0 0 170 200' : '0 0 160 200';
    return `<svg viewBox="${vb}" class="pants-svg" role="img" aria-label="${o.label || '바지 그림'}">${ghost}<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>${det.join('')}${hl}</svg>`;
  }

  function productImage(p, size) {
    const m = p.measures[size || 'M'];
    const det = [...p.details];
    if (p.type === 'denim') det.push('denim');
    if (p.type === 'slacks' && !det.includes('pintuck')) det.push('slacksCrease');
    if (p.material === 'linen') det.push('linen');
    if (p.material === 'brushed') det.push('brushed');
    if (p.length === 'crop') det.push('crop');
    if (p.length === 'long') det.push('long');
    return pants({ fit: p.fit, thigh: m.thigh, hem: m.hem, color: CL.COLORS[p.color].hex, details: det, label: p.fullName + ' 그림' });
  }

  function termIllustration(term) {
    const ill = term.ill;
    if (ill.kind === 'measure') return pants({ fit: 'straight', color: '#B9BCC2', highlight: ill.key, label: term.name + ' 재는 위치' });
    return pants({ fit: ill.fit, color: ill.color || '#7C8592', details: ill.details || [], ghost: ill.fit !== 'straight', label: term.name + ' 그림' });
  }

  /* ── 내 몸 기준 보기 ──
     키(H)에 대한 표준 비율로 사람 실루엣을 그리고, 실측을 겹친다.
     가랑이 높이 ≈ 0.45H, 무릎 ≈ 0.28H, 복숭아뼈 ≈ 0.045H (참고용 근사치) */
  function bodyFit(heightCm, m) {
    const H = heightCm;
    const crotch = 0.45 * H;
    const waistH = crotch + m.rise;
    const bottom = waistH - m.length;           // 바닥에서 밑단까지(cm)
    const ankle = 0.045 * H, knee = 0.28 * H;
    let lengthText, lengthTag;
    if (bottom >= knee - 4) { lengthText = '무릎 근처까지 오는 짧은 길이예요'; lengthTag = 'short'; }
    else if (bottom >= 0.16 * H) { lengthText = `종아리 중간까지 와요 (발목 위 약 ${Math.round(bottom - ankle)}cm)`; lengthTag = 'short'; }
    else if (bottom > ankle + 3) { lengthText = `발목 위 약 ${Math.round(bottom - ankle)}cm까지 와서 발목이 드러나요`; lengthTag = 'crop'; }
    else if (bottom >= ankle - 1.5) { lengthText = '복숭아뼈에 닿는 길이라 발목이 살짝 보여요'; lengthTag = 'ankle'; }
    else if (bottom > 1.5) { lengthText = '발목을 덮고 신발 위에 살짝 닿아요 (가장 무난한 길이)'; lengthTag = 'full'; }
    else { lengthText = '바닥에 닿을 만큼 길어요. 신발 위로 주름이 많이 지거나 끌릴 수 있어요'; lengthTag = 'long'; }
    const waistCirc = m.waist * 2;
    const inch = waistCirc / 2.54;
    let riseText;
    if (m.rise >= 31) riseText = '허리가 배꼽 근처까지 올라와요 (하이웨이스트)';
    else if (m.rise >= 28.5) riseText = '허리가 배꼽 조금 아래에 와요 (보통)';
    else riseText = '골반에 걸쳐 입는 낮은 허리예요';
    let thighText = m.thigh >= 33 ? '허벅지가 넉넉해요' : m.thigh >= 29.5 ? '허벅지 여유가 보통이에요' : '허벅지가 몸에 가깝게 맞아요';
    return { bottom, waistH, ankle, knee, crotch, lengthText, lengthTag, waistCirc, inch, riseText, thighText };
  }

  function bodyView(heightCm, m, colorHex) {
    const H = heightCm, f = bodyFit(H, m);
    const floorY = 372, k = 340 / H;              // cm → px
    const y = cm => floorY - cm * k;
    const cx = 92, s = H / 170;
    const hw = cm => cm * s * k;                  // 몸 너비 (키에 비례)
    const head = `<ellipse cx="${cx}" cy="${y(H - 11.5 * s)}" rx="${hw(8.2)}" ry="${hw(11.5)}" class="body"/>`;
    const neckY = y(0.865 * H), shY = y(0.82 * H), waY = y(0.6 * H), hipY = y(0.52 * H), crY = y(f.crotch);
    const knY = y(f.knee), anY = y(f.ankle);
    const torso = `<path class="body" d="M ${cx - hw(4)} ${neckY} L ${cx + hw(4)} ${neckY} L ${cx + hw(20)} ${shY + 4} L ${cx + hw(15)} ${waY} L ${cx + hw(17.5)} ${hipY} L ${cx + hw(16.5)} ${crY} L ${cx + hw(12.5)} ${knY} L ${cx + hw(10)} ${anY} L ${cx + hw(12.5)} ${floorY} L ${cx + hw(2)} ${floorY} L ${cx + hw(3.5)} ${anY} L ${cx + hw(3)} ${knY} L ${cx + hw(1)} ${crY} L ${cx - hw(1)} ${crY} L ${cx - hw(3)} ${knY} L ${cx - hw(3.5)} ${anY} L ${cx - hw(2)} ${floorY} L ${cx - hw(12.5)} ${floorY} L ${cx - hw(10)} ${anY} L ${cx - hw(12.5)} ${knY} L ${cx - hw(16.5)} ${crY} L ${cx - hw(17.5)} ${hipY} L ${cx - hw(15)} ${waY} L ${cx - hw(20)} ${shY + 4} Z"/>`;
    const arms = `<path class="body" d="M ${cx + hw(20)} ${shY + 4} L ${cx + hw(24)} ${y(0.62 * H)} L ${cx + hw(23)} ${y(0.5 * H)} L ${cx + hw(18.5)} ${y(0.5 * H)} L ${cx + hw(18)} ${y(0.62 * H)} Z M ${cx - hw(20)} ${shY + 4} L ${cx - hw(24)} ${y(0.62 * H)} L ${cx - hw(23)} ${y(0.5 * H)} L ${cx - hw(18.5)} ${y(0.5 * H)} L ${cx - hw(18)} ${y(0.62 * H)} Z"/>`;

    // 바지 겹치기
    const pTop = y(f.waistH);
    const bottomCm = Math.max(0, f.bottom);
    const pBot = y(bottomCm);
    // 단면(펼쳐서 잰 너비)을 몸 앞에서 보이는 너비로 환산: 둘레(단면×2) ÷ π × 약 1.05 ≈ 단면 × 0.67
    const FRONT = 0.67;
    const waistHalf = Math.max(m.waist * FRONT * k / 2, hw(14));
    const legW = Math.max(m.thigh * FRONT * k, hw(16));
    const hemW = Math.max(m.hem * FRONT * k, hw(8));
    const kneeW = Math.max((legW + hemW) / 2, hw(12));
    const kneeYp = Math.min(y(f.knee), pBot - 4);
    const crYp = y(f.crotch);
    const hipYp = Math.min(y(0.52 * H), crYp - 4);
    const hipHalf = Math.max(hw(18.5), waistHalf);
    const leg = sgn => {
      const inX = cx + sgn * 1;
      const outThigh = inX + sgn * legW;
      const c = inX + sgn * legW / 2;
      return [`${outThigh} ${crYp}`, `${c + sgn * kneeW / 2} ${kneeYp}`, `${c + sgn * hemW / 2} ${pBot}`, `${c - sgn * hemW / 2} ${pBot}`, `${c - sgn * kneeW / 2} ${kneeYp}`];
    };
    const R = leg(1), L = leg(-1);
    const pantsPath = `M ${cx - waistHalf} ${pTop} L ${cx + waistHalf} ${pTop} L ${cx + hipHalf} ${hipYp} L ${R[0]} L ${R[1]} L ${R[2]} L ${R[3]} L ${R[4]} L ${cx} ${crYp + 2} L ${L[4]} L ${L[3]} L ${L[2]} L ${L[1]} L ${L[0]} L ${cx - hipHalf} ${hipYp} Z`;
    const pantLine = shade(colorHex, isDark(colorHex) ? 60 : -60);
    const floorBunch = f.bottom < 1.5 ? `<path d="M ${cx - legW - 10} ${floorY - 2} q 6 -5 12 0 q 6 -5 12 0 M ${cx + legW - 14} ${floorY - 2} q 6 -5 12 0 q 6 -5 12 0" stroke="${pantLine}" fill="none" stroke-width="1.2"/>` : '';

    // 기준선과 라벨
    const lx = 158;
    const guide = (yy, label, strong, ty) => `<line x1="${cx - 48}" y1="${yy}" x2="${lx - 4}" y2="${yy}" class="${strong ? 'guide-strong' : 'guide'}"/><text x="${lx}" y="${(ty == null ? yy : ty) + 4}" class="${strong ? 'g-label-strong' : 'g-label'}">${label}</text>`;
    const bottomLabel = f.bottom < 1.5 ? '밑단: 바닥' : `밑단 ↑${Math.round(f.bottom)}cm`;
    // 라벨 겹침 방지: 밑단 라벨과 복숭아뼈 라벨이 가까우면 서로 위아래로 벌린다
    let ankleTy = y(f.ankle), botTy = pBot;
    if (Math.abs(ankleTy - botTy) < 13) {
      if (botTy >= ankleTy) { botTy = Math.min(floorY - 2, ankleTy + 13); ankleTy = botTy - 13; }
      else { ankleTy = Math.min(floorY - 2, botTy + 13); botTy = ankleTy - 13; }
    }
    return `<svg viewBox="0 0 250 380" class="body-svg" role="img" aria-label="키 ${H}cm 기준으로 바지를 입었을 때 모습. ${f.lengthText}">
      <line x1="20" y1="${floorY}" x2="240" y2="${floorY}" class="floor"/>
      ${arms}${torso}${head}
      <path d="${pantsPath}" fill="${colorHex}" fill-opacity="0.88" stroke="${pantLine}" stroke-width="1.2" stroke-linejoin="round"/>
      ${floorBunch}
      ${guide(y(f.knee), '무릎')}
      ${guide(y(f.ankle), '복숭아뼈', false, ankleTy)}
      ${guide(pTop, '허리선')}
      ${guide(pBot, bottomLabel, true, botTy)}
      <text x="20" y="16" class="g-label">키 ${H}cm</text>
      <line x1="14" y1="${y(H)}" x2="14" y2="${floorY}" class="guide"/>
    </svg>`;
  }

  /* 입문자 필터용 작은 실루엣 */
  /* 작은 아이콘에서는 핏 차이가 잘 보이도록 통 너비를 과장해서 그린다 */
  const ICON_FIT = { wide: [41, 38], semiwide: [36, 29], straight: [30, 25], slim: [25, 14], tapered: [35, 12], jogger: [34, 11] };
  function fitIcon(fitId) {
    const [thigh, hem] = ICON_FIT[fitId] || ICON_FIT.straight;
    const svg = pants({ fit: fitId, thigh, hem, color: '#6F7A88', details: fitId === 'jogger' ? ['jogger'] : [], label: fitId + ' 핏 그림' });
    return svg.replace(/viewBox="[^"]*"/, 'viewBox="22 6 116 192"');
  }

  CL.illus = { pants, productImage, termIllustration, bodyView, bodyFit, fitIcon };
})();
