export function normalizeTemplateSubtype(value) {
  return String(value || "").trim() || "Other";
}

export function groupTemplateGraphicsBySubtype(templates = []) {
  const sections = new Map();

  for (const template of Array.isArray(templates) ? templates : []) {
    const subtype = normalizeTemplateSubtype(template?.Subtype);
    const graphics = Array.isArray(template?.GraphicsLink)
      ? template.GraphicsLink.filter(Boolean)
      : [];
    if (graphics.length === 0) continue;

    let section = sections.get(subtype);
    if (!section) {
      section = { subtype, items: [] };
      sections.set(subtype, section);
    }

    for (const graphic of graphics) {
      section.items.push({ ...graphic, _template: template });
    }
  }

  return Array.from(sections.values());
}

export function getSubtypeRowItems(section) {
  return Array.isArray(section?.items) ? section.items : [];
}
