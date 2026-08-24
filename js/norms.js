/* ============================================================
 * norms.js — เกณฑ์มาตรฐาน DPE (กรมพลศึกษา) 4 กลุ่ม
 * แปลงจาก AthleteRepository.GetDefaultNormativeStandards()
 * ระดับคะแนน: 5=ดีมาก, 4=ดี, 3=ปานกลาง, 2=พอใช้, 1=ควรปรับปรุง
 * 3 ระดับ: 3=ดีมาก(หรือถูกต้อง), 2=พอใช้/ปานกลาง, 1=ควรปรับปรุง
 * ============================================================ */
'use strict';

const Norms = (() => {

  const CAT = {
    SRT: '1. SRT (เวลาปฏิกิริยาอย่างง่าย)',
    CRT: '2. CRT (เวลาปฏิกิริยาแบบตัวเลือก)',
    TMT: '3. TMT (เทรลเมคกิ้ง)',
    FLK: '4. FKT (แฟลงเกอร์)',
    DF:  '5. DFT (การออกแบบรูปภาพ)',
    MRT: '6. MRT (การหมุนภาพในใจ)',
    SVT: '7. SVT (มิติสัมพันธ์)',
    TOTAL: '8. คะแนนรวม (ความสามารถทางสมอง)'
  };

  /* helper: n(key,cat,name,unit,lower,scale,[s5,s4,s3,s2,s1]) */
  function n(key, cat, name, unit, lower, scale, cuts) {
    return {
      key, category: cat, name, unit,
      lowerIsBetter: lower, scaleLevels: scale,
      score5: cuts[0] || '', score4: cuts[1] || '',
      score3: cuts[2] || '', score2: cuts[3] || '',
      score1: cuts[4] || ''
    };
  }

  const TOTAL_CUTS = ['>= 72', '59 - 71', '46 - 58', '33 - 45', '<= 32'];

  /* ---------- กลุ่ม ช.1-3 (ชาย ม.1-3) ---------- */
  const MALE_M13 = [
    n('SRT_AvgMs',   CAT.SRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 224', '225 - 264', '265 - 304', '305 - 344', '>= 345']),
    n('SRT_Acc',     CAT.SRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '100%', '95 - 99%', '<= 94%']),
    n('CRT_AvgMs',   CAT.CRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 375', '376 - 419', '420 - 464', '465 - 508', '>= 509']),
    n('CRT_Acc',     CAT.CRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '96 - 100%', '83 - 95%', '<= 82%']),
    n('TMT_A_Time',  CAT.TMT, 'TMT-A เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 25.19', '25.20 - 34.09', '34.10 - 43.37', '43.38 - 52.67', '>= 52.68']),
    n('TMT_A_Err',   CAT.TMT, 'TMT-A จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 2 ครั้ง', '>= 3 ครั้ง']),
    n('TMT_B_Time',  CAT.TMT, 'TMT-B เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 43.46', '43.47 - 68.75', '68.76 - 93.76', '93.77 - 119.19', '>= 119.20']),
    n('TMT_B_Err',   CAT.TMT, 'TMT-B จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 - 1 ครั้ง', '2 - 12 ครั้ง', '>= 13 ครั้ง']),
    n('TMT_Diff',    CAT.TMT, 'เวลาส่วนต่าง (Difference B-A)',   'วินาที',  true, 5, ['<= 16.34', '16.35 - 34.51', '34.52 - 51.68', '51.69 - 70.30', '>= 70.31']),
    n('TMT_Ratio',   CAT.TMT, 'อัตราส่วนเวลา (Ratio B/A)',        'อัตราส่วน', true, 5, ['<= 1.40', '1.41 - 1.85', '1.86 - 2.30', '2.31 - 2.73', '>= 2.74']),
    n('FLK_Cong_RT', CAT.FLK, 'เวลาตอบสนองสอดคล้อง (Congruent RT)', 'ms',   true, 5, ['<= 348', '349 - 407', '408 - 466', '467 - 524', '>= 525']),
    n('FLK_Cong_Acc',CAT.FLK, 'อัตราความถูกต้องสอดคล้อง (Congruent Acc)', '%', false, 3, ['', '', '100%', '90 - 99%', '<= 89%']),
    n('FLK_Incong_RT', CAT.FLK, 'เวลาตอบสนองขัดแย้ง (Incongruent RT)', 'ms', true, 5, ['<= 397', '398 - 463', '464 - 532', '533 - 602', '>= 603']),
    n('FLK_Incong_Acc', CAT.FLK, 'อัตราความถูกต้องขัดแย้ง (Incongruent Acc)', '%', false, 3, ['', '', '90 - 100%', '61 - 89%', '<= 60%']),
    n('FLK_Interference', CAT.FLK, 'ผลกระทบจากการรบกวน (Interference Cost)', 'ms', true, 5, ['<= 64', '65 - 80', '81 - 100', '101 - 120', '>= 121']),
    n('DF_Filled',   CAT.DF,  'จุดสีทึบ (Filled Dots)',           'รูป',     false, 5, ['>= 12', '9 - 11', '7 - 8', '5 - 6', '0 - 4']),
    n('DF_Empty',    CAT.DF,  'จุดสีโปร่ง (Empty Dots)',          'รูป',     false, 5, ['>= 12', '10 - 11', '8 - 9', '6 - 7', '0 - 5']),
    n('DF_Switching', CAT.DF, 'สลับจุดสีทึบ-โปร่ง (Switching Dots)', 'รูป',  false, 5, ['>= 10', '7 - 9', '4 - 6', '1 - 3', '0']),
    n('DF_Total',    CAT.DF,  'จำนวนภาพที่ถูกต้องรวม (Total)',    'รูป',     false, 5, ['>= 31', '25 - 30', '19 - 24', '13 - 18', '0 - 12']),
    n('MRT_Score',   CAT.MRT, 'คะแนนการทดสอบ (MRT Score)',        'คะแนน',   false, 5, ['14 - 24', '10 - 13', '6 - 9', '2 - 5', '0 - 1']),
    n('SVT_Score',   CAT.SVT, 'คะแนนการทดสอบ (SVT Score)',        'คะแนน',   false, 5, ['16 - 30', '12 - 15', '7 - 11', '3 - 6', '0 - 2'])
  ];

  /* ---------- กลุ่ม หญิง ม.1-3 ---------- */
  const FEMALE_M13 = [
    n('SRT_AvgMs',   CAT.SRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 215', '216 - 272', '273 - 330', '331 - 385', '>= 386']),
    n('SRT_Acc',     CAT.SRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '100%', '91 - 99%', '<= 90%']),
    n('CRT_AvgMs',   CAT.CRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 353', '354 - 420', '421 - 488', '489 - 555', '>= 556']),
    n('CRT_Acc',     CAT.CRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '98 - 100%', '83 - 97%', '<= 82%']),
    n('TMT_A_Time',  CAT.TMT, 'TMT-A เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 24.25', '24.26 - 34.11', '34.12 - 44.29', '44.30 - 57.47', '>= 57.48']),
    n('TMT_A_Err',   CAT.TMT, 'TMT-A จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 2 ครั้ง', '>= 3 ครั้ง']),
    n('TMT_B_Time',  CAT.TMT, 'TMT-B เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 39.09', '39.10 - 67.85', '67.86 - 96.03', '96.04 - 124.25', '>= 124.26']),
    n('TMT_B_Err',   CAT.TMT, 'TMT-B จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 7 ครั้ง', '>= 8 ครั้ง']),
    n('TMT_Diff',    CAT.TMT, 'เวลาส่วนต่าง (Difference B-A)',   'วินาที',  true, 5, ['<= 5.85', '5.86 - 30.29', '30.30 - 54.47', '54.48 - 78.60', '>= 78.61']),
    n('TMT_Ratio',   CAT.TMT, 'อัตราส่วนเวลา (Ratio B/A)',        'อัตราส่วน', true, 5, ['<= 1.13', '1.14 - 1.73', '1.74 - 2.35', '2.36 - 2.97', '>= 2.98']),
    n('FLK_Cong_RT', CAT.FLK, 'เวลาตอบสนองสอดคล้อง (Congruent RT)', 'ms',   true, 5, ['<= 345', '346 - 420', '421 - 499', '500 - 577', '>= 578']),
    n('FLK_Cong_Acc',CAT.FLK, 'อัตราความถูกต้องสอดคล้อง (Congruent Acc)', '%', false, 3, ['', '', '96 - 100%', '81 - 95%', '<= 80%']),
    n('FLK_Incong_RT', CAT.FLK, 'เวลาตอบสนองขัดแย้ง (Incongruent RT)', 'ms', true, 5, ['<= 395', '396 - 475', '476 - 555', '556 - 634', '>= 635']),
    n('FLK_Incong_Acc', CAT.FLK, 'อัตราความถูกต้องขัดแย้ง (Incongruent Acc)', '%', false, 3, ['', '', '86 - 100%', '60 - 85%', '<= 59%']),
    n('FLK_Interference', CAT.FLK, 'ผลกระทบจากการรบกวน (Interference Cost)', 'ms', true, 5, ['<= 50', '51 - 75', '76 - 100', '101 - 125', '>= 126']),
    n('DF_Filled',   CAT.DF,  'จุดสีทึบ (Filled Dots)',           'รูป',     false, 5, ['>= 12', '9 - 11', '6 - 8', '4 - 5', '0 - 3']),
    n('DF_Empty',    CAT.DF,  'จุดสีโปร่ง (Empty Dots)',          'รูป',     false, 5, ['>= 14', '10 - 13', '7 - 9', '4 - 6', '0 - 3']),
    n('DF_Switching', CAT.DF, 'สลับจุดสีทึบ-โปร่ง (Switching Dots)', 'รูป',  false, 5, ['>= 10', '7 - 9', '5 - 6', '2 - 4', '0 - 1']),
    n('DF_Total',    CAT.DF,  'จำนวนภาพที่ถูกต้องรวม (Total)',    'รูป',     false, 5, ['>= 32', '25 - 31', '18 - 24', '11 - 17', '0 - 10']),
    n('MRT_Score',   CAT.MRT, 'คะแนนการทดสอบ (MRT Score)',        'คะแนน',   false, 5, ['11 - 24', '8 - 10', '5 - 7', '2 - 4', '0 - 1']),
    n('SVT_Score',   CAT.SVT, 'คะแนนการทดสอบ (SVT Score)',        'คะแนน',   false, 5, ['16 - 30', '11 - 15', '6 - 10', '1 - 5', '0'])
  ];

  /* ---------- กลุ่ม ช.4-6 ---------- */
  const MALE_M46 = [
    n('SRT_AvgMs',   CAT.SRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 214', '215 - 258', '259 - 303', '304 - 349', '>= 350']),
    n('SRT_Acc',     CAT.SRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '100%', '91 - 99%', '<= 90%']),
    n('CRT_AvgMs',   CAT.CRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 338', '339 - 395', '396 - 454', '455 - 513', '>= 514']),
    n('CRT_Acc',     CAT.CRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '100%', '85 - 99%', '<= 84%']),
    n('TMT_A_Time',  CAT.TMT, 'TMT-A เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 22.80', '22.81 - 30.81', '30.82 - 39.07', '39.08 - 47.07', '>= 47.08']),
    n('TMT_A_Err',   CAT.TMT, 'TMT-A จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 2 ครั้ง', '>= 3 ครั้ง']),
    n('TMT_B_Time',  CAT.TMT, 'TMT-B เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 37.67', '37.68 - 60.44', '60.45 - 83.58', '83.59 - 106.26', '>= 106.27']),
    n('TMT_B_Err',   CAT.TMT, 'TMT-B จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 9 ครั้ง', '>= 10 ครั้ง']),
    n('TMT_Diff',    CAT.TMT, 'เวลาส่วนต่าง (Difference B-A)',   'วินาที',  true, 5, ['<= 6.83', '6.84 - 25.23', '25.24 - 49.84', '49.85 - 71.87', '>= 71.88']),
    n('TMT_Ratio',   CAT.TMT, 'อัตราส่วนเวลา (Ratio B/A)',        'อัตราส่วน', true, 5, ['<= 1.09', '1.10 - 1.76', '1.77 - 2.43', '2.44 - 3.10', '>= 3.11']),
    n('FLK_Cong_RT', CAT.FLK, 'เวลาตอบสนองสอดคล้อง (Congruent RT)', 'ms',   true, 5, ['<= 299', '300 - 377', '378 - 458', '459 - 539', '>= 540']),
    n('FLK_Cong_Acc',CAT.FLK, 'อัตราความถูกต้องสอดคล้อง (Congruent Acc)', '%', false, 3, ['', '', '100%', '95 - 99%', '<= 94%']),
    n('FLK_Incong_RT', CAT.FLK, 'เวลาตอบสนองขัดแย้ง (Incongruent RT)', 'ms', true, 5, ['<= 363', '364 - 438', '439 - 513', '514 - 587', '>= 588']),
    n('FLK_Incong_Acc', CAT.FLK, 'อัตราความถูกต้องขัดแย้ง (Incongruent Acc)', '%', false, 3, ['', '', '91 - 100%', '70 - 90%', '<= 69%']),
    n('FLK_Interference', CAT.FLK, 'ผลกระทบจากการรบกวน (Interference Cost)', 'ms', true, 5, ['<= 64', '65 - 80', '81 - 100', '101 - 120', '>= 121']),
    n('DF_Filled',   CAT.DF,  'จุดสีทึบ (Filled Dots)',           'รูป',     false, 5, ['>= 13', '10 - 12', '8 - 9', '5 - 7', '0 - 4']),
    n('DF_Empty',    CAT.DF,  'จุดสีโปร่ง (Empty Dots)',          'รูป',     false, 5, ['>= 15', '12 - 14', '9 - 11', '5 - 8', '0 - 4']),
    n('DF_Switching', CAT.DF, 'สลับจุดสีทึบ-โปร่ง (Switching Dots)', 'รูป',  false, 5, ['>= 13', '9 - 12', '5 - 8', '2 - 4', '0 - 1']),
    n('DF_Total',    CAT.DF,  'จำนวนภาพที่ถูกต้องรวม (Total)',    'รูป',     false, 5, ['>= 39', '30 - 38', '21 - 29', '12 - 20', '0 - 11']),
    n('MRT_Score',   CAT.MRT, 'คะแนนการทดสอบ (MRT Score)',        'คะแนน',   false, 5, ['16 - 24', '12 - 15', '7 - 11', '3 - 6', '0 - 2']),
    n('SVT_Score',   CAT.SVT, 'คะแนนการทดสอบ (SVT Score)',        'คะแนน',   false, 5, ['20 - 30', '15 - 19', '9 - 14', '3 - 8', '0 - 2'])
  ];

  /* ---------- กลุ่ม หญิง ม.4-6 ---------- */
  const FEMALE_M46 = [
    n('SRT_AvgMs',   CAT.SRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 214', '215 - 266', '267 - 320', '321 - 373', '>= 374']),
    n('SRT_Acc',     CAT.SRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '100%', '95 - 99%', '<= 94%']),
    n('CRT_AvgMs',   CAT.CRT, 'เวลาตอบสนองเฉลี่ย',              'ms',     true, 5, ['<= 331', '332 - 401', '402 - 476', '477 - 551', '>= 552']),
    n('CRT_Acc',     CAT.CRT, 'อัตราความถูกต้อง',                '%',      false, 3, ['', '', '100%', '85 - 99%', '<= 84%']),
    n('TMT_A_Time',  CAT.TMT, 'TMT-A เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 22.52', '22.53 - 31.53', '31.54 - 40.35', '40.36 - 49.32', '>= 49.33']),
    n('TMT_A_Err',   CAT.TMT, 'TMT-A จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 2 ครั้ง', '>= 3 ครั้ง']),
    n('TMT_B_Time',  CAT.TMT, 'TMT-B เวลาที่ใช้ในการทดสอบ',       'วินาที',  true, 5, ['<= 34.26', '34.27 - 59.64', '59.65 - 83.36', '83.37 - 111.64', '>= 111.65']),
    n('TMT_B_Err',   CAT.TMT, 'TMT-B จำนวนครั้งที่ผิดพลาด',       'ครั้ง',   true, 3, ['', '', '0 ครั้ง', '1 - 5 ครั้ง', '>= 6 ครั้ง']),
    n('TMT_Diff',    CAT.TMT, 'เวลาส่วนต่าง (Difference B-A)',   'วินาที',  true, 5, ['<= 3.35', '3.36 - 25.08', '25.09 - 44.38', '44.39 - 69.65', '>= 69.66']),
    n('TMT_Ratio',   CAT.TMT, 'อัตราส่วนเวลา (Ratio B/A)',        'อัตราส่วน', true, 5, ['<= 1.07', '1.08 - 1.67', '1.68 - 2.28', '2.29 - 2.89', '>= 2.90']),
    n('FLK_Cong_RT', CAT.FLK, 'เวลาตอบสนองสอดคล้อง (Congruent RT)', 'ms',   true, 5, ['<= 323', '324 - 400', '401 - 483', '484 - 564', '>= 565']),
    n('FLK_Cong_Acc',CAT.FLK, 'อัตราความถูกต้องสอดคล้อง (Congruent Acc)', '%', false, 3, ['', '', '100%', '90 - 99%', '<= 89%']),
    n('FLK_Incong_RT', CAT.FLK, 'เวลาตอบสนองขัดแย้ง (Incongruent RT)', 'ms', true, 5, ['<= 378', '379 - 456', '457 - 531', '532 - 608', '>= 609']),
    n('FLK_Incong_Acc', CAT.FLK, 'อัตราความถูกต้องขัดแย้ง (Incongruent Acc)', '%', false, 3, ['', '', '95 - 100%', '70 - 94%', '<= 69%']),
    n('FLK_Interference', CAT.FLK, 'ผลกระทบจากการรบกวน (Interference Cost)', 'ms', true, 5, ['<= 55', '56 - 75', '76 - 95', '96 - 115', '>= 116']),
    n('DF_Filled',   CAT.DF,  'จุดสีทึบ (Filled Dots)',           'รูป',     false, 5, ['>= 13', '10 - 12', '7 - 9', '4 - 6', '0 - 3']),
    n('DF_Empty',    CAT.DF,  'จุดสีโปร่ง (Empty Dots)',          'รูป',     false, 5, ['>= 15', '12 - 14', '8 - 11', '5 - 7', '0 - 4']),
    n('DF_Switching', CAT.DF, 'สลับจุดสีทึบ-โปร่ง (Switching Dots)', 'รูป',  false, 5, ['>= 11', '9 - 10', '6 - 8', '3 - 5', '0 - 2']),
    n('DF_Total',    CAT.DF,  'จำนวนภาพที่ถูกต้องรวม (Total)',    'รูป',     false, 5, ['>= 35', '28 - 34', '21 - 27', '14 - 20', '0 - 13']),
    n('MRT_Score',   CAT.MRT, 'คะแนนการทดสอบ (MRT Score)',        'คะแนน',   false, 5, ['12 - 24', '9 - 11', '5 - 8', '1 - 4', '0']),
    n('SVT_Score',   CAT.SVT, 'คะแนนการทดสอบ (SVT Score)',        'คะแนน',   false, 5, ['16 - 30', '11 - 15', '7 - 10', '2 - 6', '0 - 1'])
  ];

  /* ---------- ตารางเกณฑ์ ---------- */
  const GROUPS = {
    'ชาย ม.1-3':  { label: 'ชาย ม.1-3', note: 'ชาย ม.1-3 (กรมพลศึกษา)', items: MALE_M13 },
    'หญิง ม.1-3': { label: 'หญิง ม.1-3', note: 'หญิง ม.1-3 (กรมพลศึกษา)', items: FEMALE_M13 },
    'ชาย ม.4-6':  { label: 'ชาย ม.4-6', note: 'ชาย ม.4-6 (กรมพลศึกษา)', items: MALE_M46 },
    'หญิง ม.4-6': { label: 'หญิง ม.4-6', note: 'หญิง ม.4-6 (กรมพลศึกษา)', items: FEMALE_M46 }
  };

  /* คะแนนรวม — ใช้เกณฑ์เดียวกันทุกกลุ่ม */
  for (const g of Object.values(GROUPS)) {
    g.items.push(n('Total_Norm_Score', CAT.TOTAL, 'ระดับคะแนนรวมความสามารถทางสมอง', 'คะแนน', false, 5, TOTAL_CUTS));
  }

  /** เลือกกลุ่มเกณฑ์จากเพศ + ระดับการศึกษา */
  function pickGroup(gender, education) {
    const male = /ชาย|male/i.test(gender || '');
    const upper = /ม\.?\s*[4-6]|4-6|มัธยมศึกษาตอนปลาย|ปวช\.?[2-3]|ปวส|อุดมศึกษา/i.test(education || '');
    if (male && upper) return 'ชาย ม.4-6';
    if (male) return 'ชาย ม.1-3';
    if (!male && upper) return 'หญิง ม.4-6';
    return 'หญิง ม.1-3';
  }

  function getGroup(name) {
    return GROUPS[name] || GROUPS['ชาย ม.1-3'];
  }

  function getDict(groupName) {
    const dict = {};
    for (const it of getGroup(groupName).items) dict[it.key.toLowerCase()] = it;
    return dict;
  }

  /* ---------- Parser เกณฑ์ (port จาก NormItem.Matches) ---------- */
  function stripSpec(spec) {
    let s = String(spec == null ? '' : spec).trim();
    s = s.replace(/[%％]/g, '');
    s = s.replace(/[\u0E00-\u0E3A\u0E40-\u0E4E]+/g, ''); // ตัดหน่วยไทย
    return s.trim();
  }
  const num = (t) => parseFloat(String(t).replace(/,/g, '.'));
  const hasDot = (t) => String(t).indexOf('.') >= 0;

  function matches(spec, value) {
    if (spec == null) return false;
    const s = stripSpec(spec);
    if (!s || s === '-') return false;
    let m;
    if ((m = s.match(/^>=\s*(-?[\d.,]+)$/))) {
      const x = num(m[1]);
      if (!isNaN(x)) return value >= x;
    } else if ((m = s.match(/^<=\s*(-?[\d.,]+)$/))) {
      const raw = m[1], x = num(raw);
      if (!isNaN(x)) return value <= (hasDot(raw) ? x : x + 0.9999);
    } else if ((m = s.match(/^>\s*(-?[\d.,]+)$/))) {
      const x = num(m[1]);
      if (!isNaN(x)) return value > x;
    } else if ((m = s.match(/^<\s*(-?[\d.,]+)$/))) {
      const x = num(m[1]);
      if (!isNaN(x)) return value < x;
    } else if ((m = s.match(/^(-?[\d.,]+)\s*[-\u2013\u2014]\s*(-?[\d.,]+)$/))) {
      const a = num(m[1]), b = num(m[2]);
      if (!isNaN(a) && !isNaN(b)) {
        const lo = Math.min(a, b), hiRaw = Math.max(a, b);
        const hiTxt = Math.max(a, b) === a ? m[1] : m[2];
        const high = hasDot(hiTxt) ? hiRaw : hiRaw + 0.9999;
        return value >= lo && value <= high;
      }
    } else if ((m = s.match(/^(-?[\d.,]+)$/))) {
      const x = num(m[1]);
      if (!isNaN(x)) return Math.abs(value - x) < 0.001;
    }
    return false;
  }

  /** ประเมินคะแนน → 1..5 (0 = ไม่มีเกณฑ์); port จาก NormItem.EvaluateScore */
  function evaluate(item, value) {
    if (!item || typeof value !== 'number' || isNaN(value)) return 0;
    const chain = [item.score5, item.score4, item.score3, item.score2, item.score1];
    for (let i = 0; i < chain.length; i++) {
      if (matches(chain[i], value)) return 5 - i;
    }
    // fallback: ค่าทศนิยมที่หลุดช่วง → ลองปัดเศษ
    const r = Math.round(value);
    if (Math.abs(value - r) > 0.0001) {
      for (let i = 0; i < chain.length; i++) {
        if (matches(chain[i], r)) return 5 - i;
      }
    }
    return 0;
  }

  /* ---------- Label/สีระดับ (port จาก ScoreLevelInfo) ---------- */
  const LEVEL_INFO = {
    5: { label: 'ดีมาก',       emoji: '🟢', bg: '#DCFCE7', fg: '#166534' },
    4: { label: 'ดี',          emoji: '🟡', bg: '#FEF9C3', fg: '#854D0E' },
    3: { label: 'ปานกลาง',     emoji: '🔵', bg: '#DBEAFE', fg: '#1E3A8A' },
    2: { label: 'พอใช้',       emoji: '🟠', bg: '#FED7AA', fg: '#9A3412' },
    1: { label: 'ควรปรับปรุง', emoji: '🔴', bg: '#FEE2E2', fg: '#991B1B' },
    0: { label: 'ไม่มีเกณฑ์',  emoji: '⬜', bg: '#F1F5F9', fg: '#64748B' }
  };

  function levelLabel(level) {
    return (LEVEL_INFO[level] || LEVEL_INFO[0]).label;
  }

  /* ---------- Info ตามชนิดสเกล (port จาก ScoreLevelInfo.For) ----------
   * เกณฑ์ 3 ระดับ: 3=ดีมาก(ถูกต้อง), 2=ปานกลาง, 1=ควรปรับปรุง
   * เกณฑ์ 5 ระดับ: ใช้ LEVEL_INFO ตรงๆ */
  const LEVEL_INFO_3 = {
    3: { label: 'ดีมาก',       emoji: '🟢', bg: '#DCFCE7', fg: '#166534' },
    2: { label: 'ปานกลาง',     emoji: '🔵', bg: '#DBEAFE', fg: '#1E3A8A' },
    1: { label: 'ควรปรับปรุง', emoji: '🔴', bg: '#FEE2E2', fg: '#991B1B' }
  };

  function infoFor(item, level) {
    if (item && item.scaleLevels === 3) return LEVEL_INFO_3[level] || LEVEL_INFO[0];
    return LEVEL_INFO[level] || LEVEL_INFO[0];
  }

  return { GROUPS, pickGroup, getGroup, getDict, evaluate, matches, LEVEL_INFO, LEVEL_INFO_3, levelLabel, infoFor };
})();
