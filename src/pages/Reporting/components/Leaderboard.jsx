import { useState, useEffect, useCallback } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Trophy, Medal, Loader2, RefreshCw, Calendar } from "lucide-react";
import { COLLECTIONS } from "../../../collections";

const SCORE_COLS = {
  plan:   COLLECTIONS.REPORTPLAN,
  sp:     COLLECTIONS.REPORTSP,
  nac:    COLLECTIONS.REPORTNAC,
  follow: COLLECTIONS.REPORTFOLLOWUP,
  kit:    COLLECTIONS.REPORTKITBOOK,
};

function getThisWeekRange() {
  const today = new Date();
  const day   = today.getDay(); // 0=Sun
  const thu   = new Date(today);
  thu.setDate(today.getDate() - ((day + 3) % 7));
  const wed = new Date(thu);
  wed.setDate(thu.getDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(thu), to: fmt(wed) };
}

function parseDate(str)    { const [y,m,d]=str.split("-"); return new Date(+y,+m-1,+d,0,0,0,0); }
function parseDateEnd(str) { const [y,m,d]=str.split("-"); return new Date(+y,+m-1,+d,23,59,59,999); }

async function fetchAllDescendants(profileId) {
  const all = [];
  const toFetch = [profileId];
  const visited = new Set();
  while (toFetch.length) {
    const id = toFetch.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", id))
      );
      snap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        all.push(data);
        const childId = data.profileId || data.memberId;
        if (childId && !visited.has(childId)) toFetch.push(childId);
      });
    } catch { /* skip */ }
  }
  return all;
}

async function fetchScores(members, start, end) {
  const idToMember = {};
  members.forEach((m) => {
    const mid = m.profileId || m.memberId || m.id;
    idToMember[mid] = { ...m, memberId: mid, plan: 0, follow: 0, kit: 0, sp: 0, nac: 0, total: 0 };
  });

  await Promise.all(
    Object.entries(SCORE_COLS).map(async ([key, col]) => {
      try {
        const snap = await getDocs(collection(db, col));
        snap.docs.forEach((d) => {
          const data = d.data();
          const mid  = data.memberId;
          if (!idToMember[mid]) return;
          const raw = data.date;
          const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (!dt || dt < start || dt > end) return;
          idToMember[mid][key]++;
        });
      } catch { /* skip */ }
    })
  );

  return Object.values(idToMember).map((m) => ({
    ...m,
    total: m.plan + m.sp + m.nac + m.follow + m.kit,
  })).sort((a, b) => b.total - a.total || a.name?.localeCompare(b.name));
}

const RANK_COLORS = [
  { bg: "bg-yellow-400", text: "text-yellow-900", ring: "ring-yellow-300", icon: "🥇" },
  { bg: "bg-gray-300",   text: "text-gray-800",   ring: "ring-gray-200",   icon: "🥈" },
  { bg: "bg-amber-600",  text: "text-amber-50",   ring: "ring-amber-400",  icon: "🥉" },
];

function RankBadge({ rank }) {
  if (rank < 3) {
    const c = RANK_COLORS[rank];
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[16px] shrink-0 ring-2 ${c.ring}`}>
        {c.icon}
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-black text-muted-foreground shrink-0">
      {rank + 1}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center min-w-[32px]">
      <span className={`text-[13px] font-black ${color}`}>{value}</span>
      <span className="text-[8px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function LeaderRow({ member, rank, isMe }) {
  const avatarColors = [
    "bg-blue-500","bg-purple-500","bg-green-500","bg-orange-500","bg-pink-500","bg-teal-500",
  ];
  const avatarColor = avatarColors[rank % avatarColors.length];

  return (
    <div className={`flex items-center gap-3 px-3 py-3 rounded-2xl border transition-all ${
      isMe
        ? "border-accent/40 bg-accent/5"
        : rank === 0
          ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
          : "border-border bg-card"
    }`}>
      <RankBadge rank={rank} />
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0 ${avatarColor}`}>
        {member.name?.[0]?.toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-bold truncate ${isMe ? "text-accent" : "text-foreground"}`}>
          {member.name} {isMe && <span className="text-[9px] font-normal opacity-70">(You)</span>}
        </p>
        <p className="text-[9px] text-muted-foreground font-mono">ID: {member.memberId}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatPill label="Plan"   value={member.plan}   color="text-blue-500" />
        <StatPill label="Follow" value={member.follow} color="text-indigo-500" />
        <StatPill label="Kit"    value={member.kit}    color="text-cyan-500" />
        <StatPill label="SP"     value={member.sp}     color="text-green-500" />
        <StatPill label="NAC"    value={member.nac}    color="text-orange-500" />
        <div className="w-px h-6 bg-border mx-0.5" />
        <div className="flex flex-col items-center min-w-[32px]">
          <span className="text-[15px] font-black text-foreground">{member.total}</span>
          <span className="text-[8px] text-muted-foreground">Total</span>
        </div>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { key: "total",  label: "Total",   color: "text-foreground"   },
  { key: "sp",     label: "SP",      color: "text-green-500"    },
  { key: "plan",   label: "Plan",    color: "text-blue-500"     },
  { key: "kit",    label: "Kit",     color: "text-cyan-500"     },
  { key: "follow", label: "Followup",color: "text-indigo-500"   },
  { key: "nac",    label: "NAC",     color: "text-orange-500"   },
];

export default function Leaderboard({ profile }) {
  const myId = profile.profileId || profile.managerId;

  const defaultRange = getThisWeekRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo,   setDateTo]   = useState(defaultRange.to);
  const [loading,  setLoading]  = useState(false);
  const [rows,     setRows]     = useState(null);
  const [pending,  setPending]  = useState(true);
  const [sortKey,  setSortKey]  = useState("total");

  const load = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const start = parseDate(from);
      const end   = parseDateEnd(to);
      const members = await fetchAllDescendants(myId);
      if (members.length === 0) { setRows([]); return; }
      const scored = await fetchScores(members, start, end);
      setRows(scored);
    } catch (e) {
      
      setRows([]);
    } finally {
      setLoading(false);
      setPending(false);
    }
  }, [myId]);

  useEffect(() => { load(dateFrom, dateTo); }, []);

  const handleApply = () => { setPending(false); load(dateFrom, dateTo); };

  // Sort rows by selected key
  const sortedRows = rows
    ? [...rows].sort((a, b) => b[sortKey] - a[sortKey] || a.name?.localeCompare(b.name))
    : null;

  const myRank = sortedRows ? sortedRows.findIndex((r) => r.memberId === myId) : -1;

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#f59e0b,#eab308,#f97316)" }} />
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-[14px] leading-tight">Team Leaderboard</p>
            <p className="text-[10px] text-muted-foreground">
              Ranked by Plan + Follow Up + Kit + SP + NAC
            </p>
          </div>
          {sortedRows && (
            <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
              {sortedRows.length}
            </span>
          )}
        </div>
      </div>

      {/* Sort Filter Pills */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Sort by Maximum</p>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                sortKey === opt.key
                  ? "bg-accent text-white border-accent"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Date Range</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">From</label>
            <input type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPending(true); }}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">To</label>
            <input type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPending(true); }}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
        </div>
        <button
          onClick={handleApply}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
            : <><RefreshCw className="w-4 h-4" /> {pending ? "Apply" : "Refresh"}</>}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-[12px] text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          Fetching scores...
        </div>
      )}

      {!loading && sortedRows !== null && sortedRows.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-[14px] font-bold text-foreground">No team members yet</p>
          <p className="text-[11px] text-muted-foreground">
            Share your ID{" "}
            <span className="font-mono font-bold text-accent">{myId}</span>{" "}
            to start building your network.
          </p>
        </div>
      )}

      {!loading && sortedRows && sortedRows.length > 0 && (
        <div className="space-y-2">
          {sortedRows[0] && (
            <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700 p-4 text-center shadow-md mb-2">
              <div className="text-3xl mb-1">🥇</div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-black mx-auto mb-2 bg-blue-500">
                {sortedRows[0].name?.[0]?.toUpperCase() || "?"}
              </div>
              <p className="font-black text-foreground text-[15px] leading-tight">{sortedRows[0].name}</p>
              <p className="text-[10px] text-muted-foreground font-mono mb-2">ID: {sortedRows[0].memberId}</p>
              <div className="flex items-center justify-center gap-3">
                {[
                  { label: "Plan",   value: sortedRows[0].plan,   color: "text-blue-600" },
                  { label: "Follow", value: sortedRows[0].follow, color: "text-indigo-600" },
                  { label: "Kit",    value: sortedRows[0].kit,    color: "text-cyan-600" },
                  { label: "SP",     value: sortedRows[0].sp,     color: "text-green-600" },
                  { label: "NAC",    value: sortedRows[0].nac,    color: "text-orange-600" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center">
                    <span className={`text-[16px] font-black ${s.color}`}>{s.value}</span>
                    <span className="text-[8px] text-muted-foreground">{s.label}</span>
                  </div>
                ))}
                <div className="w-px h-8 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="text-[20px] font-black text-amber-600">{sortedRows[0].total}</span>
                  <span className="text-[8px] text-muted-foreground">Total</span>
                </div>
              </div>
            </div>
          )}

          {sortedRows.slice(1).map((member, i) => (
            <LeaderRow
              key={member.id || member.memberId}
              member={member}
              rank={i + 1}
              isMe={member.memberId === myId}
            />
          ))}

          <div className="pt-2 text-center">
            <p className="text-[10px] text-muted-foreground">
              {dateFrom} → {dateTo} · {sortedRows.length} member{sortedRows.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
