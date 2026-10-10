import { fetchGeneralMasterCatalog } from "./templateCdnService";

let templatesByType = new Map();
let loadedSource = "unavailable";
let loadPromise = null;
let loadedVersionMarker = "";

function buildIndex(payload) {
  const next = new Map();

  for (const [id, data] of Object.entries(payload?.data || {})) {
    if (
      data?.MainType !== "General" ||
      data?.Active !== true ||
      data?.Launched !== true ||
      !data?.SelectType
    ) {
      continue;
    }

    const normalized = {
      id,
      image: data.Showcase_url || "",
      company: data.Company,
      Subtype: data.Subtype,
      type: data.SelectType,
      ShowCaseForm: data.ShowCaseForm,
      serial: data.serial,
      MainType: data.MainType,
      GraphicsLink: Array.isArray(data.GraphicsLink) ? data.GraphicsLink : [],
    };

    const existing = next.get(data.SelectType);
    if (existing) existing.push(normalized);
    else next.set(data.SelectType, [normalized]);
  }

  for (const templates of next.values()) {
    templates.sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0));
  }

  templatesByType = next;
}

export async function loadGeneralTemplateIndex({ force = false } = {}) {
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    const cdnPayload = await fetchGeneralMasterCatalog();
    if (cdnPayload?.data && typeof cdnPayload.data === "object") {
      const marker = String(
        cdnPayload?.meta?.generatedAt ||
        cdnPayload?.meta?.count ||
        Object.keys(cdnPayload.data).length,
      );
      if (force || loadedSource !== "cdn" || marker !== loadedVersionMarker) {
        buildIndex(cdnPayload);
        loadedVersionMarker = marker;
      }
      loadedSource = "cdn";
      return {
        source: loadedSource,
        count: Number(cdnPayload?.meta?.count || Object.keys(cdnPayload.data).length),
      };
    }

    // Keep any last successfully-loaded CDN index in memory. Callers that have
    // never loaded it can use their Firestore emergency fallback.
    if (!templatesByType.size) loadedSource = "unavailable";
    return { source: loadedSource, count: 0 };
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function getGeneralTemplateIndexSource() {
  return loadedSource;
}

export function getGeneralTemplatesForHome(type, pageSize) {
  return (templatesByType.get(type) || []).slice(0, pageSize);
}

export function getAllGeneralTemplates(type) {
  return templatesByType.get(type) || [];
}

export function getGeneralTemplatesPage(type, pageSize, lastSerial = null) {
  const templates = templatesByType.get(type) || [];
  let startIndex = 0;

  if (lastSerial !== null) {
    startIndex = templates.findIndex(
      (template) => Number(template.serial || 0) > Number(lastSerial || 0),
    );
    if (startIndex === -1) {
      return { templates: [], hasMore: false, lastSerial: null };
    }
  }

  const page = templates.slice(startIndex, startIndex + pageSize);
  const last = page[page.length - 1];
  return {
    templates: page,
    hasMore: startIndex + pageSize < templates.length,
    lastSerial: last ? Number(last.serial || 0) : null,
  };
}
