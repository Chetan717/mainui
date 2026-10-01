const templateCache = new Map();

const SEEN_IMAGES_KEY = "mlm_seen_images_v1";
const MAX_SEEN = 600;

function loadSeenFromStorage() {
  try {
    const arr = JSON.parse(localStorage.getItem(SEEN_IMAGES_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export const seenImages = new Set(loadSeenFromStorage());

let _saveTimer = null;
function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const arr = [...seenImages];
      const trimmed = arr.length > MAX_SEEN ? arr.slice(arr.length - MAX_SEEN) : arr;
      localStorage.setItem(SEEN_IMAGES_KEY, JSON.stringify(trimmed));
    } catch {
      // quota exceeded — clear old entry and retry once
      try { localStorage.removeItem(SEEN_IMAGES_KEY); } catch {}
    }
  }, 800);
}

export function getCacheKey(type) {
  return `group_${type}`;
}

export function getCache(type) {
  return templateCache.get(getCacheKey(type)) || null;
}

export function setCache(type, data) {
  templateCache.set(getCacheKey(type), data);
}

export function clearTemplateCache() {
  templateCache.clear();
}

// Tracks URLs currently being preloaded so repeated calls don't spawn extra requests.
const _inFlight = new Set();

export function preloadImage(src) {
  if (!src || seenImages.has(src) || _inFlight.has(src)) return;
  _inFlight.add(src);
  const img = new Image();
  img.onload = () => {
    _inFlight.delete(src);
    markImageSeen(src); // only mark seen after pixels are truly ready
  };
  img.onerror = () => { _inFlight.delete(src); };
  img.src = src;
}

export function markImageSeen(src) {
  if (!src || seenImages.has(src)) return;
  seenImages.add(src);
  scheduleSave();
}

const SEEN_SERIAL_KEY = "mlm_seen_max_serial";

export function getSeenSerial() {
  try { return Number(localStorage.getItem(SEEN_SERIAL_KEY)) || 0; }
  catch { return 0; }
}

export function isNewTemplate(serial) {
  const seen = getSeenSerial();
  if (seen === 0) return false;
  return Number(serial) > seen;
}
