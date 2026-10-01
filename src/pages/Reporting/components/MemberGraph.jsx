import { useState, useEffect } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { BarChart3 } from "lucide-react";

const FILTERS = ["Daily", "Weekly", "Monthly", "Yearly"];
const METRICS = [
  { key: "plan",   label: "Plan",   color: "#0088DA" },
  { key: "follow", label: "Follow", color: "#1a6fbf" },
  { key: "kit",    label: "Kit",    color: "#2196f3" },
  { key: "sp",     label: "SP",     color: "#43a047" },
  { key: "nac",    label: "NAC",    color: "#ff7043" },
];
const COLLECTIONS = {
  plan:   "reportplan",
  follow: "reportfollowup",
  kit:    "reportkitbook",
  sp:     "reportsp",
  nac:    "reportnac",
};

function buildRanges(filter) {
  const now = new Date();
  if (filter === "Daily") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), start: d, end };
    });
  }
  if (filter === "Weekly") {
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(now); end.setDate(end.getDate() - i * 7); end.setHours(23,59,59,999);
      const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      return { label: `W${4 - i}`, start, end };
    }).reverse();
  }
  if (filter === "Monthly") {
    return Array.from({ length: 6 }, (_, i) => {
      const mo = now.getMonth() - (5 - i);
      const start = new Date(now.getFullYear(), mo, 1);
      const end   = new Date(now.getFullYear(), mo + 1, 0, 23, 59, 59, 999);
      return { label: start.toLocaleDateString("en-IN", { month: "short" }), start, end };
    });
  }
  return Array.from({ length: 4 }, (_, i) => {
    const yr = now.getFullYear() - (3 - i);
    return { label: String(yr), start: new Date(yr,0,1), end: new Date(yr,11,31,23,59,59,999) };
  });
}

export default function MemberGraph({ memberProfile }) {
  const [filter, setFilter]               = useState("Daily");
  const [chartData, setChartData]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeMetrics, setActiveMetrics] = useState(["plan","follow","kit","sp","nac"]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const ranges  = buildRanges(filter);
        const result  = ranges.map((r) => ({ label: r.label, plan:0, follow:0, kit:0, sp:0, nac:0 }));
        const earliest = ranges[0].start;

        await Promise.all(Object.entries(COLLECTIONS).map(async ([key, col]) => {
          // Single-field query only → no composite index required
          const snap = await getDocs(
            query(collection(db, col), where("memberId", "==", memberProfile.memberId))
          );
          snap.docs.forEach((d) => {
            const raw = d.data().date;
            const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
            if (!dt || dt < earliest) return;
            ranges.forEach((range, idx) => {
              if (dt >= range.start && dt <= range.end) result[idx][key]++;
            });
          });
        }));

        if (!cancelled) { setChartData(result); setLoading(false); }
      } catch (e) {
        
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filter, memberProfile.memberId]);

  const maxVal = Math.max(1, ...chartData.flatMap((d) => activeMetrics.map((k) => d[k])));
  const toggleMetric = (k) =>
    setActiveMetrics((prev) => prev.includes(k) ? prev.filter((m) => m !== k) : [...prev, k]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <p className="font-bold text-[13px] text-foreground">My Activity</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="text-[11px] font-semibold text-accent border border-accent/30 bg-background rounded-xl px-2 py-1 focus:outline-none cursor-pointer">
          {FILTERS.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {METRICS.map((m) => (
          <button key={m.key} onClick={() => toggleMetric(m.key)}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all"
            style={{
              borderColor: m.color,
              color: activeMetrics.includes(m.key) ? "white" : m.color,
              background: activeMetrics.includes(m.key) ? m.color : "transparent",
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : chartData.every((d) => activeMetrics.every((k) => d[k] === 0)) ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <BarChart3 className="w-7 h-7 mb-2 opacity-30" />
          <p className="text-[11px]">No data yet for this period</p>
        </div>
      ) : (
        <div className="flex items-end gap-1 h-32 px-1">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <div className="w-full flex items-end justify-center gap-px h-24">
                {METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => {
                  const pct = (d[m.key] / maxVal) * 100;
                  return (
                    <div key={m.key}
                      className="flex-1 rounded-t transition-all duration-500 min-h-[2px] max-w-[10px]"
                      style={{ height: `${Math.max(2, pct)}%`, background: m.color }}
                      title={`${m.label}: ${d[m.key]}`}
                    />
                  );
                })}
              </div>
              <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
