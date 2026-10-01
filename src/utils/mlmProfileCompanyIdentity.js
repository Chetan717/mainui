const cleanText = (value) => String(value ?? "").trim();

const firstNonBlank = (values) => {
  for (const value of values) {
    const normalized = cleanText(value);
    if (normalized) return normalized;
  }
  return "";
};

export function getSelectedCompanyIdentity(company) {
  return {
    companyId: firstNonBlank([company?.id, company?.companyId]),
    companyName: firstNonBlank([company?.name, company?.companyName]),
  };
}

export function getProfileCompanyIdentity(profile) {
  return {
    companyId: firstNonBlank([profile?.companyId, profile?.company_id]),
    companyName: firstNonBlank([profile?.companyName, profile?.company_name]),
  };
}

export function hasCompleteCompanyIdentity(identity) {
  const normalized = getProfileCompanyIdentity(identity);
  return !!(normalized.companyId && normalized.companyName);
}

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") {
    try {
      return Number(value.toMillis()) || 0;
    } catch {
      return 0;
    }
  }
  if (Number.isFinite(value?.seconds)) {
    return value.seconds * 1000 + (Number(value.nanoseconds) || 0) / 1e6;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const profileIdentityScore = (profile) => {
  const identity = getProfileCompanyIdentity(profile);
  if (identity.companyId && identity.companyName) return 2;
  if (identity.companyId || identity.companyName) return 1;
  return 0;
};

/**
 * Duplicate mobile records can exist after older retries. Always prefer a
 * record with a complete company identity, then the most recently saved one.
 */
export function selectPreferredMlmProfile(profiles) {
  const candidates = (Array.isArray(profiles) ? profiles : []).filter(Boolean);
  if (candidates.length === 0) return null;

  return candidates
    .map((profile, index) => ({
      profile,
      index,
      identityScore: profileIdentityScore(profile),
      savedAt: Math.max(
        timestampToMillis(profile?.updatedAt),
        timestampToMillis(profile?.createdAt),
      ),
    }))
    .sort(
      (a, b) =>
        b.identityScore - a.identityScore ||
        b.savedAt - a.savedAt ||
        a.index - b.index,
    )[0].profile;
}
