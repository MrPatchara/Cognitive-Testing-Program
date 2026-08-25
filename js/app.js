/* ============================================================
 * app.js — Flow หลัก: หน้าแรก → ฟอร์ม → เลือกแบบทดสอบ → ทดสอบ → รายงาน
 * ข้อมูลเก็บ in-memory (ไม่มี database) — ปิด/รีเฟรชหน้า = เริ่มใหม่
 * ============================================================ */
'use strict';

const App = (() => {

  const state = {
    athlete: {},
    groupName: '',
    selected: new Set(),
    results: {},
    running: false
  };

  /* ---------- registry แบบทดสอบ (7 แบบหลัก ตามหมวดผล 1-7) ---------- */
  const TESTS = [
    {
      id: 'srt', no: 1, name: 'SRT — เวลาปฏิกิริยาอย่างง่าย',
      domain: 'ความเร็วในการประมวลผล', run: (s) => runSRT(s)
    },
    {
      id: 'crt', no: 2, name: 'CRT — เวลาปฏิกิริยาแบบตัวเลือก',
      domain: 'ความเร็ว + การยับยั้ง', run: (s) => runCRT(s)
    },
    {
      id: 'tmt', no: 3, name: 'TMT — เทรลเมคกิ้ง (A และ B)',
      domain: 'ความเร็ว + ความยืดหยุ่นเชิงปฏิบัติ',
      run: async (s) => ({
        ...(await runTMT(s, { variant: 'A' })),
        ...(await runTMT(s, { variant: 'B' }))
      })
    },
    {
      id: 'flanker', no: 4, name: 'Flanker — แฟลงเกอร์',
      domain: 'การยับยั้ง / ความสนใจ', run: (s) => runFlanker(s)
    },
    {
      id: 'dft', no: 5, name: 'DFT — Design Fluency',
      domain: 'ความคล่องแคล่วเชิงออกแบบ',
      run: async (s) => {
        const r1 = await runDF(s, { variant: 'filled' });
        const r2 = await runDF(s, { variant: 'empty' });
        const r3 = await runDF(s, { variant: 'switching' });
        return { ...r1, ...r2, ...r3 };
      }
    },
    {
      id: 'mrt', no: 6, name: 'MRT — การหมุนภาพในใจ',
      domain: 'มิติสัมพันธ์', run: (s) => runMRT(s)
    },
    {
      id: 'svt', no: 7, name: 'SVT — มิติสัมพันธ์เชิงพื้นที่',
      domain: 'การมองเห็นเชิงพื้นที่', run: (s) => runSVT(s)
    }
  ];

  let stageEl, screenEl;

  function init() {
    screenEl = document.getElementById('screen');
    stageEl = document.getElementById('stage');
    document.getElementById('btn-home').addEventListener('click', confirmHome);
    window.addEventListener('beforeunload', (e) => {
      if (state.running || Object.keys(state.results).length) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    showHome();
  }

  /* ---------- assets หน้าแรก (hero landing) ---------- */
  const HL_VIDEO = 'assets/main_video.mp4';
  const IC_MENU = '<svg class="ic-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>';
  const IC_CLOSE = '<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  /* ลายจุดสามเหลี่ยม 9 จุด */
  const DOT_PYRAMID = '<span class="hl-stat-icon">' +
    [[6.125, 2.75], [11.375, 2.75], [3.5, 8.75], [8.75, 8.75], [14, 8.75],
     [0.875, 14.75], [6.125, 14.75], [11.375, 14.75], [16.625, 14.75]]
      .map(([x, y]) => `<i style="left:${x}px;top:${y}px"></i>`).join('') + '</span>';
  /* ตารางหมากรุก 3x3 */
  const GRID_ICON = '<span class="hl-grid-icon">' + '<i></i>'.repeat(9) + '</span>';

  /* ---------- จอ home (full-screen hero landing) ---------- */
  function showHome() {
    state.running = false;
    document.getElementById('topbar').classList.add('hidden');
    stageEl.classList.add('hidden');
    screenEl.classList.add('at-home');
    screenEl.classList.remove('hidden');
    screenEl.innerHTML = `
      <video class="hl-video" src="${HL_VIDEO}" autoplay loop muted playsinline preload="metadata"></video>
      <div class="hl-scrim"></div>

      <div class="hl-shell">
        <nav class="hl-nav">
          <a class="hl-logo" href="#" data-nav="home" aria-label="Computerized Cognitive Test Battery">${T.mark()}</a>
          <div class="hl-pill hl-glass hl-links-desktop">
            <a href="#" class="is-active" data-nav="home">หน้าแรก</a>
            <a href="#" data-nav="start">เริ่มการทดสอบ</a>
            <a href="#" data-nav="about">เกี่ยวกับเรา</a>
          </div>
          <button id="hl-burger" class="hl-user hl-glass hl-only-mobile" aria-label="เมนู" aria-expanded="false">
            <span class="hl-burger-icons">${IC_MENU}${IC_CLOSE}</span>
          </button>
        </nav>

        <div id="hl-menu" class="hl-menu">
          <a href="#" data-nav="home">หน้าแรก</a>
          <a href="#" data-nav="start">เริ่มการทดสอบ</a>
          <a href="#" data-nav="about">เกี่ยวกับเรา</a>
        </div>

        <main class="hl-main" id="hl-main">
          <div class="hl-top">
            <div class="hl-badge hl-glass">
              <span class="hl-avatars"><img src="assets/logo_dpe.svg" alt="กรมพลศึกษา"></span>
              <span class="hl-badge-text">มาตรฐานเกณฑ์กรมพลศึกษา ·</span>
            </div>
            <h1 class="hl-title">ประเมินสมรรถภาพ<br><em>ทางสมอง</em></h1>
            <p class="hl-sub">Computerized Cognitive Test Battery</p>
            <button class="hl-cta hl-glass" data-nav="start">เริ่มการทดสอบ</button>
          </div>

          <div class="hl-stats" id="hl-stats">
            <div class="hl-stat">
              ${DOT_PYRAMID}
              <b>7 แบบทดสอบ</b>
              <span>ครอบคลุมทุกมิติการรับรู้</span>
            </div>
            <div class="hl-stat">
              ${GRID_ICON}
              <b>21 ตัวชี้วัด</b>
              <span>เทียบเกณฑ์มาตรฐานตามช่วงอายุ</span>
            </div>
          </div>
        </main>
      </div>`;

    /* --- wiring --- */
    const burger = screenEl.querySelector('#hl-burger');
    const menu = screenEl.querySelector('#hl-menu');
    const mainEl = screenEl.querySelector('#hl-main');
    let menuOpen = false;
    const setMenu = (v) => {
      menuOpen = v;
      burger.classList.toggle('open', v);
      burger.setAttribute('aria-expanded', String(v));
      menu.classList.toggle('open', v);
      mainEl.classList.toggle('dimmed', v);
    };
    burger.addEventListener('click', () => setMenu(!menuOpen));

    screenEl.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const nav = el.getAttribute('data-nav');
        if (menuOpen) setMenu(false);
        if (nav === 'start') return showForm();
        if (nav === 'about') return openAbout();
        const href = el.getAttribute('href') || '';
        if (href.startsWith('#') && href.length > 1) {
          const t = document.getElementById(href.slice(1));
          if (t) t.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  /* ---------- modal เกี่ยวกับเรา (port CreditsControl.cs) ---------- */
  function openAbout() {
    const old = document.getElementById('about-backdrop');
    if (old) old.remove();

    const SPARKS = [
      [8, 17, '0s', '#0EA5E9'], [93, 19, '.4s', '#F59E0B'],
      [10, 83, '.8s', '#A78BFA'], [90, 79, '1.2s', '#22C55E']
    ];

    const bd = document.createElement('div');
    bd.id = 'about-backdrop';
    bd.className = 'about-backdrop';
    bd.setAttribute('role', 'dialog');
    bd.setAttribute('aria-modal', 'true');
    bd.setAttribute('aria-label', 'เกี่ยวกับผู้จัดทำ');
    bd.innerHTML = `
      <span class="ab-blob ab-blob-1"></span>
      <span class="ab-blob ab-blob-2"></span>
      <span class="ab-blob ab-blob-3"></span>
      <div class="about-card">
        <button class="about-close" aria-label="ปิด">✕</button>
        <div class="about-avatar">
          ${SPARKS.map(([x, y, d, c]) =>
            `<i class="ab-spark" style="left:${x}px;top:${y}px;animation-delay:${d};background:${c}"></i>`).join('')}
          <span class="about-ring">
            <img src="assets/pic1.png" alt="ผู้จัดทำ" class="about-pic">
          </span>
        </div>
        <span class="about-label">ผู้จัดทำ</span>
        <span class="about-bar"></span>
        <h2 class="about-name-th">นายพัชระ อัลอุมารี</h2>
        <p class="about-name-en">Patchara Al-umaree</p>
        <span class="about-role">นักพัฒนาซอฟต์แวร์อิสระ</span>
        <hr class="about-divider">
        <div class="about-contact">
          <span class="ab-ico mail">✉</span>
          <span class="ab-ct"><small>Email</small><a href="mailto:patcharaalumaree@gmail.com">patcharaalumaree@gmail.com</a></span>
        </div>
        <div class="about-contact">
          <span class="ab-ico git">⎇</span>
          <span class="ab-ct"><small>GitHub</small><a href="https://github.com/MrPatchara" target="_blank" rel="noopener">github.com/MrPatchara</a></span>
        </div>
        <div class="about-disclaimer">
          ⚠ โปรแกรมนี้จัดทำขึ้นเพื่อวัตถุประสงค์ทางการศึกษา <br><br>
          ไม่มีเจตนาละเมิดลิขสิทธิ์หรือทรัพย์สินทางปัญญา <br> ของบุคคลหรือองค์กรใด ๆ ทั้งสิ้น
        </div>
      </div>`;
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('open'));

    const pic = bd.querySelector('.about-pic');
    pic.addEventListener('error', () => {
      pic.replaceWith(Object.assign(document.createElement('b'), { className: 'about-pa', textContent: 'PA' }));
    });

    const close = () => {
      document.removeEventListener('keydown', onKey);
      bd.classList.remove('open');
      setTimeout(() => bd.remove(), 240);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    bd.querySelector('.about-close').addEventListener('click', close);
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
    document.addEventListener('keydown', onKey);
  }

  function confirmHome() {
    if (state.running || Object.keys(state.results).length) {
      if (!confirm('ออกจากเซสชันปัจจุบัน? ข้อมูลที่กรอกและผลทดสอบจะหายทั้งหมด')) return;
    }
    reset();
  }

  /* ---------- จอฟอร์ม ---------- */
  function showForm() {
    screenEl.classList.remove('at-home');
    screenEl.innerHTML = `
      <div class="card form-card">
        <h2>ข้อมูลนักกีฬา <span class="muted small">*กรุณากรอกข้อมูลให้ครบถ้วน</span></h2>
        <div class="form-grid">
          <label class="full">ชื่อ–นามสกุล *
            <input id="f-name" type="text" placeholder="เช่น สมชาย ใจเก่ง" autocomplete="off">
          </label>
          <label>วันเกิด *
            <input id="f-dob" type="date">
          </label>
          <label>เพศ *
            <select id="f-gender">
              <option value="">— เลือก —</option>
              <option>ชาย</option><option>หญิง</option>
            </select>
          </label>
          <label>ถนัดมือ
            <select id="f-hand"><option value="">— เลือก —</option><option>ขวา</option><option>ซ้าย</option><option>สองมือ</option></select>
          </label>
          <label>ระดับการศึกษา *
            <select id="f-edu">
              <option value="">— เลือก —</option>
              <option>ม.1-3</option><option>ม.4-6</option>
              <option>ปวช.</option><option>ปวส.</option><option>ปริญญาตรีขึ้นไป</option>
            </select>
          </label>
          <label>ชนิดกีฬา
            <input id="f-sport" type="text" placeholder="เช่น ฟุตบอล" autocomplete="off">
          </label>
          <div class="form-row">
            <label>ประสบการณ์ (ปี)
              <input id="f-exp" type="number" min="0" max="60" placeholder="0">
            </label>
            <label>วันซ้อม / สัปดาห์
              <select id="f-days"><option value=""></option>${[1,2,3,4,5,6,7].map((n) => `<option>${n}</option>`).join('')}</select>
            </label>
            <label>ชั่วโมงซ้อม / วัน
              <select id="f-hours"><option value=""></option>${[1,2,3,4,5,6,7,8].map((n) => `<option>${n}</option>`).join('')}</select>
            </label>
          </div>
          <label class="full">หมายเหตุ
            <textarea id="f-note" rows="2"></textarea>
          </label>
          <label class="full">กลุ่มเกณฑ์เปรียบเทียบ
            <select id="f-norm">
              <option value="">— ไม่ใช้เกณฑ์ (แสดงเฉพาะผลดิบ) —</option>
              <option>ชาย ม.1-3</option>
              <option>หญิง ม.1-3</option>
              <option>ชาย ม.4-6</option>
              <option>หญิง ม.4-6</option>
            </select>
          </label>
        </div>
        <div id="norm-preview" class="norm-preview hidden"></div>
        <div class="form-actions">
          <button id="f-back" class="btn btn-ghost">← ย้อนกลับ</button>
          <button id="f-next" class="btn btn-primary btn-lg">ถัดไป: เลือกแบบทดสอบ</button>
        </div>
      </div>`;

    const selNorm = document.getElementById('f-norm');
    let normTouched = false; /* ผู้ใช้เลือกเกณฑ์เองแล้ว — ไม่ auto เขียนทับอีก */
    const preview = () => {
      const box = document.getElementById('norm-preview');
      const v = selNorm.value;
      box.classList.remove('hidden');
      box.innerHTML = v
        ? `เทียบกับเกณฑ์: <b>${esc(v)}</b> (กรมพลศึกษา)`
        : 'ไม่เทียบเกณฑ์ — รายงานจะแสดงเฉพาะค่าผลการทดสอบดิบ';
    };
    ['f-gender', 'f-edu'].forEach((id) =>
      document.getElementById(id).addEventListener('change', () => {
        /* เติมเกณฑ์ให้อัตโนมัติเฉพาะก่อนผู้ใช้จะเลือกเอง */
        const g = document.getElementById('f-gender').value;
        const e = document.getElementById('f-edu').value;
        if (!normTouched && g && e) selNorm.value = Norms.pickGroup(g, e);
        preview();
      }));
    selNorm.addEventListener('change', () => { normTouched = true; preview(); });

    document.getElementById('f-back').addEventListener('click', showHome);
    document.getElementById('f-next').addEventListener('click', () => {
      const name = document.getElementById('f-name').value.trim();
      const dob = document.getElementById('f-dob').value;
      const gender = document.getElementById('f-gender').value;
      const edu = document.getElementById('f-edu').value;
      if (!name) return alert('กรุณากรอกชื่อ');
      if (!dob) return alert('กรุณาเลือกวันเกิด');
      if (!gender) return alert('กรุณาเลือกเพศ');
      if (!edu) return alert('กรุณาเลือกระดับการศึกษา');
      state.athlete = {
        name, dob, gender,
        handedness: document.getElementById('f-hand').value,
        education: edu,
        sport: document.getElementById('f-sport').value.trim(),
        experience: document.getElementById('f-exp').value,
        practiceDays: document.getElementById('f-days').value,
        practiceHours: document.getElementById('f-hours').value,
        note: document.getElementById('f-note').value.trim()
      };
      /* กลุ่มเกณฑ์: ผู้ใช้เลือกเอง (auto ตอนตั้งค่าเพศ/การศึกษา) หรือ "" เพื่อไม่เทียบเกณฑ์ */
      state.groupName = document.getElementById('f-norm').value;
      showChecklist();
    });
    window.scrollTo(0, 0);
  }

  /* ---------- จอเลือกแบบทดสอบ ---------- */
  function showChecklist() {
    screenEl.classList.remove('at-home');
    screenEl.innerHTML = `
      <div class="card ck-card">
        <h2>เลือกแบบทดสอบ <span class="muted small">(แนะนำเลือกทั้งหมด)</span></h2>
        <div class="check-tools">
          <button id="ck-all" class="btn btn-secondary">เลือกทั้งหมด</button>
          <button id="ck-none" class="btn btn-secondary">ล้างการเลือก</button>
        </div>
        <div class="check-list" id="ck-list">
          ${TESTS.map((t) => `
            <label class="check-item">
              <input type="checkbox" value="${t.id}" checked>
              <span class="ck-no">${t.no}</span>
              <span class="ck-name">${esc(t.name)}</span>
              <span class="ck-domain">${esc(t.domain)}</span>
            </label>`).join('')}
        </div>
        <p class="muted small">หมายเหตุ: คะแนนรวม (หมวด 8) จะแม่นยำเมื่อทดสอบครบทุกแบบ — ตัวชี้วัดที่ไม่ได้ทดสอบจะแสดง N/A</p>
        <div class="form-actions">
          <button id="ck-back" class="btn btn-ghost">ย้อนกลับ</button>
          <button id="ck-go" class="btn btn-primary btn-lg">เริ่มการทดสอบ<span class="arr">→</span></button>
        </div>
      </div>`;

    const boxes = () => [...document.querySelectorAll('#ck-list input')];
    document.getElementById('ck-all').addEventListener('click', () => boxes().forEach((b) => b.checked = true));
    document.getElementById('ck-none').addEventListener('click', () => boxes().forEach((b) => b.checked = false));
    document.getElementById('ck-back').addEventListener('click', showForm);
    document.getElementById('ck-go').addEventListener('click', () => {
      state.selected = new Set(boxes().filter((b) => b.checked).map((b) => b.value));
      if (!state.selected.size) return alert('เลือกอย่างน้อย 1 แบบทดสอบ');
      startSession();
    });
    window.scrollTo(0, 0);
  }

  /* ---------- โหมดทดสอบ (fullscreen stage) ---------- */
  async function startSession() {
    state.results = {};
    state.running = true;
    screenEl.classList.add('hidden');
    stageEl.classList.remove('hidden');
    document.getElementById('topbar').classList.remove('hidden');

    const queue = TESTS.filter((t) => state.selected.has(t.id));
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i];
      setTopbar(`แบบทดสอบ ${t.no}/7 — ${t.name}`, `${i + 1} / ${queue.length}`);
      try {
        const res = await t.run(stageEl);
        Object.assign(state.results, res);
      } catch (err) {
        console.error(err);
        if (!confirm(`เกิดข้อผิดพลาดใน "${t.name}"\n${err && err.message}\n\nOK = ข้ามไปแบบทดสอบถัดไป / Cancel = หยุดทั้งหมด`)) {
          state.running = false;
          showHome();
          return;
        }
      }
      T.clearKeys();
      T.clear(stageEl);
      stageEl.classList.remove('stage-black');
    }
    state.running = false;
    setTopbar('เสร็จสิ้น', '');
    showReport();
  }

  function setTopbar(title, progress) {
    document.getElementById('tb-title').textContent = title;
    document.getElementById('tb-progress').textContent = progress;
  }

  /* ---------- รายงาน ---------- */
  function showReport() {
    const values = Scoring.compute(state.results);
    const ev = state.groupName
      ? Scoring.evaluateAll(values, state.groupName)
      : Scoring.evaluateRaw(values);
    const dateStr = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

    document.getElementById('topbar').classList.add('hidden');
    stageEl.classList.add('hidden');
    screenEl.classList.remove('hidden');
    screenEl.classList.remove('at-home');
    Report.render(screenEl, {
      athlete: state.athlete,
      groupName: state.groupName,
      values, ev, dateStr
    });
    window.scrollTo(0, 0);
  }

  function reset() {
    state.results = {};
    state.selected = new Set();
    state.athlete = {};
    state.running = false;
    showHome();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  document.addEventListener('DOMContentLoaded', init);

  return { reset, showHome };
})();
