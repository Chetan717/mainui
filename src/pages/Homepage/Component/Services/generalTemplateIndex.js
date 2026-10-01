import templateData from "./genaral_template_firestore_data.json";

const templatesByType = new Map();

// Build this index once per loaded Home/Templates chunk. Previously every
// category and every pagination request rescanned and resorted the full JSON
// payload, which caused avoidable main-thread work on mobile WebViews.
for (const [id, data] of Object.entries(templateData?.data || {})) {
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
    GraphicsLink: data.GraphicsLink || [],
  };
  const existing = templatesByType.get(data.SelectType);
  if (existing) existing.push(normalized);
  else templatesByType.set(data.SelectType, [normalized]);
}

for (const templates of templatesByType.values()) {
  templates.sort((a, b) => (a.serial || 0) - (b.serial || 0));
}

export function getGeneralTemplatesForHome(type, pageSize) {
  return (templatesByType.get(type) || []).slice(0, pageSize);
}

export function getAllGeneralTemplates(type) {
  return templatesByType.get(type) || [];
}

export function getGeneralTemplatesPage(
  type,
  pageSize,
  lastSerial = null,
) {
  const templates = templatesByType.get(type) || [];
  let startIndex = 0;

  if (lastSerial !== null) {
    startIndex = templates.findIndex(
      (template) => (template.serial || 0) > lastSerial,
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
    lastSerial: last ? (last.serial || 0) : null,
  };
}
