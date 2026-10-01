const PENDING_REFERRAL_STORAGE_KEY = "mlmlive.pendingReferralCode";
const REFERRAL_SOURCE_STORAGE_KEY = "mlmlive.referralCodeSource";
const REFERRAL_QUERY_KEYS = ["ref", "referCode", "referralCode"];
const INSTALL_REFERRER_KEYS = [
  "referrer",
  "referrerUrl",
  "referrer_url",
  "installReferrer",
  "install_referrer",
];

const SUPPORTED_BRIDGE_TYPES = new Set([
  "REFERRAL_CODE",
  "SET_REFERRAL_CODE",
  "MLMLIVE_REFERRAL_CODE",
  "INSTALL_REFERRER",
  "PLAY_INSTALL_REFERRER",
  "GOOGLE_PLAY_INSTALL_REFERRER",
  "GET_INSTALL_REFERRER_RESULT",
]);

export const DEFAULT_COUPON_CODE = "MLM100";
export const REFERRAL_CODE_UPDATED_EVENT =
  "mlmlive:referral-code-updated";

export function normalizeReferralCode(value) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 8);
}

export function getSignupCouponCode(value = "") {
  return normalizeReferralCode(value) || DEFAULT_COUPON_CODE;
}

export function getInitialSignupCouponCode({
  queryCode = "",
  pendingCode = "",
} = {}) {
  const normalizedQueryCode = normalizeReferralCode(queryCode);
  if (normalizedQueryCode) return normalizedQueryCode;

  // Any non-empty pending value may have come from Google Play. Never infer
  // that MLM300 (or another real code) was merely an old default.
  return getSignupCouponCode(pendingCode);
}

function decodeReferralValue(value) {
  const values = [];
  let current = String(value ?? "").trim();

  for (let index = 0; current && index < 3; index += 1) {
    if (!values.includes(current)) values.push(current);

    try {
      const decoded = decodeURIComponent(current.replace(/\+/g, " "));
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }

  return values;
}

function getReferralCodeFromParams(params, depth = 0) {
  if (depth > 4) return "";

  for (const key of REFERRAL_QUERY_KEYS) {
    const code = normalizeReferralCode(params.get(key));
    if (code) return code;
  }

  for (const key of INSTALL_REFERRER_KEYS) {
    const code = extractReferralCode(params.get(key), true, depth + 1);
    if (code) return code;
  }

  return "";
}

function extractReferralCode(value, allowPlainCode = false, depth = 0) {
  if (typeof value !== "string" || depth > 4) return "";

  for (const candidate of decodeReferralValue(value)) {
    try {
      const url = new URL(candidate);
      const code = getReferralCodeFromParams(url.searchParams, depth + 1);
      if (code) return code;
    } catch {
      // Install-referrer values are normally query strings, not full URLs.
    }

    const query = candidate.replace(/^[?#]/, "");
    if (query.includes("=")) {
      const code = getReferralCodeFromParams(
        new URLSearchParams(query),
        depth + 1,
      );
      if (code) return code;
    }

    if (allowPlainCode && /^[A-Za-z0-9_-]{1,8}$/.test(candidate)) {
      return normalizeReferralCode(candidate);
    }
  }

  return "";
}

export function getReferralCodeFromInstallReferrer(referrer = "") {
  return extractReferralCode(referrer, true);
}

export function getReferralCodeFromSearch(search = "") {
  return extractReferralCode(search, false);
}

export function getPendingReferralCode() {
  try {
    return normalizeReferralCode(
      window.localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY),
    );
  } catch {
    return "";
  }
}

export function getStoredReferralSource() {
  try {
    return window.localStorage.getItem(REFERRAL_SOURCE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function savePendingReferralCode(value, source = "") {
  const code = normalizeReferralCode(value);
  if (!code) return "";

  try {
    window.localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, code);

    if (source) {
      window.localStorage.setItem(REFERRAL_SOURCE_STORAGE_KEY, source);
    }
  } catch {
    // WebView storage can be unavailable in restricted/private mode.
  }

  return code;
}

export function clearPendingReferralCode() {
  try {
    window.localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
    window.localStorage.removeItem(REFERRAL_SOURCE_STORAGE_KEY);
  } catch {
    // Nothing else to clear.
  }
}

export function storeReferralSource(source) {
  try {
    if (source) {
      window.localStorage.setItem(REFERRAL_SOURCE_STORAGE_KEY, source);
    } else {
      window.localStorage.removeItem(REFERRAL_SOURCE_STORAGE_KEY);
    }
  } catch {
    // Local storage may be unavailable in private mode.
  }
}

export function notifyNativeReferralCleared(type = "REFERRAL_CODE_CLEARED") {
  if (typeof window === "undefined") return;

  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type }));
  } catch {
    // The web app may be running outside the React Native WebView.
  }
}

export function getReferralCodeFromBridgeMessage(rawMessage) {
  let message = rawMessage;

  if (typeof rawMessage === "string") {
    try {
      message = JSON.parse(rawMessage);
    } catch {
      return getReferralCodeFromInstallReferrer(rawMessage);
    }
  }

  if (typeof message === "string") {
    return getReferralCodeFromInstallReferrer(message);
  }

  if (!message || typeof message !== "object") return "";

  const messageType = String(message.type || "").toUpperCase();
  const isReferralMessage =
    !messageType ||
    SUPPORTED_BRIDGE_TYPES.has(messageType) ||
    /REFERR(?:AL|ER)/.test(messageType);

  if (!isReferralMessage) return "";

  for (const key of ["referralCode", "referCode", "code", "ref"]) {
    const value = message[key];
    const code =
      typeof value === "string" && /^[A-Za-z0-9_-]{1,8}$/.test(value.trim())
        ? normalizeReferralCode(value)
        : getReferralCodeFromInstallReferrer(value);
    if (code) return code;
  }

  for (const key of INSTALL_REFERRER_KEYS) {
    const code = getReferralCodeFromInstallReferrer(message[key]);
    if (code) return code;
  }

  for (const key of ["data", "payload", "detail", "value"]) {
    const nested = message[key];
    const code =
      typeof nested === "object" && nested !== null
        ? getReferralCodeFromBridgeMessage({
            type: messageType || "INSTALL_REFERRER",
            ...nested,
          })
        : getReferralCodeFromInstallReferrer(nested);

    if (code) return code;
  }

  return "";
}

function dispatchReferralUpdate(code) {
  if (!code || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(REFERRAL_CODE_UPDATED_EVENT, {
      detail: { code, source: "automatic" },
    }),
  );
}

export function captureAutomaticReferralCode(rawMessage) {
  const code = getReferralCodeFromBridgeMessage(rawMessage);
  if (!code) return "";

  savePendingReferralCode(code, "automatic");
  dispatchReferralUpdate(code);
  return code;
}

export function requestNativeReferralCode() {
  if (typeof window === "undefined") return;

  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "REQUEST_REFERRAL_CODE",
        request: "GET_INSTALL_REFERRER",
      }),
    );
  } catch {
    // The web app may be running outside the React Native WebView.
  }
}

let globalCaptureInstalled = false;

export function installGlobalReferralCapture() {
  if (globalCaptureInstalled || typeof window === "undefined") return;
  globalCaptureInstalled = true;

  const queryCode = getReferralCodeFromSearch(window.location.search);
  if (queryCode) {
    savePendingReferralCode(queryCode, "automatic");
  }

  const earlyHandler = window.__MLMLIVE_EARLY_BRIDGE_HANDLER__;
  if (earlyHandler) {
    window.removeEventListener("message", earlyHandler);
    document.removeEventListener("message", earlyHandler);
  }

  const earlyMessages = Array.isArray(window.__MLMLIVE_EARLY_BRIDGE_MESSAGES__)
    ? window.__MLMLIVE_EARLY_BRIDGE_MESSAGES__.splice(0)
    : [];

  delete window.__MLMLIVE_EARLY_BRIDGE_HANDLER__;
  delete window.__MLMLIVE_EARLY_BRIDGE_MESSAGES__;

  const handleWindowMessage = (event) => {
    captureAutomaticReferralCode(event.data);
  };

  const handleReferralEvent = (event) => {
    captureAutomaticReferralCode(event.detail);
  };

  window.addEventListener("message", handleWindowMessage);
  // Some Android WebView versions dispatch messages on document.
  document.addEventListener("message", handleWindowMessage);
  window.addEventListener("mlmlive:referral-code", handleReferralEvent);

  earlyMessages.forEach(captureAutomaticReferralCode);

  for (const key of [
    "__MLMLIVE_REFERRAL_CODE__",
    "__MLMLIVE_INSTALL_REFERRER__",
    "__INSTALL_REFERRER__",
  ]) {
    captureAutomaticReferralCode(window[key]);
  }

  requestNativeReferralCode();
}

export function createPlayStoreReferralLink(referCode) {
  const code = normalizeReferralCode(referCode);
  const playStoreUrl = new URL(
    "https://play.google.com/store/apps/details?id=com.mlmbooster.mlmbooster",
  );

  if (code) {
    playStoreUrl.searchParams.set(
      "referrer",
      new URLSearchParams({ ref: code }).toString(),
    );
  }

  return playStoreUrl.toString();
}
