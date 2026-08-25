/* js/utils/install.js — Install prompt manager */
import { isIOS, isAndroid, isPWA, isInAppBrowser } from './platform.js';

console.log('[install.js] Module loaded');

const STORAGE_KEY = 'bt_install_state';

function getState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function setState(partial) {
  const s = getState();
  Object.assign(s, partial);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let deferredPrompt = null;
let installBannerEl = null;
let iosModalEl = null;
let progressModalEl = null;

export function initInstallDetection() {
  console.log('[install.js] initInstallDetection called');
  if (isPWA || isInAppBrowser) return;

  // Show banner IMMEDIATELY (synchronously) on EVERY page load
  // The DOM elements exist in HTML, so no need to wait
  showInstallBanner();
  console.log('[install.js] showInstallBanner called synchronously');

  // Listen for beforeinstallprompt (Android/Chrome/Edge) - capture for native prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('beforeinstallprompt captured');
    updateInstallButton();
  });

  // Listen for SW messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'CACHE_PROGRESS') {
        updateProgressModal(e.data.loaded, e.data.total, e.data.currentUrl);
      } else if (e.data?.type === 'SW_UPDATE') {
        showUpdateToast();
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // App installed detection
  window.addEventListener('appinstalled', () => {
    setState({ installAccepted: true, installDismissed: 0, iosInstallShown: 0 });
    hideInstallUI();
    hideProgressModal();
  });

  // Show iOS modal if needed
  if (isIOS && !getState().installAccepted) {
    const state = getState();
    const now = Date.now();
    if (!state.iosInstallShown || now - state.iosInstallShown > 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => showIOSInstallModal(), 2000);
    }
  }
  if (typeof window !== 'undefined') {
    window.initInstallDetection = initInstallDetection;
    console.log('[install.js] Assigned to window');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInstallDetection);
} else {
  initInstallDetection();
}

export function showInstallBanner() {
  if (getState().installAccepted) {
    console.log('[install.js] showInstallBanner skipped - installAccepted=true');
    return;
  }

  const tryShow = () => {
    installBannerEl = document.getElementById('install-banner');
    if (!installBannerEl) {
      console.warn('[install.js] install-banner NOT found, retrying...');
      requestAnimationFrame(tryShow);
      return;
    }
    console.log('[install.js] showInstallBanner - element found, showing banner');

    installBannerEl.innerHTML = `
      <div class="install-banner-content">
        <span>ติดตั้ง Brain Test ลงหน้าจอหลัก</span>
        <div class="install-banner-actions">
          <button class="btn btn-gold btn-sm" id="btn-install-now">ติดตั้ง</button>
          <button class="btn btn-ghost btn-sm" id="btn-install-later">ภายหลัง</button>
        </div>
      </div>
    `;

    installBannerEl.querySelector('#btn-install-now').addEventListener('click', async () => {
      console.log('Install clicked, deferredPrompt:', deferredPrompt);
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install outcome:', outcome);
        if (outcome === 'accepted') {
          deferredPrompt = null;
          updateInstallButton();
        }
      } else {
        console.log('No deferredPrompt available');
        alert('กรุณาใช้เมนูเบราว์เซอร์ ⋮ > "ติดตั้ง Brain Test" หรือ "Install Brain Test"');
      }
    });

    installBannerEl.querySelector('#btn-install-later').addEventListener('click', () => {
      hideInstallUI();
    });

    updateInstallButton();
    requestAnimationFrame(() => {
      installBannerEl.classList.add('show');
      console.log('[install.js] banner .show class added');
    });
  };

  // DOM might not be ready on fast cached loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryShow);
  } else {
    tryShow();
  }
}

function updateInstallButton() {
  const btn = document.getElementById('btn-install-now');
  if (!btn) return;
  if (deferredPrompt) {
    btn.textContent = 'ติดตั้ง';
    btn.title = 'เปิดหน้าต่างติดตั้งของเบราว์เซอร์';
  } else {
    btn.textContent = 'ติดตั้ง (เมนูเบราว์เซอร์)';
    btn.title = 'กดแล้วแจ้งวิธีติดตั้งด้วยตนเอง';
  }
}

export function showIOSInstallModal() {
  if (getState().installAccepted) return;

  iosModalEl = document.getElementById('ios-install-modal');
  if (!iosModalEl) return;

  iosModalEl.innerHTML = `
    <div class="ios-modal-card">
      <div class="ios-modal-header">
        <h3 id="ios-modal-title">ติดตั้ง Brain Test</h3>
      </div>
      <div class="ios-modal-body">
        <div class="ios-guide">
          <div class="ios-step">
            <svg class="ios-icon-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            <span>กดปุ่ม <strong>แชร์</strong> (สี่เหลี่ยมมีลูกศรชี้ขึ้น)</span>
          </div>
          <div class="ios-arrow-down"></div>
          <div class="ios-step">
            <svg class="ios-icon-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2-2h-5"/><path d="M16 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2-2h-5"/><path d="M8 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2-2H3"/><path d="M3 16v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>
            <span>เลือก <strong>เพิ่มในหน้าจอหลัก</strong></span>
          </div>
        </div>
      </div>
      <div class="ios-modal-footer">
        <button class="btn btn-primary btn-lg" id="btn-ios-gotit">เข้าใจแล้ว</button>
      </div>
    </div>
  `;

  iosModalEl.querySelector('#btn-ios-gotit').addEventListener('click', () => {
    setState({ iosInstallShown: Date.now() });
    hideIOSModal();
  });

  iosModalEl.addEventListener('click', (e) => {
    if (e.target === iosModalEl) {
      setState({ iosInstallShown: Date.now() });
      hideIOSModal();
    }
  });

  requestAnimationFrame(() => iosModalEl.classList.add('show'));
}

export function hideInstallUI() {
  if (installBannerEl) installBannerEl.classList.remove('show');
  if (iosModalEl) iosModalEl.classList.remove('show');
}

export function hideIOSModal() {
  if (iosModalEl) iosModalEl.classList.remove('show');
}

export function updateProgressModal(loaded, total, currentUrl) {
  progressModalEl = document.getElementById('progress-modal');
  if (!progressModalEl) return;

  const percent = Math.round((loaded / total) * 100);
  const loadedMB = (loaded / total * 16.3).toFixed(1);

  if (!progressModalEl.classList.contains('show')) {
    progressModalEl.innerHTML = `
      <div class="progress-modal-card">
        <div class="progress-header">
          <h3 id="progress-modal-title">กำลังเตรียมข้อมูล...</h3>
        </div>
        <div class="progress-body">
          <div class="progress-bar-wrap">
            <div class="progress-bar" id="progress-bar" style="width: ${percent}%"></div>
          </div>
          <div class="progress-stats">
            <span id="progress-percent">${percent}%</span>
            <span id="progress-size">${loadedMB} / 16.3 MB</span>
          </div>
          <p class="progress-current" id="progress-current">${currentUrl}</p>
          <p class="progress-hint">โปรดรอสักครู่...</p>
        </div>
      </div>
    `;
    requestAnimationFrame(() => progressModalEl.classList.add('show'));
  } else {
    progressModalEl.querySelector('#progress-bar').style.width = `${percent}%`;
    progressModalEl.querySelector('#progress-percent').textContent = `${percent}%`;
    progressModalEl.querySelector('#progress-size').textContent = `${loadedMB} / 16.3 MB`;
    progressModalEl.querySelector('#progress-current').textContent = currentUrl;
  }

  if (loaded >= total) {
    setTimeout(() => hideProgressModal(), 800);
  }
}

export function hideProgressModal() {
  if (progressModalEl) {
    progressModalEl.classList.remove('show');
    setTimeout(() => { progressModalEl.innerHTML = ''; }, 300);
  }
}

function showUpdateToast() {
  let toast = document.getElementById('update-toast');
  if (!toast) return;

  toast.innerHTML = `
    <span>มีอัปเดตใหม่ พร้อมใช้งาน</span>
    <button class="btn btn-gold btn-sm" id="btn-reload-now">โหลดใหม่</button>
  `;

  toast.querySelector('#btn-reload-now').addEventListener('click', () => {
    window.location.reload();
  });

  requestAnimationFrame(() => toast.classList.add('show'));
}