export const EVERYDAY_MOMENTS_GROUP_KEY = "everyday-moments";

export const EVERYDAY_MOMENT_ENTRIES = Object.freeze([
  { type: "Good_Morning", label: "Good Morning" },
  { type: "Sport", label: "Sport" },
  { type: "Daily_Life", label: "Daily Life" },
  { type: "Greeting_Wishes", label: "Greeting Wishes" },
  {
    type: "Devotional_Spiritual",
    label: "Devotional & Spiritual",
  },
  { type: "Health_Tips", label: "Health Tips" },
  { type: "Leader_Quotes", label: "Leader Quotes" },
]);

const EVERYDAY_MOMENT_TYPE_SET = new Set(
  EVERYDAY_MOMENT_ENTRIES.map((entry) => entry.type),
);

const OTHER_SUBTYPE_KEY = "__other__";

export function isEverydayMomentType(value) {
  return EVERYDAY_MOMENT_TYPE_SET.has(String(value || "").trim());
}

export function getEverydayMomentSubtypeLabel(value) {
  const label = String(value || "").trim();
  return label ? label.replaceAll("_", " ") : "Other";
}

export function getEverydayMomentSubtypeKey(value) {
  const subtype = String(value || "").trim();
  return subtype ? subtype.toLocaleLowerCase() : OTHER_SUBTYPE_KEY;
}

export function getEverydayMomentItemSubtype(item) {
  return item?._template?.Subtype ?? item?.Subtype ?? "";
}

export function getEverydayMomentSubtypeOptions(items = []) {
  const options = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const subtype = getEverydayMomentItemSubtype(item);
    const key = getEverydayMomentSubtypeKey(subtype);
    if (!options.has(key)) {
      options.set(key, {
        key,
        label: getEverydayMomentSubtypeLabel(subtype),
      });
    }
  }

  return Array.from(options.values());
}

export function filterEverydayMomentItems(items = [], subtypeKey = "") {
  const safeItems = Array.isArray(items) ? items : [];
  if (!subtypeKey) return safeItems;

  return safeItems.filter(
    (item) =>
      getEverydayMomentSubtypeKey(getEverydayMomentItemSubtype(item)) ===
      subtypeKey,
  );
}

export function groupEverydayMomentItemsBySubtype(items = []) {
  const groups = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const subtype = getEverydayMomentItemSubtype(item);
    const key = getEverydayMomentSubtypeKey(subtype);
    let group = groups.get(key);

    if (!group) {
      group = {
        key,
        label: getEverydayMomentSubtypeLabel(subtype),
        items: [],
      };
      groups.set(key, group);
    }

    group.items.push(item);
  }

  return Array.from(groups.values());
}
