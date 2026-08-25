/* js/utils/platform.js — Platform & PWA detection */
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isAndroid = /Android/.test(navigator.userAgent);
export const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
  || window.navigator.standalone === true;
export const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|KAKAOTALK|WeChat/.test(navigator.userAgent);
export const isPWA = isStandalone;