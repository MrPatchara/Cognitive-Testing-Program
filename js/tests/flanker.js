/* ============================================================
 * flanker.js — แบบทดสอบที่ 5: Flanker (FKT)
 * port จาก Ex5Flanker.cs
 * - ซ้อม 3 → จริง 40 ครั้ง (Incongruent/Congruent สุ่มไม่ซ้ำชุดละ 2)
 * - "+" 500ms → แถวลูกศร ≤700ms → จอดำ 1000ms
 * - ลูกศรกลางชี้ซ้าย = Z | ชี้ขวา = /
 * ============================================================ */
'use strict';

async function runFlanker(stageEl, opts) {
  const signal = opts?.signal;
  const PRACTICE_TRIALS = 3;
  const EXAM_TRIALS = 40;
  const INTERVAL_TIME = 500;
  const ELLIPSE_TIME = 700;
  const DARK_TIME = 1000;

  /* idx: 0 '>><>>' Incong-กลางซ้าย | 1 '<<><<' Incong-กลางขวา | 2 '<<<<<' Cong-ซ้าย | 3 '>>>>>' Cong-ขวา
     เก็บตัวอักษรดิบ '<' '>' — escape ตอน render (ห้าม split HTML entity) */
  const PATTERNS = [
    { p: '>><>>', type: 'Incongruent', dir: 'L' },
    { p: '<<><<', type: 'Incongruent', dir: 'R' },
    { p: '<<<<<', type: 'Congruent',   dir: 'L' },
    { p: '>>>>>', type: 'Congruent',   dir: 'R' }
  ];
  const arrowHtml = (ch) => ch === '<' ? '<' : '>';

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.adviceScreen(T.clear(stageEl), {
      title: 'แบบทดสอบ <br> Flanker (FKT)',
      desc:  'ให้มองและตอบเฉพาะ<b>ลูกศรตรงกลาง</b>เท่านั้น<br><br>',
      images: ['assets/advice/desc_05_02.png'],
      onDone: resolve
    });
    const abortAdvice = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortAdvice);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  function makeSeq(n) {
    const seq = [];
    let pool = [];
    for (let i = 0; i < n; i++) {
      if (!pool.length) pool = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      seq.push(pool.pop());
    }
    return seq;
  }

  async function runSet(nTrials) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    return new Promise((resolveSet, rejectSet) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      const seq = makeSeq(nTrials);
      const results = [];
      let trial = 0, phase = 'idle', t0 = 0;
      let timers = [];
      const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

      const showPlus = () => { T.centerText(st, '<span class="fix-plus">+</span>'); };
      const showArrows = (idx) => {
        const p = PATTERNS[idx];
        const html = '<div class="flanker-row">' + [...p.p].map((ch) =>
          `<span class="flanker-arrow">${arrowHtml(ch)}</span>`).join('') + '</div>';
        const msg = st.querySelector('.center-msg');
        if (msg) msg.innerHTML = html;
      };
      const blackout = () => {
        const msg = st.querySelector('.center-msg');
        if (msg) msg.innerHTML = '';
      };

      const removeBtns = T.responseButtons(st, [
        { id: 'z', label: 'Z ◀', hint: 'ลูกศรกลางชี้ซ้าย' },
        { id: '/', label: '/ ▶', hint: 'ลูกศรกลางชี้ขวา' }
      ], (id) => press(id));

      function press(keyId) {
        if (phase !== 'plus' && phase !== 'ellipse') return;
        const t = T.now() - t0;
        const p = PATTERNS[seq[trial]];
        const rec = { no: 0, rt: 0, ok: false, type: p.type };
        if (phase === 'ellipse') {
          rec.rt = Math.max(1, Math.round(t - INTERVAL_TIME));
          rec.ok = (p.dir === 'L' && keyId === 'z') || (p.dir === 'R' && keyId === '/');
        }
        finish(rec);
      }

      function miss() {
        finish({ no: 0, rt: 0, ok: false, type: PATTERNS[seq[trial]].type });
      }

      function finish(rec) {
        if (phase === 'wait' || phase === 'idle') return;
        phase = 'wait';
        rec.no = trial + 1;
        clearTimers();
        results.push(rec);
        blackout();
        T.progressBar(st, (trial + 1) / nTrials);
        T.vibrate(rec.ok ? 20 : [15, 40, 15]);
        setTimeout(() => {
          trial++;
          if (trial >= nTrials) {
            removeBtns();
            T.clearKeys();
            return resolveSet(results);
          }
          schedule();
        }, DARK_TIME);
      }

      function schedule() {
        if (signal?.aborted) { rejectSet(new DOMException('Aborted', 'AbortError')); return; }
        T.trialLabel(st, trial + 1, nTrials);
        T.progressBar(st, trial / nTrials);
        phase = 'plus';
        t0 = T.now();
        showPlus();
        timers.push(setTimeout(() => {
          if (phase !== 'plus') return;
          phase = 'ellipse';
          showArrows(seq[trial]);
          timers.push(setTimeout(miss, ELLIPSE_TIME));
        }, INTERVAL_TIME));
      }

      const abortHandler = () => {
        clearTimers();
        removeBtns();
        T.clearKeys();
        T.clear(stageEl);
        rejectSet(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abortHandler);

      T.centerText(st, nTrials === PRACTICE_TRIALS
        ? '<span class="mode-title">โหมดซ้อม</span>' +
          '<span class="mode-rules">' +
          '<span class="nw">มองลูกศร<b>ตัวกลาง</b>เท่านั้น</span>' +
          '<span class="nw">ชี้ซ้าย ← กด <b>Z</b></span>' +
          '<span class="nw">ชี้ขวา → กด <b>/</b></span>' +
          '</span>'
        : '<span class="mode-title">พร้อมเริ่ม</span>' +
          '<span class="mode-rules">' +
          '<span class="nw">ตอบตาม<b>ลูกศรตัวกลาง</b></span>' +
          '<span class="nw">ชี้ซ้าย ← <span class="gold"><b>Z</b></span></span>' +
          '<span class="nw">ชี้ขวา → <span class="gold"><b>/</b></span></span>' +
          '</span>');
      const box = T.el('div', 'start-box');
      const btn = T.el('button', 'btn btn-gold btn-lg', 'เริ่ม ▸');
      box.appendChild(btn);
      st.appendChild(box);
      btn.addEventListener('click', () => {
        box.remove();
        T.countdown(st, 3).then(() => {
          trial = 0;
          schedule();
        });
      }, { once: true });
    });
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- ซ้อม ---- */
  await runSet(PRACTICE_TRIALS);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      rows: [['กติกา', 'กลางชี้ซ้าย = Z · กลางชี้ขวา = /']],
      note: 'ผลการซ้อมไม่นับเข้าคะแนน',
      doneLabel: 'เริ่มทดสอบจริง (40 ครั้ง) ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- จริง ---- */
  const examRes = await runSet(EXAM_TRIALS);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  /* ---- สรุปผล (RT ms + accuracy เหมือนต้นฉบับ) ---- */
  const v = Scoring.compute({ flanker: examRes });
  const fmtMs = (x) => x == null ? '-' : String(Math.round(x));
  const fmtPc = (x) => x == null ? '-' : Number(x).toFixed(1) + '%';
  await new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    T.resultSummary(stageEl, {
      title: 'ผลการทดสอบ Flanker',
      stats: [
        { label: 'Congruent — เวลาตอบสนอง', value: fmtMs(v.FLK_Cong_RT), unit: 'ms' },
        { label: 'Congruent — ถูกต้อง', value: fmtPc(v.FLK_Cong_Acc), unit: '' },
        { label: 'Incongruent — เวลาตอบสนอง', value: fmtMs(v.FLK_Incong_RT), unit: 'ms' },
        { label: 'Incongruent — ถูกต้อง', value: fmtPc(v.FLK_Incong_Acc), unit: '' },
        { label: 'Interference (ผลจากการรบกวน)', value: v.FLK_Interference == null ? '-' : Math.round(v.FLK_Interference), unit: 'ms' }
      ],
      chips: examRes.map((r, i) => ({
        text: [String(i + 1), r.rt > 0 ? String(r.rt) : '-', r.type === 'Congruent' ? 'C' : 'I'],
        ok: r.ok
      })),
      note: 'ตัวเลขในแถบ = ครั้งที่ / RT (ms) / ชนิด (C=Congruent, I=Incongruent)<br>ขาว=ถูกต้อง · แดง=ผิดหรือไม่ตอบ',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
    const abortSummary = () => { T.clear(stageEl); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abortSummary);
  });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await T.exitFullscreen();
  await T.keepAwake(false);

  return { flanker: examRes };
}