/* ============================================================
 * crt.js — แบบทดสอบที่ 2: เวลาปฏิกิริยาแบบตัวเลือก (CRT)
 * port จาก Ex2ChoiceReactionTime.cs
 * - ซ้อม 3 → จริง 60 ครั้ง (สีเหลือง 20 / แดง 20 / น้ำเงิน 20 สุ่มลำดับ)
 * - "+" 500ms → วงกลมสี ≤700ms → จอดำ 1000ms
 * - น้ำเงิน = กด "/" | แดง = กด "Z" | เหลือง = ห้ามตอบ (no-go)
 * - Desktop: คีย์ Z และ / | Mobile: ปุ่มใหญ่สองปุ่ม
 * ============================================================ */
'use strict';

async function runCRT(stageEl, opts) {
  const PRACTICE_TRIALS = 3;
  const EXAM_TRIALS = 60;
  const INTERVAL_TIME = 500;
  const ELLIPSE_TIME = 700;
  const DARK_TIME = 1000;

  await new Promise((resolve) => {
    T.adviceScreen(T.clear(stageEl), {
      title: 'แบบทดสอบ <br> เวลาปฏิกิริยาแบบตัวเลือก (CRT)',
      desc: 'เมื่อ "＋" เปลี่ยนเป็นวงกลมสี ให้ตอบสนองตามสีของวงกลม',
      images: ['assets/advice/desc_02_02.png'],
      onDone: resolve
    });
  });

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  function runSet(nTrials, colorSeq) {
    return new Promise((resolveSet) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      const results = [];
      let trial = 0, phase = 'idle', t0 = 0;
      let timers = [];
      const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

      const COLORS = { B: '#1565C0', R: '#D32F2F', Y: '#F9A825' };
      const showPlus = () => { T.centerText(st, '<span class="fix-plus">+</span>'); };
      const showCircle = (c) => {
        const msg = st.querySelector('.center-msg');
        if (msg) msg.innerHTML = `<div class="rt-circle" style="background:${COLORS[c]}"></div>`;
      };
      const blackout = () => {
        const msg = st.querySelector('.center-msg');
        if (msg) msg.innerHTML = '';
      };

      const removeBtns = T.responseButtons(st, [
        { id: 'z', label: 'Z', hint: 'วงกลมแดง' },
        { id: '/', label: '/', hint: 'วงกลมน้ำเงิน' }
      ], (id) => press(id));

      function press(keyId) {
        if (phase !== 'plus' && phase !== 'ellipse') return;
        const t = T.now() - t0;
        const c = colorSeq[trial];
        const rec = { no: 0, rt: 0, ok: false, color: c };
        if (phase === 'ellipse') {
          rec.rt = Math.max(1, Math.round(t - INTERVAL_TIME));
          rec.ok =
            (c === 'B' && keyId === '/') ||
            (c === 'R' && keyId === 'z') ||
            (c === 'G');
        } else if (c === 'Y') {
          rec.ok = false; /* กดระหว่าง no-go = ผิด */
        }
        finish(rec);
      }

      function miss() {
        const c = colorSeq[trial];
        /* ไม่ตอบใน trial เหลือง = ถูกต้อง (ยับยั้งสำเร็จ) */
        finish({ no: 0, rt: 0, ok: c === 'Y', color: c });
      }

      function finish(rec) {
        if (phase === 'wait' || phase === 'idle') return;
        phase = 'wait';
        rec.no = trial + 1;              /* เลขครั้งจริงของ trial ที่เพิ่งจบ */
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

      /* เริ่ม trial ปัจจุบัน — label = "ครั้งที่ trial+1" */
      function schedule() {
        T.trialLabel(st, trial + 1, nTrials);
        T.progressBar(st, trial / nTrials);
        phase = 'plus';
        t0 = T.now();
        showPlus();
        timers.push(setTimeout(() => {
          if (phase !== 'plus') return;
          phase = 'ellipse';
          showCircle(colorSeq[trial]);
          timers.push(setTimeout(miss, ELLIPSE_TIME));
        }, INTERVAL_TIME));
      }

      T.centerText(st, nTrials === PRACTICE_TRIALS
        ? '<span class="mode-title">โหมดซ้อม</span>' +
          '<span class="mode-rules">' +
          '<span class="nw">🔵 น้ำเงิน → กด <b>/</b></span>' +
          '<span class="nw">🔴 แดง → กด <b>Z</b></span>' +
          '<span class="nw">🟡 เหลือง = <b>ห้ามกด</b></span>' +
          '</span>'
        : '<span class="mode-title">พร้อมเริ่ม</span>' +
          '<span class="mode-rules">' +
          '<span class="nw">🔵 น้ำเงิน → <span class="gold"><b>/</b></span></span>' +
          '<span class="nw">🔴 แดง → <span class="gold"><b>Z</b></span></span>' +
          '<span class="nw">🟡 เหลือง = ห้ามกด</span>' +
          '</span>');
      const box = T.el('div', 'start-box');
      const btn = T.el('button', 'btn btn-gold btn-lg', 'เริ่ม ▸');
      box.appendChild(btn);
      st.appendChild(box);
      btn.addEventListener('click', () => {
        box.remove();
        T.countdown(st, 3).then(() => {
          trial = 0;
          schedule();                    /* เริ่มที่ "ครั้งที่ 1" */
        });
      }, { once: true });
    });
  }

  /* สร้างลำดับสี: Y/R/B อย่างละ 20 สุ่มลำดับ (port InitRandomColor) */
  function makeColorSeq(n) {
    const seq = [];
    for (let i = 0; i < n; i++) seq.push(i % 3 === 0 ? 'Y' : i % 3 === 1 ? 'R' : 'B');
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    return seq;
  }

  /* ---- ซ้อม ---- */
  await runSet(PRACTICE_TRIALS, makeColorSeq(PRACTICE_TRIALS));
  await new Promise((resolve) => {
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      rows: [['กติกา', 'น้ำเงิน=/ · แดง=Z · เหลือง=ห้ามกด']],
      note: 'ผลการซ้อมไม่นับเข้าคะแนน',
      doneLabel: 'เริ่มทดสอบจริง (60 ครั้ง) ▸',
      onDone: resolve
    });
  });

  /* ---- จริง ---- */
  const examRes = await runSet(EXAM_TRIALS, makeColorSeq(EXAM_TRIALS));

  /* ---- สรุปผล (RT ms + accuracy เหมือนต้นฉบับ) ---- */
  const v = Scoring.compute({ crt: examRes });
  const okN = examRes.filter((r) => r.ok).length;
  const noGoN = examRes.filter((r) => r.color === 'Y').length;
  const noGoPass = examRes.filter((r) => r.color === 'Y' && r.ok).length;
  await new Promise((resolve) => {
    T.resultSummary(stageEl, {
      title: 'ผลการทดสอบ CRT',
      stats: [
        { label: 'เวลาตอบสนองเฉลี่ย (ไม่นับสีเหลือง)', value: Math.round(v.CRT_AvgMs), unit: 'ms' },
        { label: 'อัตราความถูกต้อง', value: Number(v.CRT_Acc).toFixed(1), unit: '%' },
        { label: 'ยับยั้งสำเร็จ (เหลืองไม่กด)', value: `${noGoPass}/${noGoN}`, unit: 'ครั้ง' },
        { label: 'ตอบถูกรวม', value: `${okN}/${EXAM_TRIALS}`, unit: 'ครั้ง' }
      ],
      chips: examRes.map((r, i) => ({
        text: [String(i + 1), r.rt > 0 ? String(r.rt) : '-',
               { B: 'น้ำ', R: 'แดง', Y: 'เหลือง', G: 'เขียว' }[r.color] || ''],
        ok: r.ok
      })),
      note: 'ตัวเลขในแถบ = ครั้งที่ / RT (ms) / สีที่ปรากฏ<br>ขาว=ถูกต้อง · แดง=ผิดหรือไม่ตอบ',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
  });

  await T.exitFullscreen();
  await T.keepAwake(false);

  return { crt: examRes };
}
