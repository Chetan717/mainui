const normalizeUrlList = (value) =>
  Array.isArray(value)
    ? value.filter((url) => typeof url === "string" && url.length > 0)
    : [];

export function getRemovedProfileTopuplines(previousUrls, nextUrls) {
  const nextUrlSet = new Set(normalizeUrlList(nextUrls));

  return normalizeUrlList(previousUrls).filter((url) => !nextUrlSet.has(url));
}

export function removeTopuplinesFromStoredForm(storedForm, removedUrls) {
  if (!storedForm || typeof storedForm !== "object") return storedForm;

  const removedUrlSet = new Set(normalizeUrlList(removedUrls));
  if (removedUrlSet.size === 0) return storedForm;

  const removeDeletedUrls = (value) =>
    Array.isArray(value)
      ? value.filter((url) => !removedUrlSet.has(url))
      : value;

  return {
    ...storedForm,
    selectedLinks: removeDeletedUrls(storedForm.selectedLinks),
    topuplineURLs: removeDeletedUrls(storedForm.topuplineURLs),
  };
}

/**
 * Banner Settings and Editor keep separate copies of the selected Top Upline
 * URLs. After a successful profile save, remove only the URLs that were
 * deleted from the profile. This preserves form-only data URLs and any other
 * template-specific selections.
 */
export function syncRemovedProfileTopuplinesToLocalForm(
  previousUrls,
  nextUrls,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const removedUrls = getRemovedProfileTopuplines(previousUrls, nextUrls);
  if (removedUrls.length === 0 || !storage) return removedUrls;

  try {
    const rawForm = storage.getItem("mlmform");
    if (!rawForm) return removedUrls;

    const storedForm = JSON.parse(rawForm);
    const syncedForm = removeTopuplinesFromStoredForm(storedForm, removedUrls);
    storage.setItem("mlmform", JSON.stringify(syncedForm));
  } catch {
    // A malformed/blocked local cache must not make the profile save fail.
  }

  return removedUrls;
}
