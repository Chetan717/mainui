const COMPANY_SELECTION_KEY_PREFIX = "mlmlive:pending-company:";

const browserStorage = (name) => {
  if (typeof window === "undefined") return null;
  try {
    return window[name] || null;
  } catch {
    return null;
  }
};

const storageKey = (uid) =>
  uid ? `${COMPANY_SELECTION_KEY_PREFIX}${uid}` : null;

const defaultStores = () => [
  browserStorage("localStorage"),
  browserStorage("sessionStorage"),
];

const usableStores = (stores) =>
  (Array.isArray(stores) ? stores : defaultStores()).filter(Boolean);

export function readPendingCompanySelection(uid, { stores } = {}) {
  const key = storageKey(uid);
  if (!key) return null;

  for (const store of usableStores(stores)) {
    try {
      const value = JSON.parse(store.getItem(key) || "null");
      if (
        value?.version === 1 &&
        value?.uid === uid &&
        typeof value?.companyId === "string" &&
        value.companyId.trim()
      ) {
        return value.companyId.trim();
      }
    } catch {
      // A damaged or unavailable browser store must not block sign-in.
    }
  }

  return null;
}

export function savePendingCompanySelection(uid, companyId, { stores } = {}) {
  const key = storageKey(uid);
  const normalizedCompanyId = String(companyId || "").trim();
  if (!key || !normalizedCompanyId) return false;

  const payload = JSON.stringify({
    version: 1,
    uid,
    companyId: normalizedCompanyId,
  });
  let saved = false;

  for (const store of usableStores(stores)) {
    try {
      store.setItem(key, payload);
      saved = true;
    } catch {
      // Continue so sessionStorage can recover when localStorage is blocked.
    }
  }

  return saved;
}

export function clearPendingCompanySelection(uid, { stores } = {}) {
  const key = storageKey(uid);
  if (!key) return;

  for (const store of usableStores(stores)) {
    try {
      store.removeItem(key);
    } catch {
      // Selection is also cleared from React state by the caller.
    }
  }
}

