/* sw.js — Service Worker: cache offline (cache-first) */
'use strict';

const CACHE = 'ctb-web-v27';
const CORE = [
  './',
  './index.html',
  './css/style.css',
  './js/norms.js',
  './js/scoring.js',
  './js/report.js',
  './js/app.js',
  './js/tests/base.js',
  './js/tests/srt.js',
  './js/tests/crt.js',
  './js/tests/flanker.js',
  './js/tests/tmt.js',
  './js/tests/df.js',
  './js/tests/mrt.js',
  './js/tests/svt.js',
  './assets/exam09mrt/exa_block_01.png',
  './assets/exam09mrt/exa_block_02.png',
  './assets/exam09mrt/exa_block_03.png',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  './manifest.webmanifest',
  './assets/pic1.png',
  './assets/main_video.mp4',
  './assets/logo_dpe.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* cache-first + บันทึก response ใหม่ (รวมรูปภาพ/วิดีโอใน assets/) */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com/.test(url.host)) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      /* วิดีโอในแคชเป็นไฟล์เต็ม — ตัด chunk 206 ตอบ byte-range เอง */
      if (hit && hit.status === 200 && e.request.headers.has('range')) {
        return sliceFromCache(hit, e.request);
      }
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.status === 200) { /* ไม่แคช partial 206 */
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

/* ตัด byte-range จากไฟล์เต็มในแคช (สำหรับ <video>) */
async function sliceFromCache(res, request) {
  const buf = await res.clone().arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d+)-(\d+)?/.exec(request.headers.get('range') || '');
  if (!m || Number(m[1]) >= total) return res;
  const start = Number(m[1]);
  const end = m[2] ? Math.min(Number(m[2]), total - 1) : Math.min(start + 512 * 1024 - 1, total - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}
