import { auth } from "@firebase-config";

const LEGACY_USER_KEY = "usermlm";
const MANUAL_LOGOUT_KEY = "mlmlive-manual-logout";
export const VERIFIED_USER_CHANGED_EVENT = "mlmlive:verified-user-changed";
const CACHED_PII_KEYS = [
  LEGACY_USER_KEY,
  "mlmProfile",
  "reportingProfile",
  "mlmform",
  "achieve_form",
  "income_form",
  "Meeting",
  "selectedCompany",
];
let verifiedUser = null;
let authFlowPending = false;

const notifyVerifiedUserChanged = () => {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent(VERIFIED_USER_CHANGED_EVENT)); } catch {}
};

export function setAuthFlowPending(value) {
  authFlowPending = !!value;
}

export function isAuthFlowPending() {
  return authFlowPending;
}

export function hasLegacyAuthStorage() {
  try {
    if (localStorage.getItem(LEGACY_USER_KEY) !== null) return true;
  } catch {}
  try {
    if (sessionStorage.getItem(LEGACY_USER_KEY) !== null) return true;
  } catch {}
  return false;
}

export function clearLegacyAuthStorage() {
  try { localStorage.removeItem(LEGACY_USER_KEY); } catch {}
  try { sessionStorage.removeItem(LEGACY_USER_KEY); } catch {}
}

export function markManualLogout() {
  try { localStorage.setItem(MANUAL_LOGOUT_KEY, "1"); } catch {}
}

export function clearManualLogoutMarker() {
  try { localStorage.removeItem(MANUAL_LOGOUT_KEY); } catch {}
}

export function isManualLogoutMarked() {
  try {
    return localStorage.getItem(MANUAL_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearCachedPii() {
  for (const key of CACHED_PII_KEYS) {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
  }
}

export function setVerifiedUser(identity) {
  if (!identity?.uid) {
    verifiedUser = null;
    return;
  }

  const next = Object.fromEntries(
    Object.entries(identity).filter(([, value]) => value !== null && value !== undefined),
  );
  verifiedUser = Object.freeze(
    verifiedUser?.uid === identity.uid
      ? { ...verifiedUser, ...next }
      : next,
  );
  notifyVerifiedUserChanged();
}

export function getUser() {
  if (!auth.currentUser || auth.currentUser.uid !== verifiedUser?.uid) return null;
  return verifiedUser;
}

export function setUser(data) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return;
  // Compatibility for existing UI consumers. This is memory-only and cannot
  // grant a session; route authority remains Firebase Auth.
  setVerifiedUser({ ...data, uid: firebaseUser.uid });
  clearLegacyAuthStorage();
}

export function removeUser() {
  verifiedUser = null;
  clearLegacyAuthStorage();
  notifyVerifiedUserChanged();
}
