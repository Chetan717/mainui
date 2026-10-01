const MLM_PROFILE_STORAGE_KEY = "mlmProfile";

export const MLM_PROFILE_CHANGED_EVENT = "mlmlive:mlm-profile-changed";

// Data below can contain the deleted company's/profile's photos, template
// choices or reporting identity. It must not leak into the next company the
// user selects. Account/session preferences intentionally do not belong here.
export const COMPANY_SCOPED_STORAGE_KEYS = Object.freeze([
  MLM_PROFILE_STORAGE_KEY,
  "selectedCompany",
  "mlmform",
  "selType",
  "close_filter",
  "achieve_form",
  "income_form",
  "Meeting",
  "SelectedDesignation",
  "trainingDates",
  "selectedDate",
  "reportingProfile",
  "editorTemplateSeed",
  "mlmlive-editor-back-target",
]);

const notifyProfileChanged = (profile = null) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(MLM_PROFILE_CHANGED_EVENT, { detail: { profile } }),
    );
  } catch {
    // Storage changes must still succeed in older WebViews.
  }
};

const readStoredValue = (key, { sessionOnly = false } = {}) => {
  if (typeof window === "undefined") return null;

  if (!sessionOnly) {
    try {
      const localValue = localStorage.getItem(key);
      if (localValue) return JSON.parse(localValue);
    } catch {
      // ignore
    }
  }

  try {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) return JSON.parse(sessionValue);
  } catch {
    // ignore
  }

  return null;
};

export const getMlmProfileFromStorage = () =>
  readStoredValue(MLM_PROFILE_STORAGE_KEY, { sessionOnly: true });

export const saveMlmProfileToStorage = (profile) => {
  if (!profile) return;
  // Remove legacy persistent PII and keep the profile for this tab only.
  try { localStorage.removeItem(MLM_PROFILE_STORAGE_KEY); } catch {}
  try { sessionStorage.setItem(MLM_PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch {}
  notifyProfileChanged(profile);
};

export const clearMlmProfileStorage = () => {
  try { localStorage.removeItem(MLM_PROFILE_STORAGE_KEY); } catch {}
  try { sessionStorage.removeItem(MLM_PROFILE_STORAGE_KEY); } catch {}
  notifyProfileChanged(null);
};

export const clearCompanyProfileStorage = () => {
  clearMlmProfileStorage();
};

export const clearCompanyScopedStorage = ({
  local = typeof window !== "undefined" ? window.localStorage : null,
  session = typeof window !== "undefined" ? window.sessionStorage : null,
} = {}) => {
  for (const key of COMPANY_SCOPED_STORAGE_KEYS) {
    try { local?.removeItem(key); } catch {}
    try { session?.removeItem(key); } catch {}
  }
  notifyProfileChanged(null);
};

export const hasMlmProfileInStorage = () => {
  const profile = getMlmProfileFromStorage();
  return !!(
    profile &&
    (profile.id ||
      profile.companyId ||
      profile.company_id ||
      profile.mobile ||
      profile.mobileNo ||
      profile.fullName)
  );
};
