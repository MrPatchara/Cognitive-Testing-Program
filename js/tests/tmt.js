/* ============================================================
 * tmt.js — แบบทดสอบที่ 3-4: Trail Making Test (TMT-A / TMT-B)
 * port จาก Ex3TrailMakingA.cs / Ex4TrailMakingB.cs
 * - โหนดตำแหน่ง fix ตามต้นฉบับ (Practice3/4List) ย่อขยายตามจอ
 * - A: 1→25 | B: 1→A→2→B…13→L (สลับเลข-ตัวอักษร)
 * - แตะ/คลิกเชื่อมโหนดถัดไป (ลากผ่านไม่นับ) · ผิด = นับ error
 * - Desktop: คลิก | Mobile: แตะ
 * ============================================================ */
'use strict';

/* พิกัดต้นฉบับ (canvas 1920x1080, วง 40px) */
const TMT_A_LAYOUT = [
  ['1',268,825],['2',188,608],['3',376,773],['4',222,739],['5',248,584],
  ['6',132,779],['7',152,490],['8',440,460],['9',488,588],['10',370,688],
  ['11',540,784],['12',515,512],['13',280,493],['14',347,893],['15',566,645],
  ['16',188,530],['17',65,630],['18',372,556],['19',488,828],['20',117,661],
  ['21',108,875],['22',260,893],['23',567,856],['24',464,702],['25',120,442]
];
const TMT_B_LAYOUT = [
  ['1',102,779],['A',238,604],['2',292,904],['B',132,490],['3',238,825],
  ['C',438,588],['4',158,608],['D',306,793],['5',458,778],['E',87,661],
  ['6',78,875],['F',230,893],['7',510,856],['G',454,702],['8',60,475],
  ['H',182,739],['9',340,688],['I',419,914],['10',460,480],['J',250,473],
  ['11',356,812],['K',510,525],['12',340,489],['L',35,580],['13',342,576]
];

async function runTMT(stageEl, opts) {
  const signal = opts?.signal;
  const variant = opts && opts.variant === 'B' ? 'B' : 'A';
  const layout = variant === 'B' ? TMT_B_LAYOUT : TMT_A_LAYOUT;
  const title = variant === 'B'
    ? 'แบบทดสอบ <br> Trail Making B (TMT-B)'
    : 'แบบทดสอบ <br> Trail Making A (TMT-A)';
  const desc = variant === 'B'
    ? 'แตะเชื่อม<b>สลับ</b> เลข ↔ ตัวอักษร: 1 → A → 2 → B → …'
    : 'แตะเชื่อมตัวเลข <b>1 → 2 → 3 … → 25</b> ให้เร็วที่สุด';

  const adviceImgs = variant === 'B'
    ? ['assets/advice/desc_04_01.png']
    : ['assets/advice/desc_03_02.png'];

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.adviceScreen(T.clear(stageEl), { title, desc, images: adviceImgs, onDone: resolve });
    const abortAdvice = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortAdvice);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  /* ---------- สร้างบอร์ด ---------- */
  function buildBoard(st, nNodes) {
    const board = T.el('div', 'tmt-board');
    st.appendChild(board);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('tmt-svg');
    board.appendChild(svg);

    /* normalize พิกัด */
    const PAD = 30;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const [, top, left] of layout) {
      minX = Math.min(minX, left); minY = Math.min(minY, top);
      maxX = Math.max(maxX, left); maxY = Math.max(maxY, top);
    }
    const bw = board.clientWidth || board.parentElement.clientWidth;
    const bh = board.clientHeight || board.parentElement.clientHeight;
    const scale = Math.min((bw - PAD * 2) / (maxX - minX), (bh - PAD * 2) / (maxY - minY));
    const offX = (bw - (maxX - minX) * scale) / 2;
    const offY = (bh - (maxY - minY) * scale) / 2;

    const nodes = [];
    for (let i = 0; i < nNodes; i++) {
      const [letter, top, left] = layout[i];
      const x = offX + (left - minX) * scale;
      const y = offY + (top - minY) * scale;
      const d = T.el('button', 'tmt-node');
      d.textContent = letter;
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.dataset.idx = String(i);
      board.appendChild(d);
      nodes.push({ letter, x, y, el: d });
    }
    return { board, svg, svgNS, nodes };
  }

  /* ---------- รัน 1 รอบ ---------- */
  async function runSet(nNodes, label) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    return new Promise((resolveSet, rejectSet) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      T.centerText(st, label);
      const box = T.el('div', 'start-box');
      const btn = T.el('button', 'btn btn-gold btn-lg', 'เริ่ม ▸');
      box.appendChild(btn);
      st.appendChild(box);

      btn.addEventListener('click', () => {
        box.remove();
        const msg = st.querySelector('.center-msg');
        if (msg) msg.remove();
        const { board, svg, svgNS, nodes } = buildBoard(st, nNodes);
        let nextIdx = 0, errors = 0, done = false;
        const t0 = T.now();
        let lastPt = null;

        const line = (a, b, color) => {
          const ln = document.createElementNS(svgNS, 'line');
          ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
          ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
          ln.setAttribute('stroke', color || '#FFFFFF');
          ln.setAttribute('stroke-width', '4');
          ln.setAttribute('stroke-linecap', 'round');
          svg.appendChild(ln);
        };

        function finish() {
          if (done) return;
          done = true;
          const timeSec = (T.now() - t0) / 1000;
          T.vibrate([30, 50, 30]);
          setTimeout(() => resolveSet({ timeSec, errors }), 500);
        }

        function hit(i) {
          if (done) return;
          if (i === nextIdx) {
            const nd = nodes[i];
            nd.el.classList.add('hit');
            if (lastPt) line(lastPt, nd);
            lastPt = nd;
            nextIdx++;
            T.vibrate(12);
            if (nextIdx >= nNodes) finish();
          } else {
            errors++;
            T.vibrate([20, 30, 20]);
            const nd = nodes[i];
            nd.el.classList.add('err');
            setTimeout(() => nd.el.classList.remove('err'), 350);
          }
        }

        board.addEventListener('pointerdown', (e) => {
          const n = e.target.closest('.tmt-node');
          if (n) hit(Number(n.dataset.idx));
        });

        const abortHandler = () => {
          board.replaceWith(T.el('div'));
          T.clear(stageEl);
          rejectSet(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', abortHandler);
      }, { once: true });
    });
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ซ้อม 5 โหนดแรก ---- */
  await runSet(Math.min(5, layout.length),
    '<span class="mode-title">โหมดซ้อม</span>' +
    '<span class="mode-rules">' +
    `<span class="nw">เชื่อม ${variant === 'B' ? '1 → A → 2 → B → 3' : '1 → 2 → 3 → 4 → 5'}</span>` +
    '<span class="nw">(ไม่บันทึกผล)</span>' +
    '</span>');
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      rows: [['กติกา', variant === 'B' ? 'สลับเลข-ตัวอักษรจนครบ 25 จุด' : 'เรียงเลข 1 ถึง 25']],
      note: 'ผลการซ้อมไม่นับเข้าคะแนน — จับเวลาเมื่อแตะจุดแรก',
      doneLabel: 'เริ่มทดสอบจริง ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- จริง ---- */
  const res = await runSet(layout.length,
    variant === 'B' ? 'เชื่อม 1-A-2-B … 13-L ให้เร็วที่สุด' : 'เชื่อม 1 ถึง 25 ให้เร็วที่สุด');
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- สรุปผล ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: `ผลการทดสอบ TMT-${variant}`,
      stats: [
        { label: 'เวลาที่ใช้ทั้งหมด', value: res.timeSec.toFixed(2), unit: 'วินาที' },
        { label: 'จำนวนครั้งที่ผิดพลาด', value: res.errors, unit: 'ครั้ง' }
      ],
      note: 'เวลานับตั้งแต่กด Start จนเชื่อมครบโหนดสุดท้าย',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.exitFullscreen();
  await T.keepAwake(false);

  return variant === 'B'
    ? { tmtB: { timeSec: res.timeSec, errors: res.errors } }
    : { tmtA: { timeSec: res.timeSec, errors: res.errors } };
}