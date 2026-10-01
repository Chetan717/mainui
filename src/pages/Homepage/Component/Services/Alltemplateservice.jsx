import { db } from "@firebase-config";
import { COLLECTIONS } from "../../../../collections";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import {
  getAllGeneralTemplates,
  getGeneralTemplatesPage,
} from "./generalTemplateIndex";

export const ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS = 5 * 60 * 1000;

const _graphicsCache = new Map();
const _graphicsRequests = new Map();
let _graphicsCacheGeneration = 0;
const GRAPHICS_SESSION_CACHE_PREFIX = "mlmlive_all_template_graphics_v2:";

const LIVE_GENERAL_TEMPLATE_TYPES = new Set(["Domestic_Trip"]);

async function fetchLiveGeneralTemplates(selectedType) {
  if (!LIVE_GENERAL_TEMPLATE_TYPES.has(selectedType)) return [];
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.MLMTEMPLATE),
      where("SelectType", "==", selectedType),
      where("MainType", "==", "General"),
      where("Active", "==", true),
      where("Launched", "==", true),
    ),
  );
  return snapshot.docs
    .filter((docSnap) => {
      const data = docSnap.data();
      return (
        data?.MainType === "General" &&
        data?.Active === true &&
        data?.Launched === true
      );
    })
    .map(normalizeDoc)
    .sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0));
}

function getGraphicsCacheKey(selectedType, companyName) {
  return `${String(companyName || "").trim()}::${String(selectedType || "").trim()}`;
}

function readGraphicsSessionCache(cacheKey) {
  try {
    const raw = sessionStorage.getItem(`${GRAPHICS_SESSION_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (
      !entry ||
      !Array.isArray(entry.templates) ||
      Date.now() - Number(entry.timestamp || 0) >= ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS
    ) {
      sessionStorage.removeItem(`${GRAPHICS_SESSION_CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeGraphicsSessionCache(cacheKey, entry) {
  try {
    sessionStorage.setItem(
      `${GRAPHICS_SESSION_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify(entry),
    );
  } catch {
    // Large graphics sets can exceed browser storage quota; memory cache remains.
  }
}

function clearGraphicsSessionCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(GRAPHICS_SESSION_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

export function clearAllTemplateGraphicsCache() {
  _graphicsCacheGeneration += 1;
  _graphicsCache.clear();
  _graphicsRequests.clear();
  clearGraphicsSessionCache();
}

export function primeAllTemplateGraphicsCache(
  selectedType,
  companyName,
  templates,
) {
  if (!Array.isArray(templates)) return;

  const cacheKey = getGraphicsCacheKey(selectedType, companyName);
  const entry = { timestamp: Date.now(), templates };
  _graphicsCache.set(cacheKey, entry);
  writeGraphicsSessionCache(cacheKey, entry);
}

const normalizeDoc = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    image: data.Showcase_url || "",
    company: data.Company,
    Subtype: data.Subtype,
    type: data.SelectType,
    ShowCaseForm: data?.ShowCaseForm,
    serial: data?.serial,
    MainType: data.MainType,
    GraphicsLink: data.GraphicsLink || [],
  };
};

export const AllTemplateGraphicsService = async (
  selectedType,
  companyName,
) => {
  const cacheKey = getGraphicsCacheKey(selectedType, companyName);
  const cached = _graphicsCache.get(cacheKey);
  if (
    cached &&
    Date.now() - cached.timestamp < ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS
  ) {
    return cached.templates;
  }

  // Keep the exact existing 5-minute freshness window across a hard reload.
  // Explicit Home/company invalidation calls clearAllTemplateGraphicsCache(),
  // so this only removes duplicate reads inside the same freshness window.
  const persisted = readGraphicsSessionCache(cacheKey);
  if (persisted) {
    _graphicsCache.set(cacheKey, persisted);
    return persisted.templates;
  }

  const pending = _graphicsRequests.get(cacheKey);
  if (pending) return pending;

  const requestGeneration = _graphicsCacheGeneration;
  const request = (async () => {
    const generalTemplates = LIVE_GENERAL_TEMPLATE_TYPES.has(selectedType)
      ? await fetchLiveGeneralTemplates(selectedType)
      : getAllGeneralTemplates(selectedType);
    let mlmTemplates = [];

    if (companyName) {
      const mlmSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.MLMTEMPLATE),
          where("SelectType", "==", `${selectedType}`),
          where("MainType", "==", "MLM"),
          where("Company", "==", companyName),
          where("Active", "==", true),
          where("Launched", "==", true),
          orderBy("serial"),
        ),
      );
      mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
    }

    const templates = [...mlmTemplates, ...generalTemplates];
    if (requestGeneration === _graphicsCacheGeneration) {
      const entry = { timestamp: Date.now(), templates };
      _graphicsCache.set(cacheKey, entry);
      writeGraphicsSessionCache(cacheKey, entry);
    }
    return templates;
  })();

  _graphicsRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (_graphicsRequests.get(cacheKey) === request) {
      _graphicsRequests.delete(cacheKey);
    }
  }
};

export const Alltemplateservice = async (
  Selected_type,
  lastDoc = null,
  pageSize = 12,
  companyName,
) => {
  try {
    const lastSerialForJson = lastDoc?._generalLastSerial ?? null;
    const isLiveGeneralType = LIVE_GENERAL_TEMPLATE_TYPES.has(Selected_type);

    const liveGeneralTemplates = isLiveGeneralType
      ? await fetchLiveGeneralTemplates(Selected_type)
      : null;
    const liveStartIndex = isLiveGeneralType
      ? Number(lastDoc?._liveGeneralOffset || 0)
      : 0;
    const livePage = isLiveGeneralType
      ? liveGeneralTemplates.slice(liveStartIndex, liveStartIndex + pageSize)
      : null;
    const generalResult = isLiveGeneralType
      ? {
          templates: livePage,
          hasMore: liveStartIndex + pageSize < liveGeneralTemplates.length,
          lastSerial: livePage.length
            ? Number(livePage[livePage.length - 1]?.serial || 0)
            : null,
        }
      : getGeneralTemplatesPage(Selected_type, pageSize, lastSerialForJson);
    const generalTemplates = generalResult.templates;

    let mlmTemplates = [];
    let mlmLastDoc = null;

    if (companyName) {
      const mlmConstraints = [
        where("SelectType", "==", `${Selected_type}`),
        where("MainType", "==", "MLM"),
        where("Company", "==", companyName),
        where("Active", "==", true),
        where("Launched", "==", true),
        orderBy("serial"),
        limit(pageSize),
      ];

      if (lastDoc?._mlmLastDoc) {
        mlmConstraints.splice(-1, 0, startAfter(lastDoc._mlmLastDoc));
      }

      const mlmSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.MLMTEMPLATE), ...mlmConstraints)
      );

      mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
      mlmLastDoc = mlmSnapshot.docs[mlmSnapshot.docs.length - 1] || null;
    }

    const templates = [...mlmTemplates, ...generalTemplates];

    const newLastDoc = {
      _generalLastSerial: generalResult.lastSerial,
      _liveGeneralOffset: isLiveGeneralType
        ? liveStartIndex + generalTemplates.length
        : undefined,
      _mlmLastDoc: mlmLastDoc,
    };

    const hasMore = generalResult.hasMore || mlmTemplates.length === pageSize;

    return { templates, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    
    return { templates: [], lastDoc: null, hasMore: false };
  }
};
