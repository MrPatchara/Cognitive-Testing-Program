/* ============================================================
 * scoring.js — คำนวณคะแนน 21 ตัวชี้วัด + คะแนนรวม
 * port จาก TestScores.BuildFromMainWindow() + CognitiveTestBatteryReport
 * ============================================================ */
'use strict';

const Scoring = (() => {

  const KEYS = {
    SRT_AVG: 'SRT_AvgMs',   SRT_ACC: 'SRT_Acc',
    CRT_AVG: 'CRT_AvgMs',   CRT_ACC: 'CRT_Acc',
    TMT_A_TIME: 'TMT_A_Time', TMT_A_ERR: 'TMT_A_Err',
    TMT_B_TIME: 'TMT_B_Time', TMT_B_ERR: 'TMT_B_Err',
    TMT_DIFF: 'TMT_Diff',   TMT_RATIO: 'TMT_Ratio',
    FLK_CONG_RT: 'FLK_Cong_RT',   FLK_CONG_ACC: 'FLK_Cong_Acc',
    FLK_INCONG_RT: 'FLK_Incong_RT', FLK_INCONG_ACC: 'FLK_Incong_Acc',
    FLK_INTER: 'FLK_Interference',
    DF_FILLED: 'DF_Filled', DF_EMPTY: 'DF_Empty',
    DF_SWITCH: 'DF_Switching', DF_TOTAL: 'DF_Total',
    MRT: 'MRT_Score', SVT: 'SVT_Score',
    TOTAL: 'Total_Norm_Score'
  };

  const LOWER_IS_BETTER = new Set([
    KEYS.SRT_AVG, KEYS.CRT_AVG,
    KEYS.TMT_A_TIME, KEYS.TMT_A_ERR, KEYS.TMT_B_TIME, KEYS.TMT_B_ERR,
    KEYS.TMT_DIFF, KEYS.TMT_RATIO,
    KEYS.FLK_CONG_RT, KEYS.FLK_INCONG_RT, KEYS.FLK_INTER
  ]);

  const fmt = (v, key) => {
    if (v == null) return '—';
    const dec = (key === KEYS.TMT_A_TIME || key === KEYS.TMT_B_TIME ||
                 key === KEYS.TMT_DIFF || key === KEYS.TMT_RATIO) ? 3 : 1;
    return Number(v).toFixed(dec);
  };

  /**
   * results = {
   *   srt:     [{no, rt(ms หลังหัก interval), ok}...]      (20)
   *   crt:     [{no, rt|0, ok, color:'B'|'R'|'Y'|'G'}...] (60)
   *   tmtA:    {timeSec, errors} | null
   *   tmtB:    {timeSec, errors} | null
   *   flanker: [{no, rt, ok, type:'Congruent'|'Incongruent'}...]
   *   dfFilled / dfEmpty / dfSwitching: number (designs ที่ถูกต้อง)
   *   mrt: number, svt: number
   * }
   */
  function compute(results) {
    const v = {};

    try {
      /* 1. SRT — เฉลี่ย RT ของ trial ไม่ซ้ำ */
      if (Array.isArray(results.srt) && results.srt.length) {
        const seen = new Set(); let totalRt = 0, correct = 0;
        for (const it of results.srt) {
          if (seen.has(it.no)) continue;
          seen.add(it.no);
          totalRt += it.rt;
          if (it.ok) correct++;
        }
        const d = seen.size || 20;
        v[KEYS.SRT_AVG] = totalRt / d;
        v[KEYS.SRT_ACC] = correct * 100 / d;
      }

      /* 2. CRT — เฉลี่ย RT เฉพาะสีที่ต้องตอบ (ไม่นับเหลือง), acc จาก 60 */
      if (Array.isArray(results.crt) && results.crt.length) {
        const seen = new Set(); let totalRt = 0, correct = 0;
        for (const it of results.crt) {
          if (seen.has(it.no)) continue;
          seen.add(it.no);
          if (it.ok) correct++;
          if (it.color !== 'Y') totalRt += it.rt;
        }
        v[KEYS.CRT_AVG] = totalRt / 40;
        v[KEYS.CRT_ACC] = correct * 100 / 60;
      }

      /* 3-4. TMT A/B + Diff/Ratio */
      let aT = 0, bT = 0;
      if (results.tmtA) { aT = results.tmtA.timeSec; v[KEYS.TMT_A_TIME] = aT; v[KEYS.TMT_A_ERR] = results.tmtA.errors; }
      if (results.tmtB) { bT = results.tmtB.timeSec; v[KEYS.TMT_B_TIME] = bT; v[KEYS.TMT_B_ERR] = results.tmtB.errors; }
      if (aT > 0 && bT > 0) {
        v[KEYS.TMT_DIFF] = bT - aT;
        v[KEYS.TMT_RATIO] = bT / aT;
      }

      /* 5. Flanker */
      if (Array.isArray(results.flanker) && results.flanker.length) {
        const seen = new Set();
        let cRt = 0, iRt = 0, cOk = 0, iOk = 0, cN = 0, iN = 0;
        for (const it of results.flanker) {
          if (seen.has(it.no)) continue;
          seen.add(it.no);
          if (it.type === 'Congruent') { cN++; cRt += it.rt; if (it.ok) cOk++; }
          else { iN++; iRt += it.rt; if (it.ok) iOk++; }
        }
        if (cN > 0) {
          const cong = cRt / cN;
          v[KEYS.FLK_CONG_RT] = cong;
          v[KEYS.FLK_CONG_ACC] = cOk * 100 / cN;
          if (iN > 0) {
            const inc = iRt / iN;
            v[KEYS.FLK_INCONG_RT] = inc;
            v[KEYS.FLK_INCONG_ACC] = iOk * 100 / iN;
            v[KEYS.FLK_INTER] = inc - cong;
          }
        }
      }

      /* 6-8. Design Fluency */
      const df1 = results.dfFilled | 0, df2 = results.dfEmpty | 0, df3 = results.dfSwitching | 0;
      if (results.didDF) {
        v[KEYS.DF_FILLED] = df1; v[KEYS.DF_EMPTY] = df2; v[KEYS.DF_SWITCH] = df3;
        v[KEYS.DF_TOTAL] = df1 + df2 + df3;
      }

      /* 9-10. MRT / SVT */
      if (results.mrt != null) v[KEYS.MRT] = results.mrt;
      if (results.svt != null) v[KEYS.SVT] = results.svt;
    } catch (e) { console.error('scoring error', e); }

    return v;
  }

  /**
   * ประเมินทุกตัวชี้วัดกับเกณฑ์ → แถวรายงาน + คะแนนรวม
   * returns { rows:[{item, value, level}], totalScore, totalLevel }
   */
  function evaluateAll(values, groupName) {
    const dict = Norms.getDict(groupName);
    const order = [
      KEYS.SRT_AVG, KEYS.SRT_ACC,
      KEYS.CRT_AVG, KEYS.CRT_ACC,
      KEYS.TMT_A_TIME, KEYS.TMT_A_ERR, KEYS.TMT_B_TIME, KEYS.TMT_B_ERR, KEYS.TMT_DIFF, KEYS.TMT_RATIO,
      KEYS.FLK_CONG_RT, KEYS.FLK_CONG_ACC, KEYS.FLK_INCONG_RT, KEYS.FLK_INCONG_ACC, KEYS.FLK_INTER,
      KEYS.DF_FILLED, KEYS.DF_EMPTY, KEYS.DF_SWITCH, KEYS.DF_TOTAL,
      KEYS.MRT, KEYS.SVT
    ];
    const rows = [];
    let totalSum = 0, totalCount = 0;
    for (const key of order) {
      const item = dict[key.toLowerCase()];
      if (!item) continue;
      const val = values[key];
      const has = typeof val === 'number';
      const level = has ? Norms.evaluate(item, val) : 0;
      if (has && level > 0) { totalSum += level; totalCount++; }
      rows.push({ item, key, value: has ? val : null, level });
    }
    /* คะแนนรวม = ผลรวมระดับคะแนน (port จาก totalLevelSum) */
    const totalItem = dict[KEYS.TOTAL.toLowerCase()];
    const totalScore = totalSum;
    const totalLevel = (totalCount > 0 && totalItem) ? Norms.evaluate(totalItem, totalScore) : 0;
    return { rows, totalScore, totalCount, totalLevel, totalItem };
  }

  /**
   * ประเมินแบบ "ไม่เทียบเกณฑ์" — ให้โครงแถวครบ 21 ตัวชี้วัด (ชื่อ/หน่วย/หมวด
   * จาก schema ค่าเริ่มต้น) พร้อมค่าดิบ · level = 0 ทั้งหมด
   * ใช้สร้างรายงาน/Power Card กรณีผู้ใช้ไม่เลือกกลุ่มเกณฑ์
   */
  function evaluateRaw(values) {
    const dict = Norms.getDict('ชาย ม.1-3'); /* ใช้เฉพาะ metadata — ไม่ใช้ตัดเกณฑ์ */
    const order = [
      KEYS.SRT_AVG, KEYS.SRT_ACC,
      KEYS.CRT_AVG, KEYS.CRT_ACC,
      KEYS.TMT_A_TIME, KEYS.TMT_A_ERR, KEYS.TMT_B_TIME, KEYS.TMT_B_ERR, KEYS.TMT_DIFF, KEYS.TMT_RATIO,
      KEYS.FLK_CONG_RT, KEYS.FLK_CONG_ACC, KEYS.FLK_INCONG_RT, KEYS.FLK_INCONG_ACC, KEYS.FLK_INTER,
      KEYS.DF_FILLED, KEYS.DF_EMPTY, KEYS.DF_SWITCH, KEYS.DF_TOTAL,
      KEYS.MRT, KEYS.SVT
    ];
    const rows = [];
    let tested = 0;
    for (const key of order) {
      const item = dict[key.toLowerCase()];
      if (!item) continue;
      const val = values[key];
      const has = typeof val === 'number';
      if (has) tested++;
      rows.push({ item, key, value: has ? val : null, level: 0 });
    }
    return {
      rows, totalScore: 0, totalCount: tested, totalLevel: 0,
      totalItem: dict[KEYS.TOTAL.toLowerCase()] || null, noNorm: true
    };
  }

  return { KEYS, LOWER_IS_BETTER, compute, evaluateAll, evaluateRaw, fmt };
})();
