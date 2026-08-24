/* ============================================================
 * report.js — รายงานผล + Excel 2 ชีต (ExcelJS)
 *   Sheet1 "Personal Report"        ← replica template CognitiveTestBattery.xlsx
 *   Sheet2 "ผลการประเมินตามเกณฑ์"    ← replica CognitiveTestBatteryReport.cs
 * ============================================================ */
'use strict';

const Report = (() => {

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function calcAge(dob) {
    if (!dob) return 0;
    const d = new Date(dob);
    if (isNaN(d)) return 0;
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  }
  function levelChip(level, text, item) {
    const info = Norms.infoFor(item, level);
    const t = text != null ? text : (level > 0 ? `${info.label}` : 'N/A');
    return `<span class="chip" style="background:${info.bg};color:${info.fg}">${t}</span>`;
  }

  /* ป้ายระดับของแถว (รองรับสเกล 3/5 ระดับ เหมือน ScoreLevelInfo.For) */
  function rowLabel(row) {
    if (row.level <= 0) return 'N/A';
    return Norms.infoFor(row.item, row.level).label;
  }

  /* ---------- จุดสีระดับ (แทน emoji) ---------- */
  function dotSpan(info, extra) {
    return `<i class="dot"${info ? ` style="background:${info.fg}"` : ''}>${extra || ''}</i>`;
  }

  /* ---------- ไอคอนหมวด (SVG เส้นบาง) ---------- */
  const IC = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const CAT_ICONS = [
    [/SRT/, IC('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3.4 2.4"/>')],
    [/CRT/, IC('<circle cx="6.5" cy="12" r="3"/><circle cx="17.5" cy="12" r="3"/>')],
    [/TMT|เทรล/, IC('<circle cx="5.5" cy="18" r="2.2"/><circle cx="12" cy="10.5" r="2.2"/><circle cx="19" cy="5" r="2.2"/><path d="M7.3 16.8l3-3.9M13.6 9.3l3.7-2.9"/>')],
    [/FLK|FKT|แฟลงเกอร์/, IC('<path d="M8.5 6L3.5 12l5 6M15.5 6l5 6-5 6"/>')],
    [/DFT|Design|ออกแบบ/, IC('<path d="M4 20l3.5-.9L19.6 7a2 2 0 000-2.8l-.8-.8a2 2 0 00-2.8 0L3.9 15.5 3 19z"/><path d="M14.5 6.5l3 3"/>')],
    [/MRT|หมุนภาพ/, IC('<path d="M12 3l7.5 4.3v8.4L12 20l-7.5-4.3V7.7z"/><path d="M12 11.5L19.5 7.3M12 11.5v8.3M12 11.5L4.5 7.3"/>')],
    [/SVT/, IC('<path d="M12 3.5l9 5-9 5-9-5z"/><path d="M3 13.5l9 5 9-5"/>')],
    [/คะแนนรวม|TOTAL/, IC('<circle cx="12" cy="9" r="5.5"/><path d="M8.8 13.5L7.5 21l4.5-2.6L16.5 21l-1.3-7.5"/>')]
  ];
  function catIcon(cat) {
    for (const [re, svg] of CAT_ICONS) if (re.test(cat)) return svg;
    return IC('<circle cx="12" cy="12" r="8.2"/>');
  }

  /* นับจำนวนตามป้ายระดับที่แสดง (merge เกณฑ์ 3 ระดับเข้าชื่อเดียวกัน) */
  function distCounts(ev) {
    const ORDER = ['ดีมาก', 'ดี', 'ปานกลาง', 'พอใช้', 'ควรปรับปรุง'];
    const COLORS = {
      'ดีมาก': ['#DCFCE7', '#166534'], 'ดี': ['#FEF9C3', '#854D0E'],
      'ปานกลาง': ['#DBEAFE', '#1E3A8A'], 'พอใช้': ['#FED7AA', '#9A3412'],
      'ควรปรับปรุง': ['#FEE2E2', '#991B1B']
    };
    const cnt = {};
    for (const r of ev.rows) {
      if (r.value == null) { cnt['N/A'] = (cnt['N/A'] || 0) + 1; continue; }
      const lbl = rowLabel(r);
      cnt[lbl] = (cnt[lbl] || 0) + 1;
    }
    const out = [];
    for (const lbl of ORDER) if (cnt[lbl]) {
      const [bg, fg] = COLORS[lbl];
      out.push(`<span class="chip" style="background:${bg};color:${fg}">${dotSpan({ fg })}${lbl} ${cnt[lbl]}</span>`);
    }
    if (cnt['N/A']) out.push(`<span class="chip" style="background:#F1F5F9;color:#64748B">${dotSpan({ fg: '#94A3B8' })}N/A ${cnt['N/A']}</span>`);
    return out.join('');
  }

  /* schema จากเกณฑ์ (ใช้ชื่อ/หมวด/หน่วยแม้ไม่เทียบเกณฑ์) */
  function schema() {
    return Norms.getGroup('ชาย ม.1-3').items.filter((i) => i.key !== 'Total_Norm_Score');
  }

  /* ============================================================
   * RENDER — หน้ารายงานบนเว็บ (v2: การ์ดผล + รองรับมือถือ)
   * ============================================================ */
  function render(container, data) {
    const { athlete, groupName, values, ev, dateStr } = data;
    container.innerHTML = '';

    const wrap = T.el('div', 'report-wrap');
    wrap.id = 'report-area';

    /* ---------- header ---------- */
    const head = T.el('div', 'report-head no-print');
    head.innerHTML = `
      <div class="report-brand">
        <div class="brand-badge">${T.mark()}</div>
        <div>
          <h2>รายงานผลการประเมินสมรรถภาพทางสมอง</h2>
          <p class="muted">Computerized Cognitive Test Battery</p>
        </div>
      </div>`;
    wrap.appendChild(head);

    /* ---------- hero สไตล์การ์ดนักเตะ ---------- */
    wrap.appendChild(buildHero(data));

    /* ---------- ข้อมูลผู้ทดสอบ ---------- */
    const age = calcAge(athlete.dob);
    const info = T.el('div', 'report-info');
    info.innerHTML = `
      <div><span>ชื่อ</span><b>${esc(athlete.name || '(ไม่ระบุ)')}</b></div>
      <div><span>วันเกิด</span><b>${esc(athlete.dob || '-')}${age ? ` · ${age} ปี` : ''}</b></div>
      <div><span>เพศ</span><b>${esc(athlete.gender || '-')}</b></div>
      <div><span>กีฬา</span><b>${esc(athlete.sport || '-')}</b></div>
      <div><span>วันที่ทดสอบ</span><b>${esc(dateStr)}</b></div>
      <div><span>เกณฑ์อ้างอิง</span><b>${groupName ? `${esc(groupName)} (กรมพลศึกษา)` : 'ไม่ใช้เกณฑ์'}</b></div>`;
    wrap.appendChild(info);

    /* ---------- การ์ดผลรายหมวด / ตารางฉบับเต็ม ---------- */
    if (groupName && !ev.noNorm) {
      wrap.appendChild(buildCatCards(data));
      const det = T.el('details', 'rep-details no-print');
      det.appendChild(T.el('summary', null, 'ตารางเกณฑ์ฉบับเต็ม (เทียบ Excel ชีต "ผลการประเมินตามเกณฑ์")'));
      const sc = T.el('div', 'table-scroll');
      sc.appendChild(normTable(data));
      det.appendChild(sc);
      wrap.appendChild(det);
    } else {
      const det = T.el('details', 'rep-details no-print');
      det.appendChild(T.el('summary', null, 'ตารางผลการทดสอบดิบ'));
      const sc = T.el('div', 'table-scroll');
      sc.appendChild(rawTable(values));
      det.appendChild(sc);
      wrap.appendChild(det);
    }

    /* ---------- note ---------- */
    wrap.appendChild(T.el('p', 'report-note', groupName && !ev.noNorm
      ? `หมายเหตุ: เกณฑ์ 5 ระดับ — 5=ดีมาก, 4=ดี, 3=ปานกลาง, 2=พอใช้, 1=ควรปรับปรุง · เกณฑ์ 3 ระดับ (ความถูกต้อง/ความผิดพลาด) — 3=ดีมาก, 2=ปานกลาง, 1=ควรปรับปรุง · N/A=ไม่มีเกณฑ์/ไม่ได้ทดสอบ · เกณฑ์อ้างอิง: ${groupName} (กรมพลศึกษา)`
      : 'หมายเหตุ: ไม่ได้เลือกกลุ่มเกณฑ์ จึงแสดงเฉพาะค่าผลการทดสอบดิบ (เลือกเกณฑ์ได้ในหน้ากรอกข้อมูล)'));

    /* ---------- การ์ดพลัง (ซ่อนนอกจอ — ใช้สำหรับบันทึกภาพ) ---------- */
    const host = T.el('div', 'pcard-host no-print');
    host.id = 'pcard-host';
    host.setAttribute('aria-hidden', 'true');
    host.appendChild(buildPowerCard(data));
    wrap.appendChild(host);

    /* ---------- actions ---------- */
    const actions = T.el('div', 'report-actions no-print');
    const saveBtn = T.el('button', 'btn btn-gold btn-lg', 'บันทึกผล <span class="arr">↓</span>');
    saveBtn.addEventListener('click', () => saveImage(saveBtn, data));
    const xlsBtn = T.el('button', 'btn btn-success btn-lg', 'ดาวน์โหลด Excel');
    xlsBtn.addEventListener('click', () => exportExcel(data));
    const againBtn = T.el('button', 'btn btn-ghost btn-lg', 'เริ่มการทดสอบใหม่');
    againBtn.addEventListener('click', () => App.reset());
    actions.append(saveBtn, xlsBtn, againBtn);
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  /* ---------- hero: การ์ดสรุปผลรวม ---------- */
  /* คะแนนเต็มจริง = 93 (15 ตัวชี้วัด×5 + 6 ตัวชี้วัด×3) — ตามเกณฑ์คะแนนรวมต้นฉบับ
     ≥72 ดีมาก · 59-71 ดี · 46-58 ปานกลาง · 33-45 พอใช้ · ≤32 ควรปรับปรุง */
  const TOTAL_MAX = 93;
  function totalPct(score) {
    return Math.max(0, Math.min(100, (score / TOTAL_MAX) * 100));
  }

  function buildHero({ athlete, groupName, values, ev, dateStr }) {
    const age = calcAge(athlete.dob);
    const hasNorm = groupName && !ev.noNorm;
    const tInfo = Norms.infoFor(null, hasNorm ? ev.totalLevel : 0);
    const pct = hasNorm ? totalPct(ev.totalScore) : 0;

    const hero = T.el('section', 'rep-hero' + (hasNorm ? ` rar-${ev.totalLevel}` : ' rar-0'));

    const metaBits = [
      athlete.sport || '', athlete.gender || '',
      age ? `${age} ปี` : '', athlete.education || ''
    ].filter(Boolean).map((m) => `<span class="rh-meta-item">${esc(m)}</span>`).join('');

    const left = T.el('div', 'rh-left');
    left.innerHTML = `
      <div class="rh-avatar">${T.mark()}</div>
      <div class="rh-name">${esc(athlete.name || '(ไม่ระบุ)')}</div>
      <div class="rh-meta">${metaBits || '<span class="rh-meta-item">-</span>'}</div>`;

    const right = T.el('div', 'rh-right');
    if (hasNorm) {
      right.innerHTML = `
        <div class="rh-toprow">
          <div class="rh-ovr">
            <span class="rh-ovr-num">${ev.totalScore}</span>
            <span class="rh-ovr-cap">คะแนนรวม<br><small>จาก ${ev.totalCount} ตัวชี้วัด</small></span>
          </div>
          <div class="rh-badge">${dotSpan(tInfo)} ${tInfo.label}<small>ระดับความสามารถทางสมอง</small></div>
        </div>
        <div class="score-band">
          <div class="score-band-seg" style="flex:33;background:${Norms.LEVEL_INFO[1].bg}"></div>
          <div class="score-band-seg" style="flex:13;background:${Norms.LEVEL_INFO[2].bg}"></div>
          <div class="score-band-seg" style="flex:13;background:${Norms.LEVEL_INFO[3].bg}"></div>
          <div class="score-band-seg" style="flex:13;background:${Norms.LEVEL_INFO[4].bg}"></div>
          <div class="score-band-seg" style="flex:21;background:${Norms.LEVEL_INFO[5].bg}"></div>
          <div class="score-marker" style="left:${pct}%"></div>
        </div>
        <div class="score-band-labels">
          <span>≤32</span><span>พอใช้</span><span>ปานกลาง</span><span>ดี</span><span>ดีมาก ≥72</span>
        </div>
        <div class="rh-dist">${distCounts(ev)}</div>`;
    } else {
      const done = schema().filter((i) => typeof values[i.key] === 'number').length;
      right.innerHTML = `
        <div class="rh-toprow">
          <div class="rh-ovr">
            <span class="rh-ovr-num">${done}<small>/21</small></span>
            <span class="rh-ovr-cap">ตัวชี้วัดที่ได้ผล<br><small>ไม่เทียบเกณฑ์</small></span>
          </div>
          <div class="rh-badge rh-badge-gray">ไม่ใช้เกณฑ์<small>แสดงเฉพาะค่าผลดิบ</small></div>
        </div>
        <p class="muted small" style="margin:4px 0 0">ต้องการเทียบเกณฑ์ DPE ให้เลือก "กลุ่มเกณฑ์เปรียบเทียบ" ตอนกรอกข้อมูล</p>`;
    }

    hero.append(left, right);
    return hero;
  }

  /* ---------- การ์ดผลแยกหมวด 1-7 + คะแนนรวม ---------- */
  function pipsHTML(item, level) {
    const n = item.scaleLevels === 3 ? 3 : 5;
    const info = level > 0 ? Norms.infoFor(item, level) : null;
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<i class="${i < level ? 'on' : ''}"${info ? ` style="background:${info.fg}"` : ''}></i>`;
    }
    return `<span class="pips">${s}</span>`;
  }

  function buildCatCards({ ev }) {
    const grid = T.el('section', 'cat-grid');

    const groups = [];
    let cur = null;
    for (const row of ev.rows) {
      if (!cur || cur.cat !== row.item.category) {
        cur = { cat: row.item.category, rows: [] };
        groups.push(cur);
      }
      cur.rows.push(row);
    }

    for (const g of groups) {
      const card = T.el('article', 'cat-card');
      const tested = g.rows.filter((r) => r.value != null).length;
      card.innerHTML = `
        <header class="cat-head">
          <span class="cat-icon">${catIcon(g.cat)}</span>
          <span class="cat-title">${esc(g.cat)}</span>
          <span class="cat-count">${tested}/${g.rows.length}</span>
        </header>`;
      const body = T.el('div', 'cat-body');
      for (const row of g.rows) {
        const info = row.value != null && row.level > 0 ? Norms.infoFor(row.item, row.level) : null;
        const tr = T.el('div', 'ind-row' + (row.value == null ? ' dim' : ''));
        tr.innerHTML = `
          <div class="ind-main">
            <span class="ind-name">${esc(row.item.name)}</span>
            <span class="ind-val">${row.value != null ? Scoring.fmt(row.value, row.key) : '—'}<small>${esc(row.item.unit)}</small></span>
          </div>
          <div class="ind-side">
            ${pipsHTML(row.item, row.value != null ? row.level : 0)}
            <span class="chip"${info ? ` style="background:${info.bg};color:${info.fg}"` : ' style="background:#F1F5F9;color:#64748B"'}>${row.value != null ? rowLabel(row) : 'N/A'}</span>
          </div>`;
        body.appendChild(tr);
      }
      card.appendChild(body);
      grid.appendChild(card);
    }

    /* การ์ดคะแนนรวม */
    const tc = ev.totalItem;
    const tInfo = Norms.infoFor(null, ev.totalLevel);
    const pct = totalPct(ev.totalScore);
    const total = T.el('article', 'cat-card cat-total');
    total.innerHTML = `
      <header class="cat-head">
        <span class="cat-icon">${catIcon('คะแนนรวม')}</span>
        <span class="cat-title">8. คะแนนรวม (ความสามารถทางสมอง)</span>
        <span class="cat-count">${ev.totalScore}/${TOTAL_MAX}</span>
      </header>
      <div class="cat-body">
        <div class="total-flex">
          <div class="total-num" style="color:${tInfo.fg}">${ev.totalScore}</div>
          <div class="total-info">
            <span class="chip" style="background:${tInfo.bg};color:${tInfo.fg}">${dotSpan(tInfo)} ${tInfo.label}</span>
            <div class="pips">${'<i class="on"></i>'.repeat(ev.totalLevel)}${'<i></i>'.repeat(5 - ev.totalLevel)}</div>
            <div class="muted small">${tc ? tc.name : ''}</div>
          </div>
        </div>
        <div class="score-band">
          <div class="score-band-seg" style="flex:33;background:${Norms.LEVEL_INFO[1].bg}"></div>
          <div class="score-band-seg" style="flex:13;background:${Norms.LEVEL_INFO[2].bg}"></div>
          <div class="score-band-seg" style="flex:13;background:${Norms.LEVEL_INFO[3].bg}"></div>
          <div class="score-band-seg" style="flex:13;background:${Norms.LEVEL_INFO[4].bg}"></div>
          <div class="score-band-seg" style="flex:21;background:${Norms.LEVEL_INFO[5].bg}"></div>
          <div class="score-marker" style="left:${pct}%"></div>
        </div>
        <div class="score-band-labels">
          <span>≤32 ควรปรับปรุง</span><span>พอใช้</span><span>ปานกลาง</span><span>ดี</span><span>ดีมาก ≥72</span>
        </div>
      </div>`;
    grid.appendChild(total);

    return grid;
  }

  /* ---------- ตารางแบบมีเกณฑ์ (12 คอลัมน์ เหมือน Sheet2 ต้นฉบับ) ---------- */
  function normTable({ ev }) {
    const tbl = T.el('table', 'report-table');
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>ลำดับ</th><th class="tl">ตัวแปรที่วัด</th><th>หน่วย</th><th>ค่าที่วัดได้</th>
          <th>ดีมาก (5)</th><th>ดี (4)</th><th>ปานกลาง (3)</th><th>พอใช้ (2)</th><th>ควรปรับปรุง (1)</th>
          <th>ผลการประเมิน</th><th>คะแนน</th>
        </tr>
      </thead>`;
    const tbody = document.createElement('tbody');

    let lastCat = null, seq = 0;
    for (const row of ev.rows) {
      if (row.item.category !== lastCat) {
        lastCat = row.item.category;
        const tr = document.createElement('tr');
        tr.className = 'cat-row';
        const td = document.createElement('td');
        td.colSpan = 11;
        td.textContent = lastCat;
        tr.appendChild(td);
        tbody.appendChild(tr);
        seq = 0;
      }
      seq++;
      const tr = document.createElement('tr');
      if (row.value == null) tr.classList.add('dim');
      const cuts = [row.item.score5, row.item.score4, row.item.score3, row.item.score2, row.item.score1];
      const info = Norms.infoFor(row.item, row.level);
      tr.innerHTML = `
        <td>${seq}</td>
        <td class="tl">${esc(row.item.name)}</td>
        <td>${esc(row.item.unit)}</td>
        <td class="val">${row.value != null ? Scoring.fmt(row.value, row.key) : '—'}</td>
        ${cuts.map((c) => `<td>${c ? esc(c) : '-'}</td>`).join('')}
        <td><span class="chip" style="background:${info.bg};color:${info.fg}">${row.level > 0 ? info.label : 'N/A'}</span></td>
        <td class="val">${row.level > 0 ? row.level : 'N/A'}</td>`;
      tbody.appendChild(tr);
    }

    /* แถวคะแนนรวม */
    const tc = ev.totalItem;
    const tInfo = Norms.LEVEL_INFO[ev.totalLevel] || Norms.LEVEL_INFO[0];
    const trT = document.createElement('tr');
    trT.className = 'total-row';
    trT.innerHTML = `
      <td>★</td>
      <td class="tl">8. คะแนนรวม (ความสามารถทางสมอง)</td>
      <td>คะแนน</td>
      <td class="val">${ev.totalScore}</td>
      ${[tc ? tc.score5 : '', tc ? tc.score4 : '', tc ? tc.score3 : '', tc ? tc.score2 : '', tc ? tc.score1 : '']
        .map((c) => `<td>${esc(c || '-')}</td>`).join('')}
      <td><span class="chip" style="background:${tInfo.bg};color:${tInfo.fg}">${tInfo.label}</span></td>
      <td>-</td>`;
    tbody.appendChild(trT);

    tbl.appendChild(tbody);
    return tbl;
  }

  /* ---------- ตารางแบบไม่ใช้เกณฑ์ (ผลดิบ) ---------- */
  function rawTable(values) {
    const tbl = T.el('table', 'report-table rt-raw');
    tbl.innerHTML = `
      <thead><tr>
        <th>ลำดับ</th><th class="tl">หมวด / ตัวแปรที่วัด</th><th>หน่วย</th><th>ค่าที่วัดได้</th>
      </tr></thead>`;
    const tbody = document.createElement('tbody');
    let lastCat = null, seq = 0;
    for (const item of schema()) {
      if (item.category !== lastCat) {
        lastCat = item.category;
        const tr = document.createElement('tr');
        tr.className = 'cat-row';
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = lastCat;
        tr.appendChild(td);
        tbody.appendChild(tr);
        seq = 0;
      }
      const v = values[item.key];
      seq++;
      const tr = document.createElement('tr');
      if (typeof v !== 'number') tr.classList.add('dim');
      tr.innerHTML = `
        <td>${seq}</td>
        <td class="tl">${esc(item.name)}</td>
        <td>${esc(item.unit)}</td>
        <td class="val">${typeof v === 'number' ? Scoring.fmt(v, item.key) : '—'}</td>`;
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    return tbl;
  }

  /* ============================================================
   * POWER CARD — การ์ดพลังผู้ทดสอบ (บันทึกเป็นภาพ PNG)
   * ธีม: น้ำเงิน light mode — c=สี accent, d=สีเข้ม (ตัวอักษร)
   * ============================================================ */
  const RARITY = {
    5: { en: 'LEGENDARY', th: 'ระดับสูงสุด',    c: '#FBBF24' },
    4: { en: 'EPIC',      th: 'ระดับดี',        c: '#A78BFA' },
    3: { en: 'RARE',      th: 'ระดับปานกลาง',   c: '#60A5FA' },
    2: { en: 'COMMON',    th: 'ระดับพอใช้',     c: '#FB923C' },
    1: { en: 'ROOKIE',    th: 'ควรปรับปรุง',    c: '#94A3B8' },
    0: { en: 'CTB',       th: 'ไม่ใช้เกณฑ์',    c: '#94A3B8' }
  };
  const BAR_C = { 5: '#22C55E', 4: '#FACC15', 3: '#38BDF8', 2: '#FB923C', 1: '#F87171', 0: '#CBD5E1' };

  function buildPowerCard({ athlete, groupName, values, ev, dateStr }) {
    const age = calcAge(athlete.dob);
    const hasNorm = groupName && !ev.noNorm;
    const lvl = hasNorm ? ev.totalLevel : 0;
    const rar = RARITY[lvl];
    const tInfo = Norms.infoFor(null, lvl);

    /* จำนวนแต่ละระดับที่แสดง (merge เกณฑ์ 3 ระดับ) */
    const cnt = {};
    if (hasNorm) for (const r of ev.rows) {
      if (r.value == null) continue;
      const lbl = Norms.infoFor(r.item, r.level).label;
      cnt[lbl] = (cnt[lbl] || 0) + 1;
    }
    const sumLine = ['ดีมาก', 'ดี', 'ปานกลาง', 'พอใช้', 'ควรปรับปรุง']
      .filter((l) => cnt[l]).map((l) => `${l} ${cnt[l]}`).join(' · ');

    /* สถิติรายหมวด */
    const groups = [];
    let cur = null;
    for (const row of ev.rows) {
      if (!cur || cur.cat !== row.item.category) {
        cur = { cat: row.item.category, rows: [] };
        groups.push(cur);
      }
      cur.rows.push(row);
    }

    let statHTML = '';
    for (const g of groups) {
      statHTML += `<section class="pc-cat">
        <header class="pc-cat-t">${catIcon(g.cat)}<span class="pc-cat-name">${esc(g.cat)}</span></header>`;
      for (const row of g.rows) {
        const tested = row.value != null;
        const base = row.item.scaleLevels === 3 ? 3 : 5;
        const w = tested && hasNorm && row.level > 0 ? Math.round((row.level / base) * 100) : 0;
        const bc = BAR_C[tested && hasNorm && row.level > 0 ? row.level : 0];
        const info = tested && hasNorm && row.level > 0 ? Norms.infoFor(row.item, row.level) : null;
        const lblTxt = !hasNorm ? '—' : (!tested ? 'N/A' : (info ? info.label : ''));
        const lblStyle = info ? `background:${info.bg};color:${info.fg}` : 'background:#F1F5F9;color:#94A3B8';
        statHTML += `
          <div class="pc-row${tested ? '' : ' pc-dim'}">
            <span class="pc-rname">${esc(row.item.name)}</span>
            <span class="pc-rval">${tested ? Scoring.fmt(row.value, row.key) : '—'}<i>${esc(row.item.unit)}</i></span>
            <span class="pc-bar"><b style="width:${w}%;background:${bc}"></b></span>
            <span class="pc-chip" style="${lblStyle}">${lblTxt}</span>
          </div>`;
      }
      statHTML += '</section>';
    }

    const starsHTML = '<b>★</b>'.repeat(lvl) + '<i>★</i>'.repeat(5 - lvl);
    const tags = [athlete.sport || '', athlete.gender || '', age ? `${age} ปี` : '', athlete.education || '']
      .filter(Boolean).map((m) => `<span class="pc-tag">${esc(m)}</span>`).join('');
    const pct = hasNorm ? totalPct(ev.totalScore) : 0;
    const done = ev.rows.filter((r) => r.value != null).length;
    const ovrNum = hasNorm ? String(ev.totalScore) : `${done}<span>/21</span>`;
    const ovrCap = hasNorm ? 'คะแนนรวม' : 'ตัวชี้วัดที่ได้ผล (ไม่เทียบเกณฑ์)';

    const card = T.el('div', 'pcard');
    card.style.setProperty('--rar', rar.c);
    card.innerHTML = `
      <header class="pc-band">
        <div class="pc-brand">
          <span class="pc-logo">${T.mark()}</span>
          <span class="pc-btxt">
            <b>Cognitive Test Battery</b>
            <i>Power Card · ชุดประเมินสมรรถภาพทางสมอง</i>
          </span>
        </div>
        <div class="pc-rarity">
          <span class="pc-pill">${rar.en}</span>
          <span class="pc-stars">${starsHTML || '<i>★</i>'}</span>
          <small>${esc(rar.th)}</small>
        </div>
      </header>

      <div class="pc-body">
        <div class="pc-rings" aria-hidden="true"><i></i><i></i><b></b></div>

        <div class="pc-head">
          <div class="pc-overline">Brain Performance Report · ผลการประเมินสมรรถภาพทางสมอง</div>
          <div class="pc-name">${esc(athlete.name || '(ไม่ระบุ)')}</div>
          <div class="pc-metarow">
            ${tags}
            <span class="pc-date">วันที่ทดสอบ ${esc(dateStr)}${groupName ? ` · เกณฑ์ ${esc(groupName)}` : ''}</span>
          </div>
        </div>

        <div class="pc-main">
          <div class="pc-panel pc-scorebox">
            <div class="pc-ovr-num">${ovrNum}</div>
            <div class="pc-ovr-cap">${ovrCap}</div>
            <div class="pc-stars pc-stars-body">${starsHTML || '<i>★</i>'}</div>
          </div>
          <div class="pc-panel pc-lvlbox">
            <div class="pc-lvlrow">
              <span class="pc-badge" style="background:${tInfo.bg};color:${tInfo.fg}">${dotSpan(tInfo)} ${lvl > 0 ? tInfo.label : 'ไม่ใช้เกณฑ์'}</span>
              ${hasNorm ? `<span class="pc-tested">ประเมินจาก ${ev.totalCount} ตัวชี้วัด</span>` : `<span class="pc-tested">ทดสอบ ${done}/21 ตัวชี้วัด</span>`}
            </div>
            ${hasNorm ? `
            <div class="pc-track"><b style="width:${pct}%"></b></div>
            <div class="pc-scale"><span>≤32 ควรปรับปรุง</span><span>พอใช้ · ปานกลาง · ดี</span><span>ดีมาก ≥72</span></div>
            <div class="pc-sum">${esc(sumLine)}</div>` : `
            <div class="pc-sum">ไม่ได้เทียบเกณฑ์มาตรฐาน — แสดงเฉพาะค่าผลดิบ (เลือกกลุ่มเกณฑ์ได้ในหน้ากรอกข้อมูล)</div>`}
          </div>
        </div>

        <div class="pc-stats">${statHTML}</div>

        <footer class="pc-foot">
          <span>Computerized Cognitive Test Battery</span>
          <span>Developed by Mr.Patchara Al-umaree</span>
        </footer>
      </div>`;

    return card;
  }

  async function saveImage(btn, data) {
    if (typeof html2canvas === 'undefined') {
      alert('ยังโหลดโมดูลจับภาพไม่สำเร็จ (ต้องต่ออินเทอร์เน็ตครั้งแรกเพื่อแคชไว้ใช้ offline)');
      return;
    }
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ กำลังสร้างภาพ…';
    try {
      await document.fonts.ready;
      const el = document.querySelector('#pcard-host .pcard');
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
      canvas.toBlob((blob) => {
        if (!blob) { alert('สร้างไฟล์ภาพไม่สำเร็จ'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nm = String(data.athlete.name || 'guest').replace(/[^\w\u0E00-\u0E7F]+/g, '_');
        a.href = url;
        a.download = `CTB_PowerCard_${nm}_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      alert('สร้างภาพไม่สำเร็จ: ' + (err && err.message));
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  /* ตอนสั่งพิมพ์ (Ctrl+P) ให้กาง details ที่หุบไว้ด้วย */
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details.rep-details').forEach((d) => { d.open = true; });
  });

  /* ============================================================
   * EXCEL EXPORT (ExcelJS) — 2 ชีตเหมือนโปรแกรมเดิม
   * ============================================================ */
  async function exportExcel(data) {
    if (typeof ExcelJS === 'undefined') {
      alert('ยังโหลดโมดูล Excel ไม่สำเร็จ (ต้องต่ออินเทอร์เน็ตครั้งแรก)\nลองใช้ปุ่ม "บันทึกภาพผล" แทนได้');
      return;
    }
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CTB Web';
      wb.created = new Date();
      sheetPersonal(wb, data);
      if (data.groupName && !data.ev.noNorm) sheetNorms(wb, data);

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CTB_Report_${String(data.athlete.name || 'guest').replace(/[^\w\u0E00-\u0E7F]+/g, '_')}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error(err);
      alert('สร้างไฟล์ Excel ไม่สำเร็จ: ' + err.message);
    }
  }

  /* ---------- shared styles ---------- */
  const SARABUN = 'TH Sarabun New';
  const NAVY_DARK = 'FF0F172A', NAVY_MID = 'FF1E3A5F', NAVY_LIGHT = 'FF1E4976';
  const WHITE = 'FFFFFFFF', ALT_ROW = 'FFF8FAFC', BORDER_GRAY = 'FFCBD5E1';
  const ALICE_BLUE = 'FFF0F8FF', BEIGE = 'FFF5F5DC', BLANCHED_ALMOND = 'FFFFEBCD';
  const SUBTITLE_FG = 'FFBAE6FD';

  function fill(cell, argb) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }
  function border(cell, style, argb) {
    cell.border = {
      top: { style, color: { argb } },
      bottom: { style, color: { argb } },
      left: { style, color: { argb } },
      right: { style, color: { argb } }
    };
  }
  function font(cell, opts) {
    cell.font = Object.assign({ name: SARABUN, size: 14, color: { argb: 'FF000000' } }, opts || {});
  }

  /* ============================================================
   * SHEET 1 — Personal Report (replica template)
   * ============================================================ */
  function sheetPersonal(wb, { athlete, values, dateStr }) {
    const ws = wb.addWorksheet('Personal Report', {
      views: [{ showGridLines: false }],
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    ws.columns = [
      { width: 31.1 }, { width: 18.9 }, { width: 56.1 },
      { width: 18.6 }, { width: 14.4 }, { width: 9.8 }
    ];

    /* header */
    ws.mergeCells('A1:F1');
    const t = ws.getCell('A1');
    t.value = 'Computerized Cognitive Test Battery';
    fill(t, NAVY_MID); font(t, { bold: true, size: 20, color: { argb: WHITE } });
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 37.2;

    ws.mergeCells('A2:F2');
    const st = ws.getCell('A2');
    st.value = 'ชุดประเมินสมรรถภาพทางสมองสำหรับนักกีฬา';
    font(st, { size: 13, color: { argb: 'FF64748B' } });
    st.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 32.4;

    ws.mergeCells('A3:F3');
    const dept = ws.getCell('A3');
    dept.value = 'สำนักวิทยาศาสตร์การกีฬา กรมพลศึกษา กระทรวงการท่องเที่ยวและกีฬา';
    fill(dept, NAVY_LIGHT); font(dept, { size: 13, color: { argb: SUBTITLE_FG } });
    dept.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 28.8;

    /* ข้อมูลส่วนตัว (แถว 4-5 ตาม template) */
    const age = calcAge(athlete.dob);
    ws.getCell('A4').value = `ชื่อ ${athlete.name || '-'}`;
    ws.getCell('C4').value = `วันเกิด ${athlete.dob || '-'}`;
    ws.getCell('A5').value = `เพศ ${athlete.gender || '-'}`;
    ws.getCell('B5').value = `อายุ ${age || '-'} ปี`;
    ws.getCell('C5').value = `วันที่ทำการทดสอบ ${dateStr}`;
    ['A4', 'C4', 'A5', 'B5', 'C5'].forEach((a) => {
      const c = ws.getCell(a);
      c.alignment = { horizontal: 'left', vertical: 'middle' };
      font(c, { bold: true, size: 16 });
    });
    ws.getRow(4).height = 30;
    ws.getRow(5).height = 30.6;

    /* header แถว 6 */
    const h1 = ws.getCell('A6');
    h1.value = 'แบบทดสอบ\n(Cognitive tests)';
    fill(h1, NAVY_MID); font(h1, { bold: true, size: 13, color: { argb: WHITE } });
    h1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.mergeCells('B6:F6');
    const h2 = ws.getCell('B6');
    h2.value = 'ผลการทดสอบความสามารถทางสมอง\n(Results)';
    fill(h2, NAVY_MID); font(h2, { bold: true, size: 13, color: { argb: WHITE } });
    h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(6).height = 55;

    /* นิยามแถวข้อมูล 7-26: [row, B, C, key, numFmt, unit, dir] */
    const UNIT_MS = 'มิลลิวินาที\n(msec)', UNIT_PC = '%\n(Percentage)',
          UNIT_SEC = 'วินาที \n(Seconds)', UNIT_CNT = 'ครั้ง',
          UNIT_SCORE = 'คะแนน\n(Scores)';
    const LO = '(ค่าน้อยดี)', HI = '(ค่ามากดี)';
    const N0 = '#,##0', N4 = '#,##0.0000';

    const ROWS = [
      /* SRT 7-8 */ [7, '', '', 'SRT_AvgMs', N0, UNIT_MS, LO],
      [8, '', '', 'SRT_Acc', N0, UNIT_PC, HI],
      /* CRT 9-10 */
      [9, '', '', 'CRT_AvgMs', N0, UNIT_MS, LO],
      [10, '', '', 'CRT_Acc', N0, UNIT_PC, HI],
      /* TMT 11-16 */
      [11, 'A', 'เวลาที่ใช้ในการทดสอบ\n(Completion time)', 'TMT_A_Time', N4, UNIT_SEC, LO],
      [12, '', '', 'TMT_A_Err', N0, UNIT_CNT, LO],
      [13, 'B', 'เวลาที่ใช้ในการทดสอบ\n(Completion time)', 'TMT_B_Time', N4, UNIT_SEC, LO],
      [14, '', '', 'TMT_B_Err', N0, UNIT_CNT, LO],
      [15, 'B - A difference', '', 'TMT_Diff', N4, UNIT_SEC, LO],
      [16, 'B / A Ratio', 'อัตราส่วน\n(Ratio)', 'TMT_Ratio', N4, '', LO],
      /* Flanker 17-20 */
      [17, 'Congruent\n<<<<<\n>>>>>', '', 'FLK_Cong_RT', N0, UNIT_MS, LO],
      [18, '', '', 'FLK_Cong_Acc', N0, UNIT_PC, HI],
      [19, 'Incongruent\n<<><<\n>><>>', '', 'FLK_Incong_RT', N0, UNIT_MS, LO],
      [20, '', '', 'FLK_Incong_Acc', N0, UNIT_PC, HI],
      /* DF 21-24 */
      [21, 'Filled dots', 'จำนวนภาพที่ถูกต้อง\n(Number of correct unique designs)', 'DF_Filled', N0, UNIT_SCORE, HI],
      [22, 'Empty dots', 'จำนวนภาพที่ถูกต้อง\n(Number of correct unique designs)', 'DF_Empty', N0, UNIT_SCORE, HI],
      [23, 'Switching dots', 'จำนวนภาพที่ถูกต้อง\n(Number of correct unique designs)', 'DF_Switching', N0, UNIT_SCORE, HI],
      [24, 'Total score', 'จำนวนภาพที่ถูกต้องทั้งหมด\n(Total number of correct unique designs)', 'DF_Total', N0, UNIT_SCORE, HI],
      /* MRT/SVT 25-26 */
      [25, 'Total score', 'คะแนนที่ได้ทั้งหมด\n(Correct answer)', 'MRT_Score', N0, UNIT_SCORE, HI],
      [26, 'Total score', 'คะแนนที่ได้ทั้งหมด\n(Correct answer)', 'SVT_Score', N0, UNIT_SCORE, HI]
    ];

    /* สีพื้นคอลัมน์ D ตาม section (จาก GenerateReportFromSession) */
    const FILLS = {};
    for (let r = 7; r <= 10; r++) FILLS[r] = ALICE_BLUE;
    for (let r = 11; r <= 16; r++) FILLS[r] = BEIGE;
    for (let r = 17; r <= 20; r++) FILLS[r] = ALICE_BLUE;
    for (let r = 21; r <= 24; r++) FILLS[r] = BLANCHED_ALMOND;
    FILLS[25] = BEIGE; FILLS[26] = ALICE_BLUE;

    /* merge ชื่อแบบทดสอบ */
    [['A7:A8', 'เวลาปฏิกิริยาอย่างง่าย\n(Simple reaction time test)'],
     ['A9:A10', 'เวลาปฏิกิริยาแบบตัวเลือก\n(Choice reaction time test)'],
     ['A11:A16', 'เทรลเมคคิ่ง\n(Trail making test)'],
     ['A17:A20', 'แฟลงเกอร์\n(Flanker test)'],
     ['A21:A24', 'ความสามารถในการออกแบบรูปภาพที่ไม่ซ้ำกัน\n(Design fluency test)'],
     ['A25:A25', 'การหมุนภาพในใจ\n(Mental rotation test)'],
     ['A26:A26', 'ความสามารถด้านมิติสัมพันธ์\n(Spatial visualization test)']
    ].forEach(([range, text]) => {
      if (!range.includes(':')) {
        const c = ws.getCell(range.split(':')[0]);
        c.value = text;
        font(c, { bold: true, size: 13 });
        c.alignment = { vertical: 'middle', wrapText: true };
        return;
      }
      ws.mergeCells(range);
      const c = ws.getCell(range.split(':')[0]);
      c.value = text;
      font(c, { bold: true, size: 13 });
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });

    for (const [row, bTxt, cTxt, key, fmt, unit, dir] of ROWS) {
      const rIdx = row;

      if (bTxt) { const b = ws.getCell(`B${rIdx}`); b.value = bTxt; font(b, { bold: true, size: 12 }); b.alignment = { vertical: 'middle', wrapText: true }; }
      else { const b = ws.getCell(`B${rIdx}`); font(b); b.alignment = { vertical: 'middle' }; }
      if (cTxt) { const c = ws.getCell(`C${rIdx}`); c.value = cTxt; font(c, { size: 12, color: { argb: 'FF475569' } }); c.alignment = { vertical: 'middle', wrapText: true }; }

      /* ค่าที่วัดได้ (D) */
      const d = ws.getCell(`D${rIdx}`);
      const v = values[key];
      if (typeof v === 'number') d.value = Math.round(v * 10000) / 10000;
      fill(d, FILLS[rIdx]);
      font(d, { bold: true, size: 22 });
      d.alignment = { horizontal: 'center', vertical: 'middle' };
      d.numFmt = fmt;

      const e = ws.getCell(`E${rIdx}`);
      if (unit) { e.value = unit; font(e, { size: 11, color: { argb: 'FF475569' } }); e.alignment = { vertical: 'middle', wrapText: true }; }
      const f = ws.getCell(`F${rIdx}`);
      if (dir) { f.value = dir; font(f, { size: 10, italic: true, color: { argb: 'FF94A3B8' } }); f.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; }

      /* ความสูงแถวตาม template ต้นฉบับ: r7-24 = 45, r25-26 = 55 */
      ws.getRow(rIdx).height = rIdx <= 24 ? 45 : 55;
    }

    /* กรอบทั้งตาราง */
    for (let r = 6; r <= 26; r++) {
      for (let col = 1; col <= 6; col++) {
        border(ws.getRow(r).getCell(col), 'thin', BORDER_GRAY);
      }
    }
  }

  /* ============================================================
   * SHEET 2 — ผลการประเมินตามเกณฑ์ (replica GenerateReportWithNorms)
   * ============================================================ */
  function sheetNorms(wb, { athlete, groupName, ev, dateStr }) {
    const ws = wb.addWorksheet('ผลการประเมินตามเกณฑ์', {
      views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    const widths = [5, 24, 32, 8, 12, 14, 14, 14, 14, 14, 22, 10];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    /* Row 1 */
    ws.mergeCells('A1:L1');
    const r1 = ws.getCell('A1');
    r1.value = `ผู้รับการทดสอบ: ${athlete.name || '-'}   |   วันที่ทดสอบ: ${dateStr}   |   กลุ่มเกณฑ์อ้างอิง: ${groupName}`;
    fill(r1, NAVY_DARK); font(r1, { bold: true, size: 14, color: { argb: WHITE } });
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;

    /* Row 2 */
    ws.mergeCells('A2:L2');
    const today = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    const r2 = ws.getCell('A2');
    r2.value = `สำนักวิทยาศาสตร์การกีฬา กรมพลศึกษา  |  สร้างรายงาน: ${today}  |  Cognitive Test Battery System`;
    fill(r2, NAVY_LIGHT); font(r2, { size: 11, color: { argb: SUBTITLE_FG } });
    r2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 8;

    /* Row 4 headers */
    const headers = ['ลำดับ', 'หมวดหมู่', 'ตัวแปรที่วัด', 'หน่วย', 'ค่าที่วัดได้',
      'เกณฑ์ระดับ 5\n(ดีมาก)', 'เกณฑ์ระดับ 4\n(ดี)', 'เกณฑ์ระดับ 3\n(ปานกลาง)',
      'เกณฑ์ระดับ 2\n(พอใช้)', 'เกณฑ์ระดับ 1\n(ควรปรับปรุง)', 'ผลการประเมิน', 'คะแนน'];
    headers.forEach((h, i) => {
      const c = ws.getRow(4).getCell(i + 1);
      c.value = h;
      fill(c, NAVY_MID); font(c, { bold: true, size: 12, color: { argb: WHITE } });
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      border(c, 'medium', 'FF0F2942');
    });
    ws.getRow(4).height = 36;

    const levelArgb = (lv) => {
      const info = Norms.LEVEL_INFO[lv] || Norms.LEVEL_INFO[0];
      return { bg: 'FF' + info.bg.slice(1).toUpperCase(), fg: 'FF' + info.fg.slice(1).toUpperCase() };
    };
    const label3or5 = (item, lv) => {
      if (item.scaleLevels === 3) {
        return lv === 3 ? 'ดีมาก' : lv === 2 ? 'ปานกลาง' : lv === 1 ? 'ควรปรับปรุง' : 'ไม่มีเกณฑ์';
      }
      return lv > 0 ? Norms.levelLabel(lv) : 'ไม่มีเกณฑ์';
    };

    let rowIdx = 5, seq = 0, lastCat = '';
    for (const row of ev.rows) {
      if (row.item.category !== lastCat) {
        lastCat = row.item.category;
        ws.mergeCells(rowIdx, 1, rowIdx, 12);
        const c = ws.getRow(rowIdx).getCell(1);
        c.value = '  ' + lastCat;
        fill(c, NAVY_MID); font(c, { bold: true, size: 13, color: { argb: WHITE } });
        c.alignment = { vertical: 'middle' };
        ws.getRow(rowIdx).height = 22;
        rowIdx++;
        seq = 0;
      }
      seq++;
      const tested = row.value != null;
      const lvColors = levelArgb(row.level);
      const vals = [
        seq, row.item.category, row.item.name, row.item.unit,
        tested ? Number(Scoring.fmt(row.value, row.key)) : '—',
        row.item.score5 || '-', row.item.score4 || '-', row.item.score3 || '-',
        row.item.score2 || '-', row.item.score1 || '-'
      ];
      const r = ws.getRow(rowIdx);
      vals.forEach((v, i) => {
        const c = r.getCell(i + 1);
        c.value = v;
        fill(c, tested ? ((seq % 2 === 0) ? WHITE : ALT_ROW) : ALT_ROW);
        font(c, tested
          ? { size: 12, bold: i === 4 }
          : { size: 12, color: { argb: 'FF94A3B8' } });
        c.alignment = { horizontal: i <= 1 || i === 2 ? 'left' : 'center', vertical: 'middle' };
        border(c, 'hair', BORDER_GRAY);
      });
      const k = r.getCell(11);
      k.value = label3or5(row.item, row.level) + (row.level > 0 ? '' : '');
      fill(k, tested && row.level > 0 ? lvColors.bg : 'FFF1F5F9');
      font(k, { bold: true, size: 12, color: { argb: tested && row.level > 0 ? lvColors.fg : 'FF64748B' } });
      k.alignment = { horizontal: 'center', vertical: 'middle' };
      border(k, 'thin', 'FF94A3B8');
      const l = r.getCell(12);
      l.value = row.level > 0 ? row.level : (tested ? 'N/A' : 'ไม่มีข้อมูล');
      fill(l, tested && row.level > 0 ? lvColors.bg : 'FFF1F5F9');
      font(l, { bold: true, size: 13, color: { argb: tested && row.level > 0 ? lvColors.fg : 'FF64748B' } });
      l.alignment = { horizontal: 'center', vertical: 'middle' };
      border(l, 'thin', 'FF94A3B8');
      r.height = 20;
      rowIdx++;
    }

    /* แถวคะแนนรวม */
    rowIdx++;
    const tc = ev.totalItem;
    const tl = levelArgb(ev.totalLevel);
    const totalVals = ['★', '8. คะแนนรวม', tc ? tc.name : 'ระดับคะแนนรวมความสามารถทางสมอง', 'คะแนน',
      ev.totalScore,
      tc ? tc.score5 : '', tc ? tc.score4 : '', tc ? tc.score3 : '',
      tc ? tc.score2 : '', tc ? tc.score1 : ''];
    const trRow = ws.getRow(rowIdx);
    totalVals.forEach((v, i) => {
      const c = trRow.getCell(i + 1);
      c.value = v;
      fill(c, 'FFF0FDF4'); font(c, { bold: true, size: 13, color: { argb: 'FF14532D' } });
      c.alignment = { horizontal: i <= 2 ? 'left' : 'center', vertical: 'middle' };
      border(c, 'hair', BORDER_GRAY);
    });
    const k8 = trRow.getCell(11);
    k8.value = ev.totalLevel > 0 ? Norms.levelLabel(ev.totalLevel) : 'N/A';
    fill(k8, ev.totalLevel > 0 ? tl.bg : 'FFF1F5F9');
    font(k8, { bold: true, size: 13, color: { argb: ev.totalLevel > 0 ? tl.fg : 'FF64748B' } });
    k8.alignment = { horizontal: 'center', vertical: 'middle' };
    const l8 = trRow.getCell(12);
    l8.value = '-';
    fill(l8, 'FFF0FDF4'); font(l8, { size: 12, color: { argb: 'FF94A3B8' } });
    l8.alignment = { horizontal: 'center', vertical: 'middle' };
    /* ขอบเขียวบน-ล่าง */
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((col) => {
      const c = trRow.getCell(col);
      const hair = { style: 'hair', color: { argb: BORDER_GRAY } };
      c.border = {
        top: { style: 'medium', color: { argb: 'FF16A34A' } },
        bottom: { style: 'medium', color: { argb: 'FF16A34A' } },
        left: col === 1 ? { style: 'medium', color: { argb: 'FF16A34A' } } : hair,
        right: col === 12 ? { style: 'medium', color: { argb: 'FF16A34A' } } : hair
      };
    });
    trRow.height = 26;

    /* footer */
    rowIdx++;
    ws.mergeCells(rowIdx, 1, rowIdx, 12);
    const fn = ws.getRow(rowIdx).getCell(1);
    fn.value = `เกณฑ์อ้างอิง: ${groupName}  |  หมายเหตุ: คะแนน 5=ดีมาก, 4=ดี, 3=ปานกลาง, 2=พอใช้, 1=ควรปรับปรุง, N/A=ไม่มีเกณฑ์/ไม่ได้ทดสอบ`;
    font(fn, { size: 10, color: { argb: 'FF64748B' } });
    fn.alignment = { horizontal: 'left', vertical: 'middle' };
  }

  return { render };
})();
