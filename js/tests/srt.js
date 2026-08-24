/* ============================================================
 * srt.js — แบบทดสอบที่ 1: เวลาปฏิกิริยาอย่างง่าย (SRT)
 * port จาก Ex1SimpleReactionTime.cs
 * - ซ้อม 3 ครั้ง → ทดสอบจริง 20 ครั้ง
 * - interval สุ่มไม่ซ้ำจาก {500,1000,1500,2000} ms
 * - "+" → วงกลมแดง (สูงสุด 10 วินาที) → ตอบ → จอดำ 1 วินาที
 * - Desktop: คีย์ "/" | Mobile: แตะปุ่มใหญ่ / แตะทั่วจอ
 * ============================================================ */
'use strict';

async function runSRT(stageEl, opts) {
  const PRACTICE_TRIALS = 3;
  const EXAM_TRIALS = 20;
  const ELLIPSE_TIME = 10000;
  const DARK_TIME = 1000;

  /* ---- จอคำแนะนำ ---- */
  await new Promise((resolve) => {
    T.adviceScreen(T.clear(stageEl), {
      title: 'แบบทดสอบ <br> เวลาปฏิกิริยาอย่างง่าย (SRT)',
      desc: 'เมื่อ "＋" เปลี่ยนเป็นวงกลมสีแดง ให้ตอบสนองโดยเร็วที่สุด<br> กดคีย์ "/" หรือแตะกลางหน้าจอ',
      images: ['assets/advice/desc_01_02.png'],
      onDone: resolve
    });
  });

  await T.keepAwake(true);
  try { await T.enterFullscreen(); } catch (e) {}

  /* ---- ฟังก์ชันรันชุด trials ---- */
  function runSet(nTrials) {
    return new Promise((resolveSet) => {
      T.clearKeys();
      const st = T.stage(stageEl);
      const intervals = [];
      const refill = () => intervals.push(500, 1000, 1500, 2000);
      refill();
      const nextInterval = () => {
        if (!intervals.length) refill();
        return intervals.splice(Math.floor(Math.random() * intervals.length), 1)[0];
      };

      const results = [];
      let trial = 0, phase = 'idle', t0 = 0, interval = 0;
      let timers = [];

      const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
      const showPlus = () => { T.centerText(st, '<span class="fix-plus">+</span>'); };
      const showEllipse = () => {
        const msg = st.querySelector('.center-msg');
        if (msg) msg.innerHTML = '<div class="rt-circle"></div>';
      };
      const blackout = () => {
        const msg = st.querySelector('.center-msg');
        if (msg) msg.innerHTML = '';
      };

      const removeBtns = T.responseButtons(st, [
        { id: '/', label: '/', hint: 'ตอบสนอง' }
      ], () => press());
      st.addEventListener('pointerdown', stagePress);

      function stagePress(e) {
        if (e.target.closest('.resp-bar') || e.target.closest('.test-progress')) return;
        press();
      }

      async function press() {
        if (phase !== 'plus' && phase !== 'ellipse') return;
        const t = T.now() - t0;
        const rec = { no: 0, rt: 0, ok: false };
        if (phase === 'ellipse') { rec.ok = true; rec.rt = Math.max(1, Math.round(t - interval)); }
        finish(rec);
      }

      function miss() { finish({ no: 0, rt: 0, ok: false }); }

      function finish(rec) {
        if (phase === 'wait' || phase === 'idle') return;
        phase = 'wait';
        rec.no = trial + 1;              /* เลขครั้งจริงของ trial ที่เพิ่งจบ */
        clearTimers();
        results.push(rec);
        blackout();
        T.progressBar(st, (trial + 1) / nTrials);
        T.vibrate(rec.ok ? 25 : [15, 40, 15]);
        setTimeout(() => {
          trial++;
          if (trial >= nTrials) {
            st.removeEventListener('pointerdown', stagePress);
            removeBtns();
            T.clearKeys();
            return resolveSet(results);
          }
          schedule();
        }, DARK_TIME);
      }

      /* เริ่ม trial ปัจจุบัน (trial แบบ 0-based) — label = "ครั้งที่ trial+1" */
      function schedule() {
        T.trialLabel(st, trial + 1, nTrials);
        T.progressBar(st, trial / nTrials);
        phase = 'plus';
        interval = nextInterval();
        t0 = T.now();
        showPlus();
        timers.push(setTimeout(() => {
          if (phase !== 'plus') return;
          phase = 'ellipse';
          showEllipse();
          timers.push(setTimeout(miss, ELLIPSE_TIME));
        }, interval));
      }

      /* เริ่มชุดนี้ */
      T.centerText(st, nTrials === PRACTICE_TRIALS
        ? 'โหมดซ้อม — เมื่อเห็นวงกลมแดง ให้ตอบสนองทันที'
        : 'พร้อมเริ่ม — ตอบสนองเมื่อเห็น<span class="gold">วงกลมแดง</span>');
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

  /* ---- ซ้อม ---- */
  const practiceRes = await runSet(PRACTICE_TRIALS);
  const pOk = practiceRes.filter(r => r.ok).length;
  await new Promise((resolve) => {
    T.resultSummary(stageEl, {
      title: 'จบการซ้อม',
      rows: [['ตอบถูกจังหวะ', `${pOk} / ${PRACTICE_TRIALS}`]],
      note: 'ผลการซ้อมไม่นับเข้าคะแนน — พร้อมเข้าสู่การทดสอบจริงเมื่อไรกดได้เลย',
      doneLabel: 'เริ่มทดสอบจริง (20 ครั้ง) ▸',
      onDone: resolve
    });
  });

  /* ---- ทดสอบจริง ---- */
  const examRes = await runSet(EXAM_TRIALS);

  /* ---- สรุปผล (RT ms + accuracy เหมือนต้นฉบับ) ---- */
  const v = Scoring.compute({ srt: examRes });
  await new Promise((resolve) => {
    T.resultSummary(stageEl, {
      title: 'ผลการทดสอบ SRT',
      stats: [
        { label: 'เวลาตอบสนองเฉลี่ย', value: Math.round(v.SRT_AvgMs), unit: 'ms' },
        { label: 'อัตราความถูกต้อง', value: Number(v.SRT_Acc).toFixed(1), unit: '%' },
        { label: 'ตอบถูกจังหวะ', value: `${examRes.filter((r) => r.ok).length}/${EXAM_TRIALS}`, unit: 'ครั้ง' }
      ],
      chips: examRes.map((r, i) => ({
        text: [String(i + 1), r.rt > 0 ? String(r.rt) : '-'],
        ok: r.ok
      })),
      note: 'ตัวเลขในแถบ = ครั้งที่ / RT (ms)<br>ขาว=ตอบถูกจังหวะ · แดง=เร็วไปหรือไม่ได้ตอบ',
      doneLabel: 'ไปแบบทดสอบถัดไป ▸',
      onDone: resolve
    });
  });

  await T.exitFullscreen();
  await T.keepAwake(false);

  return { srt: examRes };
}
