/* ============================================================
 * backend/Code.gs — Google Apps Script Web App for CTB Logging
 * Deploy: Execute as Me, Access: Anyone (or Anyone with Google Account)
 * ============================================================ */

const CONFIG = {
  SHEET_NAME: 'Logs',
  MAX_ROWS: 50000,
  RATE_LIMIT: {
    PER_MIN: 10,
    PER_DAY: 100,
    WINDOW_MS: 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000
  },
  REQUIRED_FIELDS: ['name', 'dob', 'gender', 'education', 'groupName'],
  CORS_ORIGIN: 'https://www.cognitivetesting.me'
};

const HEADERS = [
  'timestamp',        // A
  'session_id',       // B
  'row_id',           // C
  'status',           // D
  'name',             // E
  'dob',              // F
  'gender',           // G
  'education',        // H
  'group_name',       // I
  'ip',               // J
  'user_agent',       // K
  'app_version',      // L
  'started_at',       // M
  'completed_at',     // N
  // Summary scores (21 metrics + total)
  'SRT_AvgMs', 'SRT_Acc',
  'CRT_AvgMs', 'CRT_Acc',
  'TMT_A_Time', 'TMT_A_Err', 'TMT_B_Time', 'TMT_B_Err', 'TMT_Diff', 'TMT_Ratio',
  'FLK_Cong_RT', 'FLK_Cong_Acc', 'FLK_Incong_RT', 'FLK_Incong_Acc', 'FLK_Interference',
  'DF_Filled', 'DF_Empty', 'DF_Switching', 'DF_Total',
  'MRT_Score', 'SVT_Score',
  'Total_Norm_Score', 'Total_Level',
  // Norm levels (1-5 each)
  'level_SRT_Avg', 'level_SRT_Acc',
  'level_CRT_Avg', 'level_CRT_Acc',
  'level_TMT_A_Time', 'level_TMT_A_Err', 'level_TMT_B_Time', 'level_TMT_B_Err', 'level_TMT_Diff', 'level_TMT_Ratio',
  'level_FLK_Cong_RT', 'level_FLK_Cong_Acc', 'level_FLK_Incong_RT', 'level_FLK_Incong_Acc', 'level_FLK_Interference',
  'level_DF_Filled', 'level_DF_Empty', 'level_DF_Switching', 'level_DF_Total',
  'level_MRT', 'level_SVT',
  'norm_group_used',  // AK
  // Raw trial data (JSON strings)
  'srt_trials', 'crt_trials', 'tmtA_nodes', 'tmtB_nodes', 'flanker_trials',
  'df_filled', 'df_empty', 'df_switching', 'mrt_trials', 'svt_trials'
];

const SUMMARY_KEYS = [
  'SRT_AvgMs', 'SRT_Acc',
  'CRT_AvgMs', 'CRT_Acc',
  'TMT_A_Time', 'TMT_A_Err', 'TMT_B_Time', 'TMT_B_Err', 'TMT_Diff', 'TMT_Ratio',
  'FLK_Cong_RT', 'FLK_Cong_Acc', 'FLK_Incong_RT', 'FLK_Incong_Acc', 'FLK_Interference',
  'DF_Filled', 'DF_Empty', 'DF_Switching', 'DF_Total',
  'MRT_Score', 'SVT_Score',
  'Total_Norm_Score', 'Total_Level'
];

const NORM_LEVEL_KEYS = [
  'level_SRT_Avg', 'level_SRT_Acc',
  'level_CRT_Avg', 'level_CRT_Acc',
  'level_TMT_A_Time', 'level_TMT_A_Err', 'level_TMT_B_Time', 'level_TMT_B_Err', 'level_TMT_Diff', 'level_TMT_Ratio',
  'level_FLK_Cong_RT', 'level_FLK_Cong_Acc', 'level_FLK_Incong_RT', 'level_FLK_Incong_Acc', 'level_FLK_Interference',
  'level_DF_Filled', 'level_DF_Empty', 'level_DF_Switching', 'level_DF_Total',
  'level_MRT', 'level_SVT'
];

const RAW_KEYS = [
  'srt_trials', 'crt_trials', 'tmtA_nodes', 'tmtB_nodes', 'flanker_trials',
  'df_filled', 'df_empty', 'df_switching', 'mrt_trials', 'svt_trials'
];

/* ---------- Entry Point ---------- */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // CORS preflight handling
    if (e.httpMethod === 'OPTIONS') {
      return corsResponse({});
    }
    
    // Honeypot check
    if (data.honeypot || data.website) {
      return corsResponse({ ok: false, error: 'Bot detected' }, 400);
    }
    
    // Rate limiting
    const ip = getClientIP(e);
    if (isRateLimited(ip)) {
      return corsResponse({ ok: false, error: 'Rate limit exceeded' }, 429);
    }
    
    const ss = SpreadsheetApp.openById(getSheetId());
    const sh = getOrCreateSheet(ss);
    
    // Check sheet capacity
    if (sh.getLastRow() >= CONFIG.MAX_ROWS) {
      return corsResponse({ ok: false, error: 'Sheet capacity reached' }, 507);
    }
    
    let result;
    if (data.action === 'create') {
      result = handleCreate(sh, data, ip);
    } else if (data.action === 'update') {
      result = handleUpdate(sh, data);
    } else {
      return corsResponse({ ok: false, error: 'Invalid action' }, 400);
    }
    
    recordRequest(ip);
    return corsResponse(result);
    
  } catch (err) {
    console.error('doPost error:', err);
    return corsResponse({ ok: false, error: err.message }, 500);
  }
}

function doGet(e) {
  // Health check endpoint
  return corsResponse({ ok: true, service: 'CTB Logger', time: new Date().toISOString() });
}

function doOptions(e) {
  // Handle CORS preflight requests
  return corsResponse({});
}

/* ---------- Handlers ---------- */
function handleCreate(sh, data, ip) {
  // Validate required fields
  for (const field of CONFIG.REQUIRED_FIELDS) {
    if (!data.meta?.[field]) {
      return { ok: false, error: `Missing required field: ${field}` };
    }
  }
  
  const sessionId = data.meta.sessionId || Utilities.getUuid();
  const rowId = sh.getLastRow() + 1; // 1-indexed, header is row 1
  const now = new Date();
  
  const row = buildRow({
    sessionId,
    rowId,
    status: 'started',
    meta: data.meta,
    ip,
    summary: data.summary || {},
    raw: data.raw || {},
    normLevels: data.normLevels || {},
    normGroup: data.meta.groupName,
    startedAt: data.meta.startedAt || now.toISOString(),
    completedAt: ''
  });
  
  sh.appendRow(row);
  
  // Initialize rate limit counters for this IP
  initRateLimit(ip);
  
  return { ok: true, rowId, sessionId };
}

function handleUpdate(sh, data) {
  if (!data.rowId || typeof data.rowId !== 'number') {
    return { ok: false, error: 'Invalid rowId' };
  }
  
  const rowIdx = findRowById(sh, data.rowId);
  if (!rowIdx) {
    return { ok: false, error: 'Row not found' };
  }
  
  const now = new Date();
  const row = buildRow({
    sessionId: '', // keep existing
    rowId: data.rowId,
    status: data.status || 'testing',
    meta: data.meta || {},
    ip: '',
    summary: data.summary || {},
    raw: data.raw || {},
    normLevels: data.normLevels || {},
    normGroup: data.normGroup || '',
    startedAt: '',
    completedAt: data.completedAt || (data.status === 'completed' ? now.toISOString() : '')
  });
  
  // Update only non-empty values, preserve existing
  const existingRow = sh.getRange(rowIdx, 1, 1, HEADERS.length).getValues()[0];
  const mergedRow = mergeRows(existingRow, row);
  
  sh.getRange(rowIdx, 1, 1, HEADERS.length).setValues([mergedRow]);
  
  return { ok: true };
}

/* ---------- Row Building ---------- */
function buildRow(params) {
  const {
    sessionId, rowId, status, meta, ip, summary, raw, normLevels, normGroup,
    startedAt, completedAt
  } = params;
  
  const row = new Array(HEADERS.length).fill('');
  const now = new Date();
  
  // Metadata columns (A-N)
  row[0] = now;                                    // timestamp
  row[1] = sessionId;                              // session_id
  row[2] = rowId;                                  // row_id
  row[3] = status;                                 // status
  row[4] = meta.name || '';                        // name
  row[5] = meta.dob || '';                         // dob
  row[6] = meta.gender || '';                      // gender
  row[7] = meta.education || '';                   // education
  row[8] = meta.groupName || normGroup || '';      // group_name
  row[9] = ip || meta.ip || '';                    // ip
  row[10] = meta.userAgent || '';                  // user_agent
  row[11] = meta.appVersion || '';                 // app_version
  row[12] = startedAt;                             // started_at
  row[13] = completedAt;                           // completed_at
  
  // Summary scores (O-AK) - indices 14-35
  SUMMARY_KEYS.forEach((key, i) => {
    row[14 + i] = summary[key] ?? '';
  });
  
  // Norm levels (AL-AV) - indices 36-56
  NORM_LEVEL_KEYS.forEach((key, i) => {
    row[36 + i] = normLevels[key] ?? '';
  });
  
  // Norm group used (AW) - index 57
  row[57] = normGroup;
  
  // Raw trial data (AX-BG) - indices 58-67
  RAW_KEYS.forEach((key, i) => {
    const val = raw[key];
    row[58 + i] = val ? JSON.stringify(val) : '';
  });
  
  return row;
}

function mergeRows(existing, updated) {
  // Preserve existing non-empty values, overlay updated non-empty values
  return existing.map((val, i) => {
    const newVal = updated[i];
    return (newVal !== '' && newVal !== null && newVal !== undefined) ? newVal : val;
  });
}

/* ---------- Sheet Management ---------- */
function getSheetId() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  if (!id) {
    // Try to get from active spreadsheet if bound
    try {
      id = SpreadsheetApp.getActiveSpreadsheet().getId();
      props.setProperty('SHEET_ID', id);
    } catch (e) {
      throw new Error('SHEET_ID not configured. Set in Script Properties.');
    }
  }
  return id;
}

function getOrCreateSheet(ss) {
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    // Freeze header row
    sh.setFrozenRows(1);
    // Set column widths for readability
    sh.setColumnWidths(1, 14, 150);   // metadata
    sh.setColumnWidths(15, 22, 100);  // summary
    sh.setColumnWidths(37, 21, 80);   // norm levels
    sh.setColumnWidth(58, 200);       // norm group
    sh.setColumnWidths(59, 10, 300);  // raw JSON
  }
  return sh;
}

function createSheetWithHeaders(ss) {
  const sh = ss.insertSheet(CONFIG.SHEET_NAME);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sh.setFrozenRows(1);
  return sh;
}

/* ---------- Rate Limiting ---------- */
function getClientIP(e) {
  // Try to get real IP from headers (when behind proxy)
  const headers = e.headers || {};
  return headers['X-Forwarded-For']?.split(',')[0]?.trim() ||
         headers['X-Real-IP'] ||
         'unknown';
}

function isRateLimited(ip) {
  if (ip === 'unknown') return false;
  
  const cache = CacheService.getScriptCache();
  const minKey = `rl_min_${ip}`;
  const dayKey = `rl_day_${ip}`;
  
  const minCount = parseInt(cache.get(minKey) || '0', 10);
  const dayCount = parseInt(cache.get(dayKey) || '0', 10);
  
  return minCount >= CONFIG.RATE_LIMIT.PER_MIN || dayCount >= CONFIG.RATE_LIMIT.PER_DAY;
}

function recordRequest(ip) {
  if (ip === 'unknown') return;
  
  const cache = CacheService.getScriptCache();
  const minKey = `rl_min_${ip}`;
  const dayKey = `rl_day_${ip}`;
  
  const minCount = parseInt(cache.get(minKey) || '0', 10) + 1;
  const dayCount = parseInt(cache.get(dayKey) || '0', 10) + 1;
  
  cache.put(minKey, minCount.toString(), 60); // 1 minute
  cache.put(dayKey, dayCount.toString(), 24 * 60 * 60); // 24 hours
}

function initRateLimit(ip) {
  if (ip === 'unknown') return;
  const cache = CacheService.getScriptCache();
  cache.put(`rl_min_${ip}`, '1', 60);
  cache.put(`rl_day_${ip}`, '1', 24 * 60 * 60);
}

function findRowById(sh, rowId) {
  // Column C (index 2) = row_id
  const data = sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === rowId) {
      return i + 2; // 1-indexed, +1 for header
    }
  }
  return null;
}

/* ---------- CORS Helper ---------- */
function corsResponse(data, status = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
}

/* ---------- Setup Helper (run once) ---------- */
function setupSheet() {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sh = getOrCreateSheet(ss);
  console.log('Sheet ready:', sh.getUrl());
  return sh.getUrl();
}

function testCreate() {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sh = getOrCreateSheet(ss);
  
  const testData = {
    action: 'create',
    meta: {
      sessionId: 'test-' + Date.now(),
      name: 'Test User',
      dob: '2000-01-01',
      gender: 'M',
      education: 'M1-3',
      groupName: 'ชาย ม.1-3',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      appVersion: '1.0.0',
      startedAt: new Date().toISOString()
    },
    summary: { SRT_AvgMs: 250, SRT_Acc: 100 },
    raw: {},
    normLevels: {},
    normGroup: 'ชาย ม.1-3'
  };
  
  const result = handleCreate(sh, testData, '127.0.0.1');
  console.log('Test create result:', result);
  return result;
}