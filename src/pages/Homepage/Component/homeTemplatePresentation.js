import { RANK_PROMOTION_TYPES } from "../../../utils/templateTypeConfig.js";
import { EVERYDAY_MOMENT_ENTRIES } from "../../../utils/everydayMoments.js";

export const HOME_SECTION_DEFINITIONS = Object.freeze([
  {
    id: "today-trending",
    title: "Today Trending",
    entries: [{ type: "Today_Trending" }],
  },
  {
    id: "motivational",
    title: "Motivational",
    entries: [{ type: "Motivational" }],
  },
  {
    id: "rank-promotion",
    title: "Rank Promotion",
    headerEntryType: RANK_PROMOTION_TYPES[0],
    entries: [
      { type: RANK_PROMOTION_TYPES[0] },
      { type: RANK_PROMOTION_TYPES[1], label: "Rank Promotion B" },
    ],
  },
  {
    id: "bonanza",
    title: "Bonanza",
    entries: [{ type: "Bonanza" }],
  },
  {
    id: "domestic-trip",
    title: "Domestic Trip",
    entries: [{ type: "Domestic_Trip" }],
  },
  {
    id: "welcome-closing",
    title: "Welcome Closing",
    entries: [{ type: "Welcome_Closing" }],
  },
  {
    id: "training",
    title: "Training",
    entries: [{ type: "Training" }],
  },
  {
    id: "meeting",
    title: "Meeting",
    entries: [{ type: "Meeting" }],
  },
  {
    id: "general-meeting",
    title: "General Meeting",
    entries: [{ type: "General_Meeting" }],
  },
  {
    id: "achievements",
    title: "Achievements",
    entries: [{ type: "Achievements" }],
  },
  {
    id: "income",
    title: "Income",
    entries: [{ type: "Income" }],
  },
  {
    id: "anniversary-birthday",
    title: "Anniversary Birthday",
    entries: [{ type: "Anniversary_Birthday" }],
  },
  {
    id: "thank-you",
    title: "Thank You",
    entries: [
      { type: "ThankYou_Banner_B", label: "Rank & Bonanza" },
      {
        type: "ThankYou_Birthday_Anniversary",
        label: "Birthday & Anniversary",
      },
    ],
  },
  {
    id: "capping",
    title: "Capping",
    entries: [{ type: "Capping" }],
  },
  {
    id: "everyday-moments",
    title: "Everyday Moments",
    entries: EVERYDAY_MOMENT_ENTRIES,
  },
]);

const definitionByType = new Map();
for (const definition of HOME_SECTION_DEFINITIONS) {
  for (const entry of definition.entries) {
    definitionByType.set(entry.type, { definition, entry });
  }
}

export function getTemplateTypeDisplayName(type) {
  if (type === "ThankYou_Banner_B") return "Thank You Rank & Bonanza";
  return String(type || "").replaceAll("_", " ");
}

export function getHomeTemplateSearchText(type) {
  const match = definitionByType.get(type);
  return [
    type,
    getTemplateTypeDisplayName(type),
    match?.definition?.title,
    match?.entry?.label,
  ]
    .filter(Boolean)
    .join(" ")
    .replaceAll("_", " ")
    .toLowerCase();
}

export function buildHomeTemplateSections(groups = []) {
  const availableGroups = new Map();
  for (const group of Array.isArray(groups) ? groups : []) {
    if (group?.type && Array.isArray(group.templates) && group.templates.length) {
      availableGroups.set(group.type, group);
    }
  }

  const usedTypes = new Set();
  const sections = HOME_SECTION_DEFINITIONS.map((definition) => {
    const entries = definition.entries
      .map((entry) => {
        const group = availableGroups.get(entry.type);
        if (!group) return null;
        usedTypes.add(entry.type);
        return { ...entry, group };
      })
      .filter(Boolean);

    return entries.length ? { ...definition, entries } : null;
  }).filter(Boolean);

  // Future template types remain visible even before a product-defined position
  // is added for them. This prevents a backend addition from silently vanishing.
  for (const [type, group] of availableGroups) {
    if (usedTypes.has(type)) continue;
    sections.push({
      id: `additional-${type}`,
      title: getTemplateTypeDisplayName(type),
      entries: [{ type, group }],
    });
  }

  return sections;
}
