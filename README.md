# CTB Web Version (beta)

ชุดประเมินสมรรถภาพทางสมองสำหรับนักกีฬา — **Static Website** (HTML/CSS/JS ล้วน ไม่มีฐานข้อมูล)
พอร์ตจากแอป WPF เดิม (Computerized Cognitive Test Battery) โดยตัด SQLite ออกทั้งหมด
นักกีฬากรอกข้อมูลส่วนตัวใหม่ทุกครั้ง · ผลอยู่ในหน่วยความจำหน้าเว็บเท่านั้น

## คุณสมบัติ

- **10 แบบทดสอบ** (ทุกแบบมีโหมดซ้อมก่อนทดสอบจริง):
  1. SRT — เวลาปฏิกิริยาอย่างง่าย (20 ครั้ง)
  2. CRT — เวลาปฏิกิริยาแบบตัวเลือก (60 ครั้ง, มี no-go)
  3. TMT-A — เชื่อมเลข 1-25
  4. TMT-B — สลับเลข-ตัวอักษร 1-A-2-B…13-L
  5. Flanker — 40 ครั้ง (Congruent/Incongruent)
  6-8. Design Fluency — Filled / Empty / Switching Dots (60 วินาที ×3)
  9. MRT — Mental Rotation (25 ข้อ, เลือก 2 ใน 4)
  10. SVT — Spatial Visualization (30 ข้อ, 25 นาที)
- **เทียบเกณฑ์ DPE (กรมพลศึกษา) 4 กลุ่ม** — เลือกอัตโนมัติจากเพศ + ระดับการศึกษา
  **หรือเปลี่ยนเลือกเอง / เลือก "ไม่ใช้เกณฑ์" ก็ได้** + คะแนนรวมสมรรถภาพทางสมอง
- **ใช้ได้ทั้งมือถือและคอม** — ปุ่มตอบสนองแตะบนจอสำหรับมือถือ
  และคีย์บอร์ด `Z` / `/` บนคอมพ์ (ตรงกับแอปเดิม)
- **รายงานผล**: ตารางเทียบเกณฑ์ 21 ตัวชี้วัด + พิมพ์ PDF + ดาวน์โหลด Excel
  **2 ชีตเหมือนโปรแกรมเดิม** — "Personal Report" (แบบฟอร์มต้นฉบับ) +
  "ผลการประเมินตามเกณฑ์" (ตารางสีครบถ้วน) สร้างด้วย ExcelJS
- **PWA**: ติดตั้งลงหน้าจอมือถือได้ ใช้งาน offline ได้หลังเปิดครั้งแรก

## การใช้งาน

เปิด `index.html` ผ่าน web server ใด ๆ เช่น:

```bash
# Python
python -m http.server 8080

# หรือ Node.js
npx serve .
```

แล้วเปิด `http://localhost:8080` — หรือ deploy ขึ้น static hosting ฟรี
(GitHub Pages / Netlify / Cloudflare Pages) ได้ทันทีไม่ต้อง build

> ⚠️ Service Worker ต้องรันผ่าน `http://localhost` หรือ `https://` เท่านั้น
> (เปิดไฟล์แบบ file:// จะยังใช้งานได้ แต่ไม่มี offline cache)

## การควบคุมในแบบทดสอบ

| แบบทดสอบ | Desktop | Mobile |
|---|---|---|
| SRT | คีย์ `/` หรือคลิกปุ่ม | แตะปุ่ม `/` ใหญ่ |
| CRT | `Z` = แดง/เขียว · `/` = น้ำเงิน | ปุ่ม Z / / สองปุ่มล่างจอ |
| Flanker | `Z` = ลูกศรกลางซ้าย · `/` = ขวา | ปุ่ม ◀ Z / ▶ / |
| TMT-A/B | คลิก/ลากเมาส์เชื่อมโหนด | แตะ/ลากนิ้วเชื่อมโหนด |
| Design Fluency | คลิกจุดเชื่อมเป็นรูป | แตะจุดเชื่อมเป็นรูป |
| MRT | คลิกเลือก 2 รูป | แตะเลือก 2 รูป |
| SVT | คลิก A-E | แตะ A-E |

## โครงสร้างไฟล์

```
Web_version(beta)/
├── index.html              # SPA หลัก
├── manifest.webmanifest    # PWA
├── sw.js                   # Service Worker (offline)
├── css/style.css           # responsive + print CSS
├── js/
│   ├── norms.js            # เกณฑ์ DPE 4 กลุ่ม + evaluator (port NormItem.cs)
│   ├── scoring.js          # คำนวณ 21 ตัวชี้วัด + คะแนนรวม (port TestScores)
│   ├── report.js           # รายงาน + Excel export (port CognitiveTestBatteryReport)
│   ├── app.js              # flow: ฟอร์ม → เลือก → ทดสอบ → รายงาน
│   └── tests/              # 10 แบบทดสอบ (base.js = framework กลาง)
├── assets/
│   ├── advice/             # ภาพคำแนะนำ (desc_XX_XX.png)
│   ├── exam09mrt/          # ภาพข้อสอบ MRT
│   └── exam10/             # ภาพข้อสอบ SVT (เฉลยฝังชื่อไฟล์ svtNN_x.jpg)
└── icons/                  # PWA icon
```

## ข้อจำกัด (beta)

- ข้อมูลไม่ถูกบันทึกถาวร — ปิดแท็บ = หาย (ตามข้อกำหนด "ไม่มี database")
- การจับเวลาใช้ `performance.now()` แม่นยำระดับ ms แต่ค่าอาจต่างจากเครื่อง Windows
  ของแอปเดิมเล็กน้อยตามสเปกอุปกรณ์
- ผังจุดของ Design Fluency เป็นผังใหม่ที่ออกแบบให้ตรงหลักการทดสอบ
  (ต้นฉบับฝัง layout ไว้ใน BAML ซึ่ง extract ตรง ๆ ไม่ได้)
