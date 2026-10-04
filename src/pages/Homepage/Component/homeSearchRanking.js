import {
  HOME_SECTION_DEFINITIONS,
  getHomeTemplateSearchText,
} from "./homeTemplatePresentation.js";

export function normalizeSearchValue(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getSubtypeSearchScore(subtype, normalizedQuery) {
  const text = normalizeSearchValue(subtype);
  if (!text || !normalizedQuery) return 0;
  if (text === normalizedQuery) return 500;
  if (text.startsWith(normalizedQuery)) return 450;

  const words = text.split(" ").filter(Boolean);
  if (words.some((word) => word.startsWith(normalizedQuery))) return 425;
  if (text.includes(normalizedQuery)) return 400;

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  if (queryWords.length > 1 && queryWords.every((word) => text.includes(word))) {
    return 350;
  }
  return 0;
}

function getTemplateSearchKey(template, type) {
  if (template?.id) return `id:${template.id}`;
  return [type, template?.Subtype, template?.serial, template?.image]
    .map((value) => String(value || ""))
    .join("|");
}

export function buildDeepSearchResults(
  cachedTemplates,
  rawQuery,
  getDeepTemplates = () => [],
) {
  const normalizedQuery = normalizeSearchValue(rawQuery);
  if (!normalizedQuery) return [];

  const cachedByType = new Map(
    (Array.isArray(cachedTemplates) ? cachedTemplates : [])
      .filter((group) => group?.type)
      .map((group) => [group.type, group]),
  );
  const orderedTypes = [];
  const seenTypes = new Set();

  for (const definition of HOME_SECTION_DEFINITIONS) {
    for (const entry of definition.entries || []) {
      if (!entry?.type || seenTypes.has(entry.type)) continue;
      seenTypes.add(entry.type);
      orderedTypes.push(entry.type);
    }
  }
  for (const group of Array.isArray(cachedTemplates) ? cachedTemplates : []) {
    if (!group?.type || seenTypes.has(group.type)) continue;
    seenTypes.add(group.type);
    orderedTypes.push(group.type);
  }

  return orderedTypes
    .map((type, typeIndex) => {
      const cachedGroup = cachedByType.get(type);
      const normalItems = Array.isArray(cachedGroup?.templates)
        ? cachedGroup.templates
        : [];
      const deepItemsForType = getDeepTemplates(type);
      const deepGeneralItems = Array.isArray(deepItemsForType)
        ? deepItemsForType
        : [];
      const typeMatched = getHomeTemplateSearchText(type).includes(normalizedQuery);
      const candidateByKey = new Map();

      const addCandidate = (template, normalIndex = Number.MAX_SAFE_INTEGER) => {
        if (!template) return;
        const key = getTemplateSearchKey(template, type);
        const score = getSubtypeSearchScore(template?.Subtype, normalizedQuery);
        const current = candidateByKey.get(key);
        if (!current || score > current.score || normalIndex < current.normalIndex) {
          candidateByKey.set(key, { template, score, normalIndex, key });
        }
      };

      normalItems.forEach((template, index) => addCandidate(template, index));
      deepGeneralItems.forEach((template) => {
        if (getSubtypeSearchScore(template?.Subtype, normalizedQuery) > 0) {
          addCandidate(template);
        }
      });

      const matches = Array.from(candidateByKey.values())
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.normalIndex - b.normalIndex);

      if (!typeMatched && matches.length === 0) return null;

      const matchedKeys = new Set(matches.map((entry) => entry.key));
      let fallbackItems = normalItems;
      if (fallbackItems.length === 0 && typeMatched) {
        fallbackItems = deepGeneralItems.slice(0, 30);
      }

      const remaining = fallbackItems.filter(
        (template) => !matchedKeys.has(getTemplateSearchKey(template, type)),
      );
      const templates = [
        ...matches.map((entry) => entry.template),
        ...remaining,
      ];
      const bestScore = matches[0]?.score || (typeMatched ? 100 : 0);

      return {
        ...(cachedGroup || { type }),
        type,
        templates,
        __searchScore: bestScore,
        __typeIndex: typeIndex,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.__searchScore - a.__searchScore || a.__typeIndex - b.__typeIndex,
    )
    .map(({ __searchScore, __typeIndex, ...group }) => group);
}
