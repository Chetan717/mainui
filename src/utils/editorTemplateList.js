import { getEditorGraphicSelectionKey } from "./editorTemplateSelection.js";

export function normalizeEditorTemplateFilter(value) {
  return value == null ? "" : String(value).trim();
}

export function isEditorTemplateSeedForSelection(seed, selection) {
  return (
    normalizeEditorTemplateFilter(seed?.type) ===
      normalizeEditorTemplateFilter(selection?.type) &&
    normalizeEditorTemplateFilter(seed?.subType) ===
      normalizeEditorTemplateFilter(selection?.subType) &&
    normalizeEditorTemplateFilter(seed?.mainType) ===
      normalizeEditorTemplateFilter(selection?.mainType) &&
    normalizeEditorTemplateFilter(seed?.companyId) ===
      normalizeEditorTemplateFilter(selection?.companyId)
  );
}

export function getGeneralItemsForEditor(templateData, type, subType) {
  const selectedType = normalizeEditorTemplateFilter(type);
  const selectedSubType = normalizeEditorTemplateFilter(subType);
  const allTemplates = Object.entries(templateData?.data || {}).map(
    ([id, data]) => ({ id, ...data }),
  );

  return allTemplates
    .filter((template) => {
      const mainType = normalizeEditorTemplateFilter(
        template.MainType,
      ).toLowerCase();
      const templateType = normalizeEditorTemplateFilter(template.SelectType);
      const templateSubType = normalizeEditorTemplateFilter(template.Subtype);
      const isGeneral = mainType === "general" || mainType === "genaral";

      return (
        isGeneral &&
        templateType === selectedType &&
        template.Active === true &&
        template.Launched === true &&
        (!selectedSubType || templateSubType === selectedSubType)
      );
    })
    .sort((a, b) => (a.serial || 0) - (b.serial || 0))
    .flatMap((template) => {
      const graphics = Array.isArray(template.GraphicsLink)
        ? template.GraphicsLink
        : [];
      return graphics
        .filter(Boolean)
        .map((graphic) => ({ ...graphic, _template: template }));
    });
}

export function findEditorItemBySelectionKey(items, selectionKey) {
  if (!selectionKey || !Array.isArray(items)) return null;
  return (
    items.find(
      (item) => getEditorGraphicSelectionKey(item) === selectionKey,
    ) || null
  );
}

export function prepareEditorItemsForSelection(
  items,
  selectionKey,
  fallbackItems = [],
  completeFallbackItems = [],
) {
  let nextItems = Array.isArray(items) ? [...items] : [];
  const safeFallbackItems = Array.isArray(fallbackItems)
    ? fallbackItems.filter(Boolean)
    : [];
  const safeCompleteFallbackItems = Array.isArray(completeFallbackItems)
    ? completeFallbackItems.filter(Boolean)
    : [];

  // A valid scope-checked seed already contains every GraphicsLink from the
  // selected showcase. Keep the complete seed if a stale/mismatched source
  // returns no rows; otherwise the list collapses to only the selected card.
  if (nextItems.length === 0 && safeCompleteFallbackItems.length > 0) {
    nextItems = [...safeCompleteFallbackItems];
  }

  if (!selectionKey) return nextItems;

  let selectedIndex = nextItems.findIndex(
    (item) => getEditorGraphicSelectionKey(item) === selectionKey,
  );
  if (selectedIndex === -1) {
    const fallback = findEditorItemBySelectionKey(
      safeFallbackItems,
      selectionKey,
    );
    if (fallback) {
      nextItems.unshift(fallback);
      selectedIndex = 0;
    }
  }

  if (selectedIndex > 0) {
    const [selectedItem] = nextItems.splice(selectedIndex, 1);
    nextItems.unshift(selectedItem);
  }
  return nextItems;
}
