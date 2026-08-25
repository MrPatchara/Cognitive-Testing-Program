/* sw.js — Service Worker: cache offline (cache-first) — v28 full pre-cache */
'use strict';

const CACHE = 'ctb-web-v28';
const CORE = [
  // ===== Core App =====
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
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  './manifest.webmanifest',
  './assets/pic1.png',
  './assets/main_video.mp4',
  './assets/logo_dpe.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',

  // ===== MRT (exam09mrt) - 28 files =====
  './assets/exam09mrt/exa_block_01.png',
  './assets/exam09mrt/exa_block_02.png',
  './assets/exam09mrt/exa_block_03.png',
  './assets/exam09mrt/mrt_block_01.png',
  './assets/exam09mrt/mrt_block_02.png',
  './assets/exam09mrt/mrt_block_03.png',
  './assets/exam09mrt/mrt_block_04.png',
  './assets/exam09mrt/mrt_block_05.png',
  './assets/exam09mrt/mrt_block_06.png',
  './assets/exam09mrt/mrt_block_07.png',
  './assets/exam09mrt/mrt_block_08.png',
  './assets/exam09mrt/mrt_block_09.png',
  './assets/exam09mrt/mrt_block_10.png',
  './assets/exam09mrt/mrt_block_11.png',
  './assets/exam09mrt/mrt_block_12.png',
  './assets/exam09mrt/mrt_block_13.png',
  './assets/exam09mrt/mrt_block_14.png',
  './assets/exam09mrt/mrt_block_15.png',
  './assets/exam09mrt/mrt_block_16.png',
  './assets/exam09mrt/mrt_block_17.png',
  './assets/exam09mrt/mrt_block_18.png',
  './assets/exam09mrt/mrt_block_19.png',
  './assets/exam09mrt/mrt_block_20.png',
  './assets/exam09mrt/mrt_block_21.png',
  './assets/exam09mrt/mrt_block_22.png',
  './assets/exam09mrt/mrt_block_23.png',
  './assets/exam09mrt/mrt_block_24.png',
  './assets/exam09mrt/mrt_block_25.png',

  // ===== SVT (exam10) - 33 files =====
  './assets/exam10/svt001.jpg',
  './assets/exam10/svt002.jpg',
  './assets/exam10/svt003.jpg',
  './assets/exam10/svt01_b.jpg',
  './assets/exam10/svt02_a.jpg',
  './assets/exam10/svt03_a.jpg',
  './assets/exam10/svt04_d.jpg',
  './assets/exam10/svt05_b.jpg',
  './assets/exam10/svt06_c.jpg',
  './assets/exam10/svt07_e.jpg',
  './assets/exam10/svt08_e.jpg',
  './assets/exam10/svt09_e.jpg',
  './assets/exam10/svt10_d.jpg',
  './assets/exam10/svt11_e.jpg',
  './assets/exam10/svt12_e.jpg',
  './assets/exam10/svt13_b.jpg',
  './assets/exam10/svt14_d.jpg',
  './assets/exam10/svt15_c.jpg',
  './assets/exam10/svt16_e.jpg',
  './assets/exam10/svt17_a.jpg',
  './assets/exam10/svt18_a.jpg',
  './assets/exam10/svt19_b.jpg',
  './assets/exam10/svt20_b.jpg',
  './assets/exam10/svt21_a.jpg',
  './assets/exam10/svt22_d.jpg',
  './assets/exam10/svt23_d.jpg',
  './assets/exam10/svt24_c.jpg',
  './assets/exam10/svt25_d.jpg',
  './assets/exam10/svt26_c.jpg',
  './assets/exam10/svt27_b.jpg',
  './assets/exam10/svt28_e.jpg',
  './assets/exam10/svt29_c.jpg',
  './assets/exam10/svt30_e.jpg',

  // ===== Advice - 24 files =====
  './assets/advice/desc_01_02.png',
  './assets/advice/desc_02_02.png',
  './assets/advice/desc_03_02.png',
  './assets/advice/desc_04_01.png',
  './assets/advice/desc_05_02.png',
  './assets/advice/desc_06_02.png',
  './assets/advice/desc_06_03.png',
  './assets/advice/desc_07_01.png',
  './assets/advice/desc_08_01.png',
  './assets/advice/desc_08_02.png',
  './assets/advice/desc_08_04.png',
  './assets/advice/desc_08_05.png',
  './assets/advice/desc_08_07.png',
  './assets/advice/desc_09_01.png',
  './assets/advice/desc_09_02.png',
  './assets/advice/desc_09_03.png',
  './assets/advice/desc_09_05.png',
  './assets/advice/desc_09_07.png',
  './assets/advice/desc_09_08.png',
  './assets/advice/desc_10_01.png',
  './assets/advice/desc_10_02.png',
  './assets/advice/desc_10_03.png',
  './assets/advice/desc_10_04.png',
  './assets/advice/desc_10_05.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const total = CORE.length;
      let loaded = 0;
      
      for (const url of CORE) {
        await cache.add(url);
        loaded++;
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({ 
          type: 'CACHE_PROGRESS', 
          loaded, 
          total,
          currentUrl: url.split('/').pop()
        }));
      }
      
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() => {
      self.clients.matchAll().then(clients => 
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATE' }))
      );
    })
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