import { db } from "@firebase-config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { COLLECTIONS } from "../../../../collections";

// 5-minute memory + same-tab session cache; explicit refresh clears both.
const _mem = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_CACHE_PREFIX = "mlmlive_festival_v2:";

function readCache(date) {
  if (_mem.has(date)) {
    const { ts, data } = _mem.get(date);
    if (Date.now() - ts < CACHE_TTL_MS) return data;
    _mem.delete(date);
  }

  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${date}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !Array.isArray(entry.data) || Date.now() - Number(entry.ts || 0) >= CACHE_TTL_MS) {
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${date}`);
      return null;
    }
    _mem.set(date, entry);
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(date, data) {
  const entry = { ts: Date.now(), data };
  _mem.set(date, entry);
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${date}`, JSON.stringify(entry));
  } catch {}
}

export function clearFestivalTemplateCache() {
  _mem.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {}
}

export const Festival_template = async (Selected_date, options = {}) => {
  const { bypassEmptyCache = false, forceRefresh = false } = options;
  const hit = readCache(Selected_date);
  if (!forceRefresh && hit !== null && (!bypassEmptyCache || hit.length > 0)) return hit;

  try {
    const q = query(
      collection(db, COLLECTIONS.MLMTEMPLATE),
      where("MainType", "==", "General"),
      where("SelectType", "==", "Festival"),
      where("Active", "==", true),
      where("Launched", "==", true),
      where("Date", "==", Selected_date),
      limit(20),
    );

    const snapshot = await getDocs(q);

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        image: data.Showcase_url || "",
        company: data.Company,
        MainType: data.MainType,
        type: data.SelectType,
        Subtype: data.Subtype || "",
        ShowCaseForm: data?.ShowCaseForm,
        serial: data?.serial,
        GraphicsLink: Array.isArray(data?.GraphicsLink) ? data.GraphicsLink.filter(Boolean) : [],
      };
    });

    writeCache(Selected_date, templates);
    return templates;
  } catch (error) {
    
    return [];
  }
};
