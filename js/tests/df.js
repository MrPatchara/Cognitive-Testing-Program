/* ============================================================
 * df.js — แบบทดสอบที่ 6-8: Design Fluency (DFT)
 * port จาก Ex6/Ex7/Ex8TabExam.cs + Ex6/Ex7/Ex8DesignObject.cs
 * - ซ้อม 2 ช่อง (ไม่บันทึกผล) → จริง 24 หน้า × 2 ช่อง = 48 ช่อง
 *   (= ต้นฉบับ 12 ช่อง × 4 หน้า · exam C01-C02 ต่อหน้า)
 * - Filled:    จุดทึบ 5 จุด — คลิกเชื่อมครบ 5 พอดี
 * - Empty:     10 จุด (โปร่ง 1-5 เป้าหมาย / ทึบ 6-10 รบกวน)
 *              คลิกจุดทึบ (เลข >5) = ไม่นับ (Ex7DesignObject missKeyPress)
 * - Switching: 10 จุด (คี่ทึบ / คู่โปร่ง) — เส้นเชื่อมต้องสลับ
 *              คี่ ↔ คู่ ทุกคู่: (a+b)%2 != 1 = ไม่นับ (Ex8DesignObject)
 * - ทุกแบบ: คลิก != 5 ครั้ง = ไม่นับ · เส้นค้างไว้เหมือน WPF Line
 * - รูปซ้ำ = ชุดเส้น (edge pattern) sort แล้วตรงรูปก่อนหน้า
 *   (SetPattern: filled/empty 10 คู่ภายใน 1-5 · switching 25 คู่คี่-คู่)
 * ============================================================ */
'use strict';

/* ผังจุดรายแบบ — พิกัด Left/Top ตรงจาก PracticeGetList ของต้นฉบับ
   f: 1 = ทึบดำ · 0 = โปร่ง (W/H = กรอบ MiniCanvas px) */
const DF_DOT_SETS = {
  filled: {
    W: 194, H: 140,
    dots: [
      { l: 106, t: 5,   f: 1 }, { l: 174, t: 72,  f: 1 }, { l: 129, t: 120, f: 1 },
      { l: 55,  t: 105, f: 1 }, { l: 11,  t: 45,  f: 1 }
    ]
  },
  empty: {
    W: 188, H: 136,
    dots: [
      { l: 102, t: 110, f: 0 }, { l: 160, t: 65,  f: 0 }, { l: 122, t: 38,  f: 0 },
      { l: 20,  t: 14,  f: 0 }, { l: 10,  t: 98,  f: 0 },
      { l: 64,  t: 116, f: 1 }, { l: 168, t: 110, f: 1 }, { l: 165, t: 17,  f: 1 },
      { l: 92,  t: 10,  f: 1 }, { l: 40,  t: 60,  f: 1 }
    ]
  },
  switching: {
    W: 187, H: 140,
    dots: [
      { l: 22,  t: 9,   f: 1 }, { l: 47,  t: 53,  f: 0 }, { l: 82,  t: 7,   f: 1 },
      { l: 144, t: 5,   f: 0 }, { l: 167, t: 36,  f: 1 }, { l: 110, t: 62,  f: 0 },
      { l: 159, t: 97,  f: 1 }, { l: 116, t: 120, f: 0 }, { l: 59,  t: 119, f: 1 },
      { l: 11,  t: 96,  f: 0 }
    ]
  }
};
/* แปลงเป็นจุดศูนย์กลาง % (จุด 20px) */
for (const set of Object.values(DF_DOT_SETS)) {
  set.dots.forEach((d, i) => {
    d.n = i + 1;
    d.cx = (d.l + 10) / set.W * 100;
    d.cy = (d.t + 10) / set.H * 100;
  });
}

/* รหัสเส้น SetPattern ต้นฉบับ */
const DF_CODE_15 = (() => {           /* filled/empty: คู่ภายในจุด 1-5 -> 1-10 */
  const m = {};
  let n = 1;
  for (let a = 1; a <= 4; a++) for (let b = a + 1; b <= 5; b++) m[`${a}:${b}`] = n++;
  return m;
})();
const DF_CODE_SW = {                  /* switching: คู่คี่-คู่ 1-10 -> 1-25 */
  '1:2': 1, '1:4': 2, '1:6': 3, '1:8': 4, '1:10': 5,
  '2:3': 6, '3:4': 7, '3:6': 8, '3:8': 9, '3:10': 10,
  '2:5': 11, '4:5': 12, '5:6': 13, '5:8': 14, '5:10': 15,
  '2:7': 16, '4:7': 17, '6:7': 18, '7:8': 19, '7:10': 20,
  '2:9': 21, '4:9': 22, '6:9': 23, '8:9': 24, '9:10': 25
};
const DF_CELLS_PER_PAGE = 2;
const DF_PAGES = 24;            /* 2 x 24 = 48 ช่อง = 12 x 4 ของต้นฉบับ */
const DF_PRACTICE_LIMIT = 30;   /* วินาที */

async function runDF(stageEl, opts) {
  const signal = opts?.signal;
  const variant = (opts && opts.variant) || 'filled'; // filled | empty | switching
  const TIME_LIMIT = 60;
  const SET = DF_DOT_SETS[variant];
  const CODES = variant === 'switching' ? DF_CODE_SW : DF_CODE_15;

  const META = {
    filled:    { title: 'แบบทดสอบ <br> Design Fluency: Filled Dots',
                 short: 'Design Fluency:Filled Dots',
                 desc: 'คลิกเชื่อมจุดสีทึบ 5 จุด เป็นรูปใหม่ ๆ ที่ไม่ซ้ำกัน',
                 imgs: ['assets/advice/desc_06_03.png'] },
    empty:     { title: 'แบบทดสอบ <br> Design Fluency: Empty Dots',
                 short: 'Design Fluency: Empty Dots',
                 desc: 'คลิกเชื่อมเฉพาะจุดสีโปร่ง 5 จุด <br>(คลิกโดนจุดสีทึบ = รูปนั้นไม่นับ)',
                 imgs: ['assets/advice/desc_07_01.png'] },
    switching: { title: 'แบบทดสอบ <br> Design Fluency: Switching Dots',
                 short: 'Design Fluency: สลับจุดทึบ-โปร่ง (Switching Dots)',
                 desc: 'คลิกเชื่อม 5 จุด สลับ ทึบ ↔ โปร่ง <br>(เชื่อมจุดชนิดเดียวกันติดกัน = รูปนั้นไม่นับ)',
                 imgs: ['assets/advice/desc_08_01.png'] }
  }[variant];

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.adviceScreen(T.clear(stageEl), {
      title: META.title, desc: META.desc, images: META.imgs,
      startLabel: '▶ เริ่มการซ้อม', onDone: resolve
    });
    const abortAdvice = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortAdvice);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  /* ---------- รัน 1 รอบ ---------- */
  async function runSet({ cells, limitSec, practice }) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    return new Promise((resolveSet, rejectSet) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      const svgNS = 'http://www.w3.org/2000/svg';
      const pages = Math.ceil(cells / DF_CELLS_PER_PAGE);

      let page = 0, timeLeft = limitSec, finished = false;
      /* สถานะทุกช่องคงอยู่แม้สลับหน้า (เหมือน TabControl ต้นฉบับ) */
      const designs = Array.from({ length: cells },
        () => ({ clicks: [], invalid: false }));
      let cellRefs = [];   /* [{cell, svg}] ของหน้าปัจจุบัน */

      /* header */
      const hud = T.el('div', 'df-hud');
      const clock = T.el('span', 'df-clock');
      const scoreLbl = T.el('span', 'df-score');
      hud.append(clock, scoreLbl);
      st.appendChild(hud);

      /* grid ช่องย่อย */
      const grid = T.el('div', 'df-grid');
      st.appendChild(grid);

      /* nav สลับหน้า — แสดงทุกโหมด (รวมซ้อม) · วนได้เหมือนปุ่ม Next ต้นฉบับ */
      const nav = T.el('div', 'df-nav');
      const prevBtn = T.el('button', 'btn btn-secondary', '‹ หน้าก่อน');
      const pageLbl = T.el('span', 'df-page');
      const nextBtn = T.el('button', 'btn btn-secondary', 'หน้าถัดไป ›');
      nav.append(prevBtn, pageLbl, nextBtn);
      st.appendChild(nav);
      prevBtn.addEventListener('click', () => { page = (page + pages - 1) % pages; renderPage(); });
      nextBtn.addEventListener('click', () => { page = (page + 1) % pages; renderPage(); });

      function addLine(svg, a, b) {
        const ln = document.createElementNS(svgNS, 'line');
        ln.setAttribute('x1', SET.dots[a].cx + '%');
        ln.setAttribute('y1', SET.dots[a].cy + '%');
        ln.setAttribute('x2', SET.dots[b].cx + '%');
        ln.setAttribute('y2', SET.dots[b].cy + '%');
        ln.setAttribute('stroke', '#111');
        ln.setAttribute('stroke-width', '3');
        ln.setAttribute('stroke-linecap', 'round');
        svg.appendChild(ln);
      }

      function redrawCell(design, svg) {
        svg.innerHTML = '';
        for (let i = 1; i < design.clicks.length; i++) {
          addLine(svg, design.clicks[i - 1] - 1, design.clicks[i] - 1);
        }
      }

      function renderPage() {
        cellRefs.forEach((r) => r.cell.remove());
        cellRefs = [];
        pageLbl.textContent = `หน้า ${page + 1} / ${pages}`;
        const inPage = Math.min(DF_CELLS_PER_PAGE, cells - page * DF_CELLS_PER_PAGE);
        for (let c = 0; c < inPage; c++) {
          const abs = page * DF_CELLS_PER_PAGE + c;
          const design = designs[abs];
          const cell = T.el('div', 'df-cell');
          const svg = document.createElementNS(svgNS, 'svg');
          svg.classList.add('df-csvg');
          cell.appendChild(svg);
          SET.dots.forEach((p) => {
            const b = T.el('button', 'df-dot5' + (p.f ? ' is-filled' : ''));
            b.style.left = p.cx + '%';
            b.style.top = p.cy + '%';
            b.setAttribute('aria-label', `จุด ${p.n}`);
            b.addEventListener('pointerdown', () => tapDot(design, cell, svg, p.n));
            cell.appendChild(b);
          });
          if (design.invalid) cell.classList.add('is-invalid');
          redrawCell(design, svg);
          grid.appendChild(cell);
          cellRefs.push({ cell, svg });
        }
      }

      /* คลิกจุด — กฎตาม Ex6/Ex7/Ex8DesignObject ต้นฉบับ:
         ทุกคลิกเพิ่ม numberOfClick · ครบ 5 พอดี = accuracy · เกิน = false
         Empty: คลิกจุดเลข >5 = missKeyPress · Switching: เส้นไม่สลับคี่-คู่ = missKeyPress */
      function tapDot(design, cell, svg, n) {
        if (finished || design.invalid) return;
        const prev = design.clicks[design.clicks.length - 1];
        const badPair = variant === 'switching' && prev != null && (prev + n) % 2 !== 1;
        const wrongDot = variant === 'empty' && n > 5;
        design.clicks.push(n);
        if (!badPair && !wrongDot && design.clicks.length === 6) {
          design.invalid = true;                       /* เกิน 5 คลิก */
        } else if (badPair || wrongDot) {
          design.invalid = true;                       /* ผิดกฎเฉพาะแบบ */
        }
        T.vibrate(design.invalid ? [20, 30, 20] : 8);
        if (design.invalid) cell.classList.add('is-invalid');
        redrawCell(design, svg);
        updateHud();
        maybeFinish();
      }

      function completedCount() {
        return designs.filter((d) => !d.invalid && d.clicks.length === 5).length;
      }

      function updateHud() {
        clock.textContent = `⏱ ${timeLeft} วินาที`;
        scoreLbl.textContent = practice
          ? 'โหมดซ้อม · ไม่บันทึกผล'
          : `ครบ 5 จุด: ${completedCount()}/${cells}`;
      }

      function maybeFinish() {
        if (finished) return;
        const allSpoiled = designs.length > 0 && designs.every((d) => d.invalid);
        if (timeLeft <= 0 || (practice && (completedCount() >= 1 || allSpoiled))) {
          finished = true;
          clearInterval(timerId);
          T.vibrate(40);
          resolveSet(computeScores());
        }
      }

      /* คะแนนตาม Calulate_Dots(): เฉพาะช่อง activate ที่ผ่านกฎ
         คลิก != 5 = miss · รูปซ้ำ = ชุด edge-code (sort แล้ว) ตรงรูปก่อนหน้า */
      function computeScores() {
        const seen = new Set();
        let valid = 0, dup = 0, bad = 0;
        for (const d of designs) {
          if (!d.clicks.length) continue;
          if (d.invalid || d.clicks.length !== 5) { bad++; continue; }
          const codes = [];
          for (let i = 0; i < 4; i++) {
            const [a, b] = [d.clicks[i], d.clicks[i + 1]].sort((x, y) => x - y);
            codes.push(CODES[`${a}:${b}`] || 0);
          }
          codes.sort((x, y) => x - y);
          const key = codes.join('_');
          if (seen.has(key)) dup++;
          else { seen.add(key); valid++; }
        }
        return { valid, dup, bad };
      }

      renderPage();
      updateHud();

      const timerId = setInterval(() => {
        timeLeft--;
        updateHud();
        if (timeLeft <= 5 && timeLeft > 0 && !finished) T.vibrate(15);
        maybeFinish();
      }, 1000);

      const abortHandler = () => {
        clearInterval(timerId);
        cellRefs.forEach((r) => r.cell.remove());
        cellRefs = [];
        grid.innerHTML = '';
        T.clear(stageEl);
        rejectSet(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abortHandler);
    });
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ซ้อม 2 ช่อง — จบเมื่อทำรูปครบ 5 จุดได้ 1 รูป (หรือหมดเวลา) ---- */
  await runSet({ cells: DF_CELLS_PER_PAGE, limitSec: DF_PRACTICE_LIMIT, practice: true });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      rows: [
        ['กติกา', variant === 'filled'
          ? 'คลิกเชื่อมจุดในช่องให้ครบ 5 จุดพอดี'
          : variant === 'empty'
            ? 'คลิกเฉพาะจุดสีโปร่ง ให้ครบ 5 จุดพอดี'
            : 'เชื่อม 5 จุด โดยเส้นทุกเส้นสลับ ทึบ ↔ โปร่ง'],
        ['รูปซ้ำ', 'ชุดเส้นเหมือนรูปที่วาดไว้ก่อน = ไม่นับ']
      ],
      note: 'ผลการซ้อมไม่นับเข้าคะแนน',
      doneLabel: 'เริ่มทดสอบจริง (48 ช่อง) ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- จริง: 24 หน้า x 2 ช่อง ---- */
  const res = await runSet({
    cells: DF_PAGES * DF_CELLS_PER_PAGE,
    limitSec: TIME_LIMIT,
    practice: false
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- สรุปผล ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: `ผลการทดสอบ ${META.short}`,
      stats: [
        { label: 'จำนวนรูปที่ถูกต้อง', value: res.valid, unit: 'รูป' },
        { label: 'รูปซ้ำ/ผิดกฎ (ไม่นับ)', value: res.dup + res.bad, unit: 'รูป' }
      ],
      rows: [['เวลา', `${TIME_LIMIT} วินาที`], ['หน้าทั้งหมด', DF_PAGES]],
      note: variant === 'filled'
        ? 'นับเฉพาะช่องที่คลิกครบ 5 จุดพอดี และรูป (ชุดเส้น) ไม่ซ้ำกับที่ออกแบบไว้ก่อนหน้า'
        : variant === 'empty'
          ? 'นับเฉพาะรูปที่คลิกจุดโปร่งครบ 5 จุดพอดี (ไม่โดนจุดทึบ) และไม่ซ้ำรูปเดิม'
          : 'นับเฉพาะรูปที่เส้นทุกเส้นสลับ ทึบ-โปร่ง ครบ 5 จุดพอดี และไม่ซ้ำรูปเดิม',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
    signal?.addEventListener('abort', () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); });
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.exitFullscreen();
  await T.keepAwake(false);

  const keyMap = { filled: 'dfFilled', empty: 'dfEmpty', switching: 'dfSwitching' };
  return { [keyMap[variant]]: res.valid, didDF: true };
}