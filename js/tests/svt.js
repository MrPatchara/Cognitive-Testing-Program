/* ============================================================
 * svt.js — แบบทดสอบที่ 10: Spatial Visualization (SVT)
 * port จาก Ex10SpatialVisualization.cs
 * - ภาพโจทย์เต็มหน้า 1440x1080 (ตัวอย่างบน · ชิ้นคำถามกลาง · A-E ล่าง)
 * - ตอบโดยแตะ/คลิก "ที่รูปตัวเลือกโดยตรง" (crop จากภาพเดียว แบบ MRT)
 * - ซ้อม 3 ข้อ (svt001-003.jpg ไม่นับคะแนน) → ของจริง 30 ข้อ · 25 นาที
 * - เฉลยฝังในชื่อไฟล์ (svt01_b.jpg → B)
 * ============================================================ */
'use strict';

async function runSVT(stageEl, opts) {
  const signal = opts?.signal;
  const ITEMS = 30;
  const TIME_LIMIT = 1500; /* วินาที */

  /* ไฟล์ 30 ข้อ — เฉลย = ตัวอักษรท้ายชื่อไฟล์ (port CreateArray) */
  const FILES = [
    'svt01_b','svt02_a','svt03_a','svt04_d','svt05_b','svt06_c','svt07_e',
    'svt08_e','svt09_e','svt10_d','svt11_e','svt12_e','svt13_b','svt14_d',
    'svt15_c','svt16_e','svt17_a','svt18_a','svt19_b','svt20_b','svt21_a',
    'svt22_d','svt23_d','svt24_c','svt25_d','svt26_c','svt27_b','svt28_e',
    'svt29_c','svt30_e'
  ];

  /* crop ภาพ 1440x1080 ด้วย background-size/position (%)
     สูตร: size = 100/w, 100/h · pos = x0/(100-w), y0/(100-h)
     - ส่วนโจทย์ (ตัวอย่าง+เส้น+ชิ้นคำถาม): x15 w70 · y15 h42
     - ตัวเลือก A-E: กว้าง w15 ศูนย์กลาง x=20/35/50/65/80 · y58 h27 (มีตัวอักษรกำกับในภาพ) */
  const TARGET_CROP = { size: '142.857% 238.095%', pos: '50% 25.862%' };
  const OPT_X = [12.5, 27.5, 42.5, 57.5, 72.5];
  const OPT_CROP = OPT_X.map((x) => ({
    size: '666.667% 370.370%',
    pos: `${(x / (100 - 15) * 100).toFixed(3)}% 79.452%`
  }));

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- หน้าคำแนะนำ: รูปเดียว desc_10_02.png เต็มกรอบ ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.adviceScreen(T.clear(stageEl), {
      title: 'แบบทดสอบ<br> Spatial Visualization (SVT)',
      desc: 'ดูภาพด้านบนแล้วแตะรูปคำตอบด้านล่าง',
      images: ['assets/advice/desc_10_02.png'],
      startLabel: '▶ เริ่มซ้อม (3 ข้อ)', onDone: resolve
    });
    const abortAdvice = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortAdvice);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  async function runExam(count, srcOf, keyOf, practice) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    return new Promise((resolveExam, rejectExam) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      st.classList.remove('stage-black');
      let cur = 0, score = 0;
      let timeLeft = TIME_LIMIT;
      let finished = false, locked = false;

      const wrap = T.el('div', 'svt-wrap');
      const head = T.el('div', 'mrt-head');
      const lbl = T.el('span', 'trial-label');
      const clock = T.el('span', 'df-clock');
      head.append(lbl, clock);

      const target = T.el('div', 'svt-target');
      const hint = T.el('div', 'svt-hint',
        practice ? 'โหมดซ้อม — แตะรูปคำตอบ (A-E) ด้านล่าง' : 'แตะรูปคำตอบที่หมุนแล้วตรงกับชิ้นสีขาว');
      const ansRow = T.el('div', 'svt-ans');
      const figs = [];
      for (let i = 0; i < 5; i++) {
        const b = T.el('button', 'svt-fig');
        b.dataset.v = 'ABCDE'[i];
        b.setAttribute('aria-label', `ตัวเลือก ${'ABCDE'[i]}`);
        b.addEventListener('pointerdown', () => pick(i, b));
        ansRow.appendChild(b);
        figs.push(b);
      }
      wrap.append(head, target, hint, ansRow);
      st.appendChild(wrap);

      function show() {
        if (signal?.aborted) { rejectExam(new DOMException('Aborted', 'AbortError')); return; }
        locked = false;
        figs.forEach((b) => b.classList.remove('picked'));
        const src = srcOf(cur);
        const url = `url("${src}")`;
        target.style.backgroundImage = url;
        target.style.backgroundSize = TARGET_CROP.size;
        target.style.backgroundPosition = TARGET_CROP.pos;
        figs.forEach((b, i) => {
          b.style.backgroundImage = url;
          b.style.backgroundSize = OPT_CROP[i].size;
          b.style.backgroundPosition = OPT_CROP[i].pos;
        });
        lbl.textContent = `${practice ? 'ซ้อม ' : ''}ข้อ ${cur + 1} / ${count}`;
        clock.textContent = practice
          ? 'โหมดซ้อม'
          : `⏱ ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
        /* preload ข้างหน้า */
        for (let i = cur + 1; i <= Math.min(count - 1, cur + 2); i++) {
          const im = new Image();
          im.src = srcOf(i);
        }
      }

      function pick(i, btn) {
        if (finished || locked) return;
        locked = true;
        btn.classList.add('picked');
        T.vibrate(25);
        const key = keyOf(cur);
        if (key && key === 'ABCDE'[i]) score++;
        cur++;
        if (cur >= count) {
          finished = true;
          if (!practice) clearInterval(timerId);
          setTimeout(() => resolveExam(score), 350);
        } else {
          setTimeout(show, 220);
        }
      }

      let timerId = null;
      if (!practice) {
        timerId = setInterval(() => {
          timeLeft--;
          clock.textContent = `⏱ ${Math.floor(timeLeft / 60)}:${String(Math.max(0, timeLeft) % 60).padStart(2, '0')}`;
          if (timeLeft <= 30 && timeLeft > 0) T.vibrate(15);
          if (timeLeft <= 0 && !finished) {
            finished = true;
            clearInterval(timerId);
            resolveExam(score);
          }
        }, 1000);
      }

      const abortHandler = () => {
        if (timerId) clearInterval(timerId);
        T.clear(stageEl);
        rejectExam(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abortHandler);

      show();
    });
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ซ้อม 3 ข้อ (svt001-003) — ไม่นับคะแนน ---- */
  await runExam(
    3,
    (i) => `assets/exam10/svt00${i + 1}.jpg`,
    () => null,
    true
  );
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ผลการซ้อม ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      rows: [['จำนวนข้อซ้อม', '3 ข้อ']],
      note: 'การซ้อมไม่นับเข้าคะแนน — เมื่อพร้อมแล้วกดปุ่มด้านล่างเพื่อเริ่มทดสอบจริง',
      doneLabel: '▶ เริ่มทดสอบจริง (30 ข้อ · 25 นาที)',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);

  /* ---- ทดสอบจริง 30 ข้อ ---- */
  const score = await runExam(
    ITEMS,
    (i) => `assets/exam10/${FILES[i]}.jpg`,
    (i) => FILES[i].split('_')[1].toUpperCase(),
    false
  );
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- สรุปผล ---- */
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'ผลการทดสอบ SVT',
      stats: [
        { label: 'คะแนนที่ได้ (ตอบถูก)', value: score, unit: `/${ITEMS}` }
      ],
      note: 'ตอบถูก = เลือกชิ้นส่วนที่หมุนแล้วตรงกับภาพเป้าหมาย',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.exitFullscreen();
  await T.keepAwake(false);

  return { svt: score };
}