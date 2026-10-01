import { db } from "@firebase-config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { COLLECTIONS } from "../../../../collections";

function mapDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    image: data?.Showcase_url || "",
    company: data?.Company || "",
    MainType: data?.MainType || "",
    type: data?.SelectType,
    ShowCaseForm: data?.ShowCaseForm,
    serial: data?.serial,
    Subtype: data?.Subtype || "",
  };
}

let _cache = null;
let _cacheCompany = null;
let _cacheTs = 0;
let _cacheDate = "";
let _cacheGeneration = 0;
const CACHE_TTL = 10 * 60 * 1000;
const SESSION_CACHE_PREFIX = "mlmlive_trending_v2:";

export const TTrend_templateService = async (companyName) => {
  const requestedCompany = companyName || "";
  const requestGeneration = _cacheGeneration;
  const today = new Date().toISOString().split("T")[0];
  const now = Date.now();

  if (
    _cache !== null &&
    _cacheCompany === requestedCompany &&
    _cacheDate === today &&
    now - _cacheTs < CACHE_TTL
  ) {
    return _cache;
  }

  try {
    const storageKey = `${SESSION_CACHE_PREFIX}${today}:${requestedCompany}`;
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      const entry = JSON.parse(raw);
      if (
        Array.isArray(entry?.data) &&
        now - Number(entry.ts || 0) < CACHE_TTL
      ) {
        _cache = entry.data.map((item) => ({
          ...item,
          MainType:
            item?.MainType ||
            (item?.type === "Today_Trending" ? "MLM" : "General"),
        }));
        _cacheCompany = requestedCompany;
        _cacheDate = today;
        _cacheTs = Number(entry.ts);
        return _cache;
      }
      sessionStorage.removeItem(storageKey);
    }
  } catch {}

  try {
    const q1 = query(
      collection(db, COLLECTIONS.MLMTEMPLATE),
      where("MainType", "==", "General"),
      where("SelectType", "==", "Trending"),
      where("Active", "==", true),
      where("Launched", "==", true),
      where("Date", "==", today),
      limit(10),
    );

    const fetchList = [getDocs(q1)];

    if (requestedCompany) {
      const q2 = query(
        collection(db, COLLECTIONS.MLMTEMPLATE),
        where("MainType", "==", "MLM"),
        where("SelectType", "==", "Today_Trending"),
        where("Active", "==", true),
        where("Launched", "==", true),
        where("Company", "==", requestedCompany),
        limit(10),
      );
      fetchList.push(getDocs(q2));
    }

    const results = await Promise.all(fetchList);

    const seen = new Set();
    const templates = results
      .flatMap((snapshot) => snapshot.docs.map(mapDoc))
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

    if (requestGeneration === _cacheGeneration) {
      _cache = templates;
      _cacheCompany = requestedCompany;
      _cacheDate = today;
      _cacheTs = now;
      try {
        sessionStorage.setItem(
          `${SESSION_CACHE_PREFIX}${today}:${requestedCompany}`,
          JSON.stringify({ ts: now, data: templates }),
        );
      } catch {}
    }

    return templates;
  } catch (error) {
    // A failed request for company B must never fall back to company A.
    return _cacheCompany === requestedCompany ? _cache || [] : [];
  }
};

export function clearTrendingCache() {
  _cacheGeneration += 1;
  _cache = null;
  _cacheCompany = null;
  _cacheTs = 0;
  _cacheDate = "";
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {}
}
