/* ============================================================
 * mrt.js — แบบทดสอบที่ 9: Mental Rotation (MRT)
 * port จาก Ex9MentalRotation.cs (ButtonEx09A-D = Rectangle ทับรูป
 * คำตอบ — กดที่รูปโดยตรง กรอบแดงเมื่อเลือก, ครบ 2 รูปไปข้อถัดไป)
 * - ซ้อม 3 ข้อ (exa_block_01-03.png · port Ex9MentalRotationTest.cs)
 *   → แสดงผลการซ้อม → ทดสอบจริง 25 ข้อ (mrt_block_01-25.png)
 * - เลือก "2 ใน 4" — ถูกต้อง = เลือกคู่ตรงเฉลย (ข้อ 1-24 มีเฉลย)
 * ============================================================ */
'use strict';

async function runMRT(stageEl, opts) {
  const signal = opts?.signal;
  const ITEMS = 25;
  /* เฉลยคู่ A-D (1=A … 4=D) — port จาก mtr_array */
  const KEYS = [
    [1,3],[1,4],[2,4],[2,3],[1,3],[1,4],[2,4],[2,3],[2,4],[1,4],
    [3,4],[2,3],[2,4],[2,4],[2,4],[1,4],[2,4],[2,3],[1,3],[1,4],
    [2,4],[2,3],[1,4],[1,3]
  ];
  /* เฉลยชุดซ้อม — port จาก Ex9MentalRotationTest.cs (CreateArray) */
  const PRACTICE_KEYS = [[2,3],[1,4],[1,3]];
  /* ภาพโจทย์ 1304x500 — ต้นแบบซ้าย ~x3-24% · ตัวเลือก A-D แถวขวา · แถบ y50-100%
     crop ด้วย background-size/position (%): sx,sy = 100/w,100/h · px,py = x0/(100-w) */
  const TARGET_CROP = { size: '476.19% 200%', pos: '3.80% 100%' };
  const OPT_CROP = [
    { size: '588.24% 200%', pos: '38.55% 100%' },  /* A x32 w17 */
    { size: '666.67% 200%', pos: '58.24% 100%' },  /* B x49.5 w15 */
    { size: '625.00% 200%', pos: '78.57% 100%' },  /* C x66 w16 */
    { size: '606.06% 200%', pos: '97.60% 100%' }   /* D x81.5 w16.5 */
  ];

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.adviceScreen(T.clear(stageEl), {
      title: 'แบบทดสอบ<br> Mental Rotation (MRT)',
      desc: 'แตะเลือก 2 รูปที่หมุนแล้วเหมือนต้นแบบ (2 ใน 4)',
      images: ['assets/advice/desc_09_02.png'],
      onDone: resolve
    });
    const abortAdvice = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortAdvice);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  async function runExam(count, getSrc, getKey, practice) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    return new Promise((resolveExam, rejectExam) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      st.classList.remove('stage-black');
      let cur = 0, score = 0;
      let picked = new Set();

      const wrap = T.el('div', 'mrt2-wrap');
      const head = T.el('div', 'mrt-head');
      const lbl = T.el('span', 'trial-label');
      const scoreLbl = T.el('span', 'mrt-score');
      head.append(lbl, scoreLbl);
      const target = T.el('div', 'mrt-target');
      target.appendChild(T.el('span', 'mrt-tag', 'ต้นแบบ'));
      const hint = T.el('div', 'mrt-hint', 'แตะเลือก 2 รูปที่หมุนแล้วเหมือนต้นแบบ');
      const ansRow = T.el('div', 'mrt-ans');
      const figs = [];
      for (let i = 1; i <= 4; i++) {
        const b = T.el('button', 'mrt-fig');
        b.dataset.v = String(i);
        b.setAttribute('aria-label', `รูป ${'ABCD'[i - 1]}`);
        b.appendChild(T.el('i', 'mrt-fig-letter', 'ABCD'[i - 1]));
        b.addEventListener('pointerdown', () => pick(i, b));
        ansRow.appendChild(b);
        figs.push(b);
      }
      wrap.append(head, target, hint, ansRow);
      st.appendChild(wrap);

      function show() {
        if (signal?.aborted) { rejectExam(new DOMException('Aborted', 'AbortError')); return; }
        picked = new Set();
        figs.forEach((b) => b.classList.remove('picked'));
        const url = `url("${getSrc(cur)}")`;
        target.style.backgroundImage = url;
        figs.forEach((b, i) => {
          b.style.backgroundImage = url;
          b.style.backgroundSize = OPT_CROP[i].size;
          b.style.backgroundPosition = OPT_CROP[i].pos;
        });
        lbl.textContent = practice
          ? `ซ้อม ข้อ ${cur + 1} / ${count} — เลือก 2 รูป`
          : `ข้อ ${cur + 1} / ${count} — เลือก 2 รูป`;
        scoreLbl.textContent = practice ? `โหมดซ้อม · คะแนน: ${score}` : `คะแนน: ${score}`;
      }

      function pick(v, btn) {
        if (picked.has(v)) {
          picked.delete(v);
          btn.classList.remove('picked');
          return;
        }
        picked.add(v);
        btn.classList.add('picked');
        T.vibrate(10);
        if (picked.size === 2) {
          const key = getKey(cur);
          if (key) {
            const [a, b] = key;
            const sel = [...picked].sort((x, y) => x - y);
            if (sel[0] === Math.min(a, b) && sel[1] === Math.max(a, b)) score++;
          }
          T.vibrate(25);
          cur++;
          if (cur >= count) {
            setTimeout(() => resolveExam(score), 350);
          } else {
            setTimeout(show, 250);
          }
        }
      }

      const abortHandler = () => {
        T.clear(stageEl);
        rejectExam(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abortHandler);

      show();
    });
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ซ้อม 3 ข้อ — port Ex9MentalRotationTest.cs ---- */
  const pScore = await runExam(
    PRACTICE_KEYS.length,
    (i) => `assets/exam09mrt/exa_block_${String(i + 1).padStart(2, '0')}.png`,
    (i) => PRACTICE_KEYS[i],
    true
  );
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ผลการซ้อม — ไม่นับเข้าคะแนน ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      stats: [
        { label: 'ตอบคู่ถูกต้อง', value: pScore, unit: `/${PRACTICE_KEYS.length}` }
      ],
      note: 'ผลการซ้อมไม่นับเข้าคะแนน — พร้อมเข้าสู่การทดสอบจริงเมื่อไรกดได้เลย',
      doneLabel: '▶ เริ่มทดสอบจริง (25 ข้อ)',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);

  /* ---- ทดสอบจริง ---- */
  const score = await runExam(
    ITEMS,
    (i) => `assets/exam09mrt/mrt_block_${String(i + 1).padStart(2, '0')}.png`,
    (i) => KEYS[i],
    false
  );
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- สรุปผล ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'ผลการทดสอบ MRT',
      stats: [
        { label: 'คะแนนที่ได้ (ตอบคู่ถูกต้อง)', value: score, unit: `/${KEYS.length}` }
      ],
      rows: [['จำนวนข้อ', `${ITEMS} ข้อ`], ['เฉลยที่ใช้ตรวจ', `${KEYS.length} ข้อ`]],
      note: 'ถูกต้อง = เลือกคู่ภาพหมุนตรงกับเฉลยในข้อนั้น ๆ',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.exitFullscreen();
  await T.keepAwake(false);

  return { mrt: score };
}