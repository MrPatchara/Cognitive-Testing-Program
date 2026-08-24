/* ============================================================
 * base.js — Framework กลางสำหรับแบบทดสอบ
 * - จอคำแนะนำ (advice) / ซ้อม / ทดสอบจริง
 * - ปุ่มตอบสนอง touch + keyboard (Z / /)
 * - fullscreen, wake lock, haptic, timing (performance.now)
 * ============================================================ */
'use strict';

const T = (() => {

  const now = () => performance.now();

  /* ---------- utilities ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }
  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  /* ---------- wake lock ---------- */
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {}
  }

  /* ---------- fullscreen ---------- */
  async function enterFullscreen(node) {
    try {
      const t = node || document.documentElement;
      if (t.requestFullscreen) await t.requestFullscreen({ navigationUI: 'hide' });
      else if (t.webkitRequestFullscreen) t.webkitRequestFullscreen();
      try { await screen.orientation.lock('landscape'); } catch (e) {}
    } catch (e) {}
  }
  async function exitFullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch (e) {}
  }

  /* ---------- keyboard ---------- */
  const keyDownMap = new Map();
  const keyUpMap = new Map();
  const normKey = (e) => (e.key === '/' || e.code === 'Slash') ? '/' : String(e.key || '').toLowerCase();
  function onKeyDownGlobal(e) {
    const fn = keyDownMap.get(normKey(e));
    if (fn) { e.preventDefault(); fn(e); }
  }
  function onKeyUpGlobal(e) {
    const fn = keyUpMap.get(normKey(e));
    if (fn) { e.preventDefault(); fn(e); }
  }
  document.addEventListener('keydown', onKeyDownGlobal, true);
  document.addEventListener('keyup', onKeyUpGlobal, true);
  function bindKey(key, downFn, upFn) {
    const k = String(key).toLowerCase();
    if (downFn) keyDownMap.set(k, downFn);
    if (upFn) keyUpMap.set(k, upFn);
  }
  function unbindKey(key) {
    const k = String(key).toLowerCase();
    keyDownMap.delete(k);
    keyUpMap.delete(k);
  }
  function clearKeys() { keyDownMap.clear(); keyUpMap.clear(); }

  /* ---------- จอคำแนะนำ ---------- */
  /**
   * adviceScreen(parent, {title, desc, images:[src], startLabel, onDone})
   * แสดงภาพแบบเลื่อนดูได้ + ปุ่มถัดไป/ย้อนกลับ + ปุ่มเริ่ม
   */
  function adviceScreen(parent, opt) {
    clear(parent).classList.remove('stage-black');
    const wrap = el('div', 'advice-wrap');
    const title = el('h2', 'advice-title', opt.title || '');
    const desc = el('p', 'advice-desc', opt.desc || '');
    wrap.appendChild(title);
    if (opt.desc) wrap.appendChild(desc);

    let idx = 0;
    const imgs = opt.images || [];
    const multi = imgs.length > 1;
    const imgBox = el('div', 'advice-imgbox' + (multi ? '' : ' single'));
    const img = new Image();
    img.className = 'advice-img';
    img.alt = '';
    imgBox.appendChild(img);
    wrap.appendChild(imgBox);

    const show = () => {
      if (!imgs.length) return;
      img.src = imgs[idx];
      if (multi) {
        pageLbl.textContent = `${idx + 1} / ${imgs.length}`;
        backBtn.disabled = idx === 0;
        nextBtn.disabled = idx >= imgs.length - 1;
      }
    };

    /* แถวปุ่มเลื่อนรูป — แสดงเฉพาะเมื่อมีมากกว่า 1 รูป */
    let backBtn, pageLbl, nextBtn;
    if (multi) {
      const navRow = el('div', 'advice-nav');
      backBtn = el('button', 'btn btn-secondary', '‹ ก่อนหน้า');
      pageLbl = el('span', 'advice-page');
      nextBtn = el('button', 'btn btn-secondary', 'ถัดไป ›');
      navRow.append(backBtn, pageLbl, nextBtn);
      wrap.appendChild(navRow);
      backBtn.addEventListener('click', () => { if (idx > 0) { idx--; show(); } });
      nextBtn.addEventListener('click', () => { if (idx < imgs.length - 1) { idx++; show(); } });
    }

    const actions = el('div', 'advice-actions');
    const skipBtn = el('button', 'btn btn-ghost', 'ข้ามคำแนะนำ');
    skipBtn.addEventListener('click', opt.onDone);
    const startBtn = el('button', 'btn btn-primary btn-lg', opt.startLabel || '▶ เริ่มแบบทดสอบ');
    startBtn.addEventListener('click', () => { vibrate(20); opt.onDone(); });
    actions.append(skipBtn, startBtn);
    wrap.appendChild(actions);

    /* swipe left/right */
    if (multi) {
      let sx = null;
      imgBox.addEventListener('pointerdown', (e) => { sx = e.clientX; });
      imgBox.addEventListener('pointerup', (e) => {
        if (sx == null) return;
        const dx = e.clientX - sx; sx = null;
        if (dx < -40 && idx < imgs.length - 1) { idx++; show(); }
        else if (dx > 40 && idx > 0) { idx--; show(); }
      });
    }

    parent.appendChild(wrap);
    show();
    return wrap;
  }

  /* ---------- ฉากทดสอบพื้นดำ ---------- */
  function stage(parent) {
    parent.classList.add('stage-black');
    return clear(parent);
  }

  /** ข้อความกลางจอสีทอง */
  function centerText(stageEl, html, cls) {
    let t = stageEl.querySelector('.center-msg');
    if (!t) {
      t = el('div', 'center-msg' + (cls ? ' ' + cls : ''));
      stageEl.appendChild(t);
    }
    t.innerHTML = html;
    return t;
  }

  /** progress bar ด้านบน */
  function progressBar(stageEl, frac) {
    let bar = stageEl.querySelector('.test-progress');
    if (!bar) {
      bar = el('div', 'test-progress');
      bar.appendChild(el('div', 'test-progress-fill'));
      stageEl.appendChild(bar);
    }
    bar.querySelector('.test-progress-fill').style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
    return bar;
  }

  /** ป้าย trial count */
  function trialLabel(stageEl, cur, max) {
    let l = stageEl.querySelector('.trial-label');
    if (!l) { l = el('div', 'trial-label'); stageEl.appendChild(l); }
    l.textContent = `ครั้งที่ ${cur} / ${max}`;
    return l;
  }

  /* ---------- ปุ่มตอบสนอง (touch + keyboard) ---------- */
  /**
   * responseButtons(stageParent, defs, onKey)
   * defs: [{id:'z'|'slash', label, hint}] — id ตรงกับคีย์ ('z' หรือ '/')
   * ปุ่มสว่าง "ขณะกด" (pointerdown→up / keydown→keyup) แล้วคืนสภาพเดิม
   * คืน fn remove()
   */
  function responseButtons(stageParent, defs, onKey) {
    const bar = el('div', 'resp-bar');
    for (const d of defs) {
      const b = el('button', 'resp-btn');
      b.innerHTML = `<span class="resp-key">${d.label}</span><span class="resp-hint">${d.hint || ''}</span>`;
      b.id = `resp-${d.id === '/' ? 'slash' : d.id}`;

      const press = () => b.classList.add('pressed');
      const release = () => b.classList.remove('pressed');
      const fire = (e) => {
        e.preventDefault();
        press();
        vibrate(15);
        onKey(d.id);
      };

      b.addEventListener('pointerdown', fire);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
        b.addEventListener(ev, release));
      /* keyboard: keydown = สว่าง + ตอบสนอง, keyup = คืนสภาพ */
      bindKey(d.id, () => { press(); onKey(d.id); }, release);

      bar.appendChild(b);
    }
    stageParent.appendChild(bar);
    return () => {
      bar.remove();
      for (const d of defs) unbindKey(d.id);
    };
  }

  /* ---------- ปุ่ม Start กลางจอ ---------- */
  function startButton(stageEl, label, onClick) {
    const box = el('div', 'start-box');
    const msg = el('div', 'start-msg', label);
    const btn = el('button', 'btn btn-gold btn-lg', 'Start ▸');
    btn.addEventListener('click', () => { vibrate(20); onClick(); });
    box.append(msg, btn);
    stageEl.appendChild(box);
    return box;
  }

  /* ---------- countdown 3-2-1 ---------- */
  function countdown(stageEl, seconds, onDone) {
    return new Promise((resolve) => {
      const c = el('div', 'countdown');
      stageEl.appendChild(c);
      let n = seconds;
      const tick = () => {
        if (n <= 0) {
          c.remove();
          resolve(onDone ? onDone() : undefined);
          return;
        }
        c.textContent = n > 0 ? n : '';
        vibrate(30);
        n--;
        setTimeout(tick, 1000);
      };
      tick();
    });
  }

  /* ---------- sleep ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- หน้าจบการทดสอบย่อย ---------- */
  /**
   * opt: {
   *   title, note, doneLabel, onDone,
   *   rows:  [[label, value]...],           // ตาราง 2 คอลัมน์
   *   stats: [{label, value, unit}],        // การ์ดตัวเลขใหญ่ (เช่น RT ms)
   *   chips: [{text, ok}]                   // แถบผลรายครั้ง (เขียว/แดง)
   * }
   */
  function resultSummary(parent, opt) {
    keepAwake(false);
    clearKeys();
    parent.classList.remove('stage-black');
    clear(parent);
    const wrap = el('div', 'subresult-wrap');
    wrap.appendChild(el('h2', 'advice-title', opt.title || ''));

    if (opt.stats && opt.stats.length) {
      const grid = el('div', 'stat-grid');
      for (const s of opt.stats) {
        const card = el('div', 'stat-card');
        card.innerHTML = `<div class="stat-value">${esc(s.value)}<small>${s.unit ? ' ' + esc(s.unit) : ''}</small></div>` +
                         `<div class="stat-label">${esc(s.label)}</div>`;
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
    }

    if (opt.chips && opt.chips.length) {
      const strip = el('div', 'chip-strip');
      for (const c of opt.chips) {
        /* c.text เป็น array ของบรรทัด (escape ทีละบรรทัด แล้วค่อย join ด้วย <br>) */
        const lines = Array.isArray(c.text) ? c.text.map((x) => esc(x)) : [esc(c.text)];
        strip.appendChild(el('span', 'chip-mini ' + (c.ok === false ? 'bad' : c.ok === true ? 'good' : ''),
          lines.join('<br>')));
      }
      wrap.appendChild(strip);
    }

    if (opt.rows && opt.rows.length) {
      const tbl = el('table', 'mini-table');
      for (const r of opt.rows) {
        const tr = el('tr');
        tr.appendChild(el('td', null, r[0]));
        tr.appendChild(el('td', 'num', String(r[1])));
        tbl.appendChild(tr);
      }
      wrap.appendChild(tbl);
    }

    if (opt.note) wrap.appendChild(el('p', 'advice-desc', opt.note));
    const btn = el('button', 'btn btn-primary btn-lg', opt.doneLabel || 'ถัดไป ▸');
    btn.addEventListener('click', opt.onDone);
    wrap.appendChild(btn);
    parent.appendChild(wrap);
    wrap.scrollIntoView?.();
    return wrap;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- logo mark (SVG — ใช้ร่วมกันทุกหน้า) ---------- */
  function mark(cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="7"/>
      <circle cx="24" cy="7.5" r="3.4"/>
      <circle cx="38.7" cy="15.8" r="3.4"/>
      <circle cx="38.7" cy="32.2" r="3.4"/>
      <circle cx="24" cy="40.5" r="3.4"/>
      <circle cx="9.3" cy="32.2" r="3.4"/>
      <circle cx="9.3" cy="15.8" r="3.4"/>
      <path d="M24 17v-5M33 19l4-2M35 27l1 4M26 31l-1 4M14 28l-4 2M13 18l4-2"/>
    </svg>`;
  }

  /* ---------- คำนวณ RT ช่วง stimulus (port แนวคิดเดิม) ---------- */
  /* คืน true ถ้าตอบภายในช่วง stimulus ปรากฏ */

  return {
    now, el, clear, sleep, vibrate,
    keepAwake, enterFullscreen, exitFullscreen,
    bindKey, unbindKey, clearKeys,
    adviceScreen, stage, centerText, progressBar, trialLabel,
    responseButtons, startButton, countdown, resultSummary,
    mark
  };
})();
