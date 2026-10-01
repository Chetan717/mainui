export const EDITOR_TEMPLATE_SEED_KEY = "editorTemplateSeed";

function text(value) {
  return value == null ? "" : String(value);
}

export function getEditorGraphicSelectionKey(graphic, templateId = "") {
  if (!graphic) return "";

  const resolvedTemplateId =
    templateId || graphic?._template?.id || graphic?.__templateId || "";
  const assetUrl =
    graphic?.url ||
    graphic?.backgroundVideoUrl ||
    graphic?.videoUrl ||
    graphic?.suggestionImage ||
    "";

  return JSON.stringify([
    text(resolvedTemplateId),
    text(graphic?.id),
    text(assetUrl),
  ]);
}

export function buildEditorTemplateSeed({
  template,
  selectedGraphic,
  companyId = "",
  maxItems = 20,
}) {
  const graphics = Array.isArray(template?.GraphicsLink)
    ? template.GraphicsLink.filter(Boolean)
    : [];
  const selectedGraphicKey = getEditorGraphicSelectionKey(
    selectedGraphic,
    template?.id,
  );

  if (!selectedGraphicKey || graphics.length === 0) return null;

  const selectedFromTemplate =
    graphics.find(
      (graphic) =>
        getEditorGraphicSelectionKey(graphic, template?.id) ===
        selectedGraphicKey,
    ) || selectedGraphic;
  const remaining = graphics.filter(
    (graphic) =>
      getEditorGraphicSelectionKey(graphic, template?.id) !==
      selectedGraphicKey,
  );
  const safeLimit = Math.max(1, Number(maxItems) || 20);
  const items = [selectedFromTemplate, ...remaining]
    .filter(Boolean)
    .slice(0, safeLimit);

  return {
    mainType: template?.MainType || "",
    type: template?.type || template?.SelectType || "",
    subType: template?.Subtype || "",
    templateId: template?.id || "",
    serial: template?.serial || 0,
    companyId,
    selectedGraphicKey,
    items,
  };
}

export function storeEditorTemplateSeed(options) {
  const seed = buildEditorTemplateSeed(options);

  try {
    if (!seed) {
      sessionStorage.removeItem(EDITOR_TEMPLATE_SEED_KEY);
      return null;
    }
    sessionStorage.setItem(EDITOR_TEMPLATE_SEED_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}
