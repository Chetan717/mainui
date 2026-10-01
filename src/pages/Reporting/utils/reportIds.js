export function generateProfileId() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateManagerId(name, mobile) {
  const namePart = name.replace(/\s+/g, "").toUpperCase().slice(0, 5).padEnd(5, "X");
  const mobilePart = String(mobile).slice(-5);
  return `MN${namePart}${mobilePart}`;
}

export function generateMemberId(name, mobile) {
  const namePart = name.replace(/\s+/g, "").toUpperCase().slice(0, 5).padEnd(5, "X");
  const mobilePart = String(mobile).slice(-5);
  return `MI${namePart}${mobilePart}`;
}

export const WEEK_DAYS = ["THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"];
export const WEEK_DAY_JS = [4, 5, 6, 0, 1, 2, 3];

export function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateToWeekSlot(date) {
  const d = date instanceof Date ? date : date.toDate();
  const day = d.getDay();
  return WEEK_DAY_JS.indexOf(day);
}
