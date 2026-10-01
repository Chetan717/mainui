import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { db } from "../../Firebase";
import {
  collection, query, where, getDocs,
  doc, updateDoc, addDoc, Timestamp, deleteField,
} from "firebase/firestore";
import ProfileCard    from "./components/ProfileCard";
import NetworkTree    from "./components/NetworkTree";
import MemberGraph    from "./components/MemberGraph";
import MemberReportView from "./components/MemberReportView";
import TeamReportView   from "./components/TeamReportView";
import AddPlan, { WorkModal, WorkButton } from "./components/AddPlan";
import AddFollowUp    from "./components/AddFollowUp";
import AddKitBook     from "./components/AddKitBook";
import AddSPClosed    from "./components/AddSPClosed";
import AddNAC         from "./components/AddNAC";
import AddNextDayPlan from "./components/AddNextDayPlan";
import Leaderboard    from "./components/Leaderboard";
import AddGuest          from "./components/AddGuest";
import ViewGuestList     from "./components/ViewGuestList";
import TeamWeeklyReport  from "./components/TeamWeeklyReport";
import {
  Users, GitBranch, BookOpen, TrendingUp, Award, CalendarPlus,
  Eye, UserCheck, UserPlus, Search, X, CheckCircle, XCircle,
  Clock, ShieldAlert, UserMinus, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../collections";

/* ─── Shared time-range builder (mirrors MemberGraph logic) ─── */
const GRAPH_METRICS = [
  { key: "plan",   label: "Plan",   color: "#0088DA" },
  { key: "follow", label: "Follow", color: "#1a6fbf" },
  { key: "kit",    label: "Kit",    color: "#2196f3" },
  { key: "sp",     label: "SP",     color: "#43a047" },
  { key: "nac",    label: "NAC",    color: "#ff7043" },
];
const GRAPH_FILTERS = ["Daily", "Weekly", "Monthly", "Yearly"];
const GRAPH_COLS = {
  plan:   COLLECTIONS.REPORTPLAN   || "reportplan",
  follow: COLLECTIONS.REPORTFOLLOWUP || "reportfollowup",
  kit:    COLLECTIONS.REPORTKITBOOK  || "reportkitbook",
  sp:     COLLECTIONS.REPORTSP      || "reportsp",
  nac:    COLLECTIONS.REPORTNAC     || "reportnac",
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
      const end   = new Date(now.getFullYear(), mo + 1, 0, 23,59,59,999);
      return { label: start.toLocaleDateString("en-IN", { month: "short" }), start, end };
    });
  }
  return Array.from({ length: 4 }, (_, i) => {
    const yr = now.getFullYear() - (3 - i);
    return { label: String(yr), start: new Date(yr,0,1), end: new Date(yr,11,31,23,59,59,999) };
  });
}

/* ─── Team Graph member picker ───────────────────────────────── */
const TG_PAGE_SIZE = 6;

function MemberFilterPicker({ members, selected, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      (m.profileId || m.memberId || m.id || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TG_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * TG_PAGE_SIZE, (safePage + 1) * TG_PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60">
          <div>
            <p className="font-bold text-foreground text-[14px]">Filter by Member</p>
            <p className="text-[10px] text-muted-foreground">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input ref={inputRef} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name or ID…"
              className="flex-1 bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground" />
            {search && <button onClick={() => { setSearch(""); setPage(0); }}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
        </div>
        <div className="px-3 pb-2 min-h-[160px]">
          {/* All option */}
          <button onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left mb-1 ${
              selected === null ? "bg-accent/10 border border-accent/30" : "hover:bg-accent/5"
            }`}>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">All Members</p>
              <p className="text-[10px] text-muted-foreground">Combined team activity</p>
            </div>
            {selected === null && <CheckCircle className="w-4 h-4 text-accent shrink-0" />}
          </button>
          <div className="space-y-0.5">
            {pageItems.map((m) => {
              const mid = m.profileId || m.memberId || m.id;
              const isSelected = selected?.mid === mid;
              return (
                <button key={mid} onClick={() => onSelect({ mid, name: m.name })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-accent/5"
                  }`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                    {m.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{m.name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{mid}</p>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
          {pageItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <p className="text-[12px]">No members match your search</p>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-40 hover:bg-muted/50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-[11px] text-muted-foreground">{safePage + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-40 hover:bg-muted/50 transition-colors">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="h-safe-bottom pb-2" />
      </div>
    </div>
  );
}

/* ─── Team Graph ─────────────────────────────────────────────── */
function TeamGraph({ myId }) {
  const [filter,        setFilter]        = useState("Daily");
  const [chartData,     setChartData]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeMetrics, setActiveMetrics] = useState(["plan","follow","kit","sp","nac"]);
  const [memberCount,   setMemberCount]   = useState(null);
  const [allMembers,    setAllMembers]    = useState([]);
  const [selectedMember, setSelectedMember] = useState(null); // null = All
  const [pickerOpen,    setPickerOpen]    = useState(false);

  // Fetch team members list once
  useEffect(() => {
    if (!myId) return;
    getDocs(query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", myId)))
      .then((snap) => {
        const members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllMembers(members);
        setMemberCount(members.length);
      })
      .catch(() => {});
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Determine which memberIds to query
        let memberIds;
        if (selectedMember) {
          memberIds = [selectedMember.mid];
        } else {
          const membersSnap = await getDocs(
            query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", myId))
          );
          memberIds = membersSnap.docs
            .map((d) => d.data().profileId || d.data().memberId || d.id)
            .filter(Boolean);
        }

        if (memberIds.length === 0) {
          if (!cancelled) { setChartData([]); setLoading(false); }
          return;
        }

        const ranges  = buildRanges(filter);
        const result  = ranges.map((r) => ({ label: r.label, plan:0, follow:0, kit:0, sp:0, nac:0 }));
        const earliest = ranges[0].start;

        const chunks = [];
        for (let i = 0; i < memberIds.length; i += 30) chunks.push(memberIds.slice(i, i + 30));

        await Promise.all(Object.entries(GRAPH_COLS).map(async ([key, col]) => {
          await Promise.all(chunks.map(async (chunk) => {
            const snap = await getDocs(
              query(collection(db, col), where("memberId", "in", chunk))
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
        }));

        if (!cancelled) { setChartData(result); setLoading(false); }
      } catch (e) {
        
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filter, myId, selectedMember]);

  const toggleMetric = (k) =>
    setActiveMetrics((prev) => prev.includes(k) ? prev.filter((m) => m !== k) : [...prev, k]);
  const maxVal = Math.max(1, ...chartData.flatMap((d) => activeMetrics.map((k) => d[k])));

  if (memberCount === 0) return null;

  return (
    <>
      {pickerOpen && (
        <MemberFilterPicker
          members={allMembers}
          selected={selectedMember}
          onSelect={(m) => { setSelectedMember(m); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <p className="font-bold text-[13px] text-foreground">Team Activity</p>
            {memberCount !== null && (
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="text-[11px] font-semibold text-accent border border-accent/30 bg-background rounded-xl px-2 py-1 focus:outline-none cursor-pointer">
            {GRAPH_FILTERS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Member filter pill */}
        <button
          onClick={() => setPickerOpen(true)}
          className={`flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
            selectedMember
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted-foreground hover:border-accent/50"
          }`}
        >
          <Search className="w-3 h-3" />
          {selectedMember ? selectedMember.name : "All Members"}
          {selectedMember && (
            <span
              className="ml-0.5 text-accent hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); setSelectedMember(null); }}
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {GRAPH_METRICS.map((m) => (
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
            <Users className="w-7 h-7 mb-2 opacity-30" />
            <p className="text-[11px]">No team activity for this period</p>
          </div>
        ) : (
          <div className="flex items-end gap-1 h-32 px-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                <div className="w-full flex items-end justify-center gap-px h-24">
                  {GRAPH_METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => {
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
    </>
  );
}

/* ─── Today badge ────────────────────────────────────────────── */
function TodayCountBadge({ memberId, collectionName }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!memberId) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    getDocs(query(collection(db, collectionName), where("memberId", "==", memberId)))
      .then((snap) => {
        let cnt = 0;
        snap.docs.forEach((d) => {
          const raw = d.data().date;
          const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (dt && dt >= start && dt <= end) cnt++;
        });
        setCount(cnt);
      })
      .catch(() => setCount(0));
  }, [memberId, collectionName]);
  if (count === null) return null;
  return count;
}

/* ─── Work items config ──────────────────────────────────────── */
const WORK_ITEMS = [
  { key: "plan",     label: "Add Plan",          subtitle: "People you planned to meet",   icon: Users,       collection: "reportplan"     },
  { key: "followup", label: "Add Follow Up",      subtitle: "Track follow-ups on plans",    icon: GitBranch,   collection: "reportfollowup" },
  { key: "kitbook",  label: "Add Kit Book",       subtitle: "Record kit book sales",        icon: BookOpen,    collection: "reportkitbook"  },
  { key: "sp",       label: "Add SP Closed",      subtitle: "Record sales point closed",    icon: TrendingUp,  collection: "reportsp"       },
  { key: "nac",      label: "Add NAC",            subtitle: "New account conversion",       icon: Award,       collection: "reportnac"      },
  { key: "nextday",  label: "Next Day Planning",  subtitle: "Plan people to meet tomorrow", icon: CalendarPlus,collection: null             },
];

function WorkItemModal({ modalKey, onClose, memberProfile }) {
  if (!modalKey) return null;
  const item = WORK_ITEMS.find((w) => w.key === modalKey);
  if (!item) return null;
  const Icon = item.icon;
  const ContentMap = { plan: AddPlan, followup: AddFollowUp, kitbook: AddKitBook, sp: AddSPClosed, nac: AddNAC, nextday: AddNextDayPlan };
  const Content = ContentMap[modalKey];
  return (
    <WorkModal open={true} onClose={onClose} title={item.label} subtitle={item.subtitle} icon={<Icon className="w-4 h-4 text-accent" />}>
      <Content memberProfile={memberProfile} onClose={onClose} />
    </WorkModal>
  );
}

/* ─── Pending-request approval card (shown inline on dashboard) ── */
function PendingRequestCard({ request, onApprove, onDeny }) {
  const [actioning, setActioning] = useState(false);

  const handle = async (action) => {
    setActioning(true);
    await (action === "approve" ? onApprove() : onDeny());
    setActioning(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-800 shadow-md">
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)" }} />
      <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-black text-foreground leading-tight">Team Invite</p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            <span className="font-bold text-foreground">{request.fromName}</span>
            <span className="font-mono text-[10px] text-muted-foreground"> · {request.fromId}</span>
            {" "}wants to add you to their team
          </p>
        </div>
      </div>
      <div className="bg-card dark:bg-gray-900 px-4 pb-3 pt-2 space-y-2.5">
        <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          If you <strong>Confirm</strong>, you will appear in their network tree and they can view your team reports.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handle("deny")}
            disabled={actioning}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-[12px] hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
          >
            {actioning ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <><XCircle className="w-3.5 h-3.5" /> Deny</>}
          </button>
          <button
            onClick={() => handle("approve")}
            disabled={actioning}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-bold text-[12px] disabled:opacity-50 transition-opacity"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            {actioning ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Confirm</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Team members list with search, pagination & unassign ──── */
const MEMBERS_PAGE_SIZE = 8;

function TeamMembersList({ myId, onUnassigned }) {
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [removing,  setRemoving]  = useState(false);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(0);

  const load = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", myId))
      );
      setMembers(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
    } catch (e) {
      
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => { load(); }, [load]);

  const handleUnassign = async (member) => {
    setRemoving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.REPORTINGUSER, member.docId), {
        managerId:   deleteField(),
        managerName: deleteField(),
      });
      setMembers((prev) => prev.filter((m) => m.docId !== member.docId));
      setConfirmId(null);
      toast.success(`${member.name} has been removed from your team`);
      onUnassigned && onUnassigned();
    } catch (e) {
      
      toast.danger("Failed to unassign member");
    } finally {
      setRemoving(false);
    }
  };

  /* derived — filtered + paginated */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        (m.profileId || m.memberId || m.id || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMBERS_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * MEMBERS_PAGE_SIZE, (safePage + 1) * MEMBERS_PAGE_SIZE);

  const handleSearch = (v) => { setSearch(v); setPage(0); setConfirmId(null); };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-muted-foreground">
        <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
        Loading team members…
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-5">
        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-[12px] text-muted-foreground">No team members yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={`Search ${members.length} member${members.length !== 1 ? "s" : ""}…`}
          className="flex-1 bg-transparent text-[12px] outline-none text-foreground placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => handleSearch("")}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Count info */}
      {search && (
        <p className="text-[10px] text-muted-foreground px-1">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </p>
      )}

      {/* Empty filtered state */}
      {pageItems.length === 0 && (
        <div className="text-center py-5">
          <Users className="w-7 h-7 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-[12px] text-muted-foreground">No members match your search</p>
        </div>
      )}

      {/* Member cards */}
      {pageItems.map((member) => {
        const mid = member.profileId || member.memberId || member.id;
        const isConfirming = confirmId === member.docId;
        return (
          <div key={member.docId}
            className={`rounded-xl border transition-all overflow-hidden ${
              isConfirming ? "border-red-300 dark:border-red-800" : "border-border"
            }`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                {member.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">{member.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">ID: {mid}</p>
              </div>
              {!isConfirming ? (
                <button
                  onClick={() => setConfirmId(member.docId)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-[11px] font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0">
                  <UserMinus className="w-3.5 h-3.5" /> Unassign
                </button>
              ) : (
                <button
                  onClick={() => setConfirmId(null)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground text-[11px] font-bold hover:bg-muted/40 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            {/* Inline confirm strip */}
            {isConfirming && (
              <div className="border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-3 py-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="flex-1 text-[11px] text-red-700 dark:text-red-300 leading-snug">
                  Remove <strong>{member.name}</strong> from your team? They can be re-invited later.
                </p>
                <button
                  onClick={() => handleUnassign(member)}
                  disabled={removing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold disabled:opacity-60 transition-opacity shrink-0">
                  {removing
                    ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><UserMinus className="w-3 h-3" /> Confirm</>}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-40 hover:bg-muted/50 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[11px] text-muted-foreground">
            Page {safePage + 1} of {totalPages}
            <span className="ml-1 opacity-60 text-[10px]">· {filtered.length} member{filtered.length !== 1 ? "s" : ""}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-40 hover:bg-muted/50 transition-colors">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Add-to-team section (shown to the REQUESTER) ──────────── */
function AddToTeamSection({ profile, onRequestSent }) {
  const [input,       setInput]       = useState("");
  const [memberInfo,  setMemberInfo]  = useState(null);
  const [fetching,    setFetching]    = useState(false);
  const [sending,     setSending]     = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const myId   = profile.profileId || profile.managerId;
  const myName = profile.name || "";

  const handleFind = async () => {
    const tid = input.trim().toUpperCase();
    if (!tid || tid.length < 4) { toast.danger("Enter a valid ID (min 4 characters)"); return; }
    if (tid === myId)            { toast.danger("You cannot add yourself");              return; }

    setFetching(true);
    setMemberInfo(null);
    setRequestSent(false);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.REPORTINGUSER), where("profileId", "==", tid))
      );
      if (snap.empty) {
        toast.danger("No profile found with this ID");
      } else {
        const found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setMemberInfo(found);

        // Check for existing pending request (separate try-catch so member result is always shown)
        try {
          const reqSnap = await getDocs(
            query(
              collection(db, COLLECTIONS.TEAMREQUESTS),
              where("fromId", "==", myId),
              where("toId",   "==", found.profileId),
              where("status", "==", "pending")
            )
          );
          setRequestSent(!reqSnap.empty);
        } catch {
          setRequestSent(false);
        }
      }
    } catch (e) {
      
      toast.danger("Could not find profile. Please try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!memberInfo) return;
    setSending(true);
    try {
      await addDoc(collection(db, COLLECTIONS.TEAMREQUESTS), {
        fromId:       myId,
        fromName:     myName,
        toId:         memberInfo.profileId,
        toDocId:      memberInfo.id,
        status:       "pending",
        createdAt:    Timestamp.now(),
      });
      setRequestSent(true);
      toast.success(`Request sent to ${memberInfo.name}!`);
      onRequestSent && onRequestSent();
    } catch (e) {
      
      toast.danger("Failed to send request");
    } finally {
      setSending(false);
    }
  };

  const alreadyInTeam   = memberInfo && !!memberInfo.managerId;
  const inMyTeam        = memberInfo && memberInfo.managerId === myId;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
          <UserPlus className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-foreground text-[13px]">Add to Your Team</p>
          <p className="text-[10px] text-muted-foreground">Search by Profile ID — member must approve the invite</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter Profile ID (e.g. RAHUL123)"
          value={input}
          onChange={(e) => {
            setMemberInfo(null);
            setRequestSent(false);
            setInput(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase());
          }}
          autoCapitalize="characters"
          className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-accent/30 uppercase"
        />
        <button
          onClick={handleFind}
          disabled={fetching || !input}
          className="px-4 py-2.5 rounded-xl text-white text-[12px] font-bold disabled:opacity-60 flex items-center gap-1.5 transition-opacity shrink-0"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}
        >
          {fetching
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><Search className="w-3.5 h-3.5" /> Find</>}
        </button>
      </div>

      {memberInfo && (
        <>
          {/* Member info card */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            inMyTeam
              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
              : alreadyInTeam
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
          }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0 ${
              inMyTeam ? "bg-blue-100 text-blue-700" : alreadyInTeam ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {memberInfo.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate">{memberInfo.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">ID: {memberInfo.profileId}</p>
              {inMyTeam && (
                <p className="text-[9px] text-blue-600 font-semibold mt-0.5">✓ Already in your team</p>
              )}
              {alreadyInTeam && !inMyTeam && (
                <p className="text-[9px] text-red-600 font-semibold mt-0.5">✗ Already a member of another team</p>
              )}
              {!alreadyInTeam && (
                <p className="text-[9px] text-green-600 font-semibold mt-0.5">✓ Available to join your team</p>
              )}
            </div>
            {inMyTeam   && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
            {alreadyInTeam && !inMyTeam && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            {!alreadyInTeam && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
          </div>

          {/* Action button */}
          {inMyTeam ? (
            <button disabled className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-[13px] font-bold opacity-60 cursor-not-allowed">
              Already in Your Team
            </button>
          ) : alreadyInTeam ? (
            <button disabled className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-[13px] font-bold opacity-60 cursor-not-allowed flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> Cannot Add — Already in a Team
            </button>
          ) : requestSent ? (
            <button disabled className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px] font-bold cursor-not-allowed flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Request Sent — Awaiting Approval
            </button>
          ) : (
            <button
              onClick={handleSendRequest}
              disabled={sending}
              className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><UserPlus className="w-3.5 h-3.5" /> Send Team Invite to {memberInfo.name}</>}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Pending requests watcher (runs on the TARGET's dashboard) ─ */
function usePendingRequests(myId, myDocId) {
  const [pendingRequests, setPendingRequests] = useState([]);

  const refresh = useCallback(async () => {
    if (!myId) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTIONS.TEAMREQUESTS),
          where("toId",   "==", myId),
          where("status", "==", "pending")
        )
      );
      setPendingRequests(snap.docs.map((d) => ({ reqDocId: d.id, ...d.data() })));
    } catch (e) {
      
    }
  }, [myId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleApprove = async (request, profile) => {
    try {
      // Update the member's profile: set managerId to the requester's ID
      await updateDoc(doc(db, COLLECTIONS.REPORTINGUSER, myDocId), {
        managerId:   request.fromId,
        managerName: request.fromName,
      });
      // Mark request as approved
      await updateDoc(doc(db, COLLECTIONS.TEAMREQUESTS, request.reqDocId), {
        status: "approved",
      });
      // Deny all other pending requests to this person
      const others = pendingRequests.filter((r) => r.reqDocId !== request.reqDocId);
      await Promise.all(
        others.map((r) =>
          updateDoc(doc(db, COLLECTIONS.TEAMREQUESTS, r.reqDocId), { status: "denied" })
        )
      );
      toast.success(`You have joined ${request.fromName}'s team!`);
      setPendingRequests([]);
      return true;
    } catch (e) {
      
      toast.danger("Failed to approve");
      return false;
    }
  };

  const handleDeny = async (request) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.TEAMREQUESTS, request.reqDocId), { status: "denied" });
      setPendingRequests((prev) => prev.filter((r) => r.reqDocId !== request.reqDocId));
      toast.success("Request denied");
      return true;
    } catch (e) {
      
      toast.danger("Failed to deny");
      return false;
    }
  };

  return { pendingRequests, handleApprove, handleDeny };
}

/* ─── Dashboard content (extracted to allow local state) ──────── */
function DashboardContent({ profile, selfProfile, myId, currentRequest, handleApprove, handleDeny, setProfile, refreshTeamCount, setTreeKey }) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <ProfileCard profile={profile} />

      {/* Inline pending invite card */}
      {currentRequest && (
        <PendingRequestCard
          request={currentRequest}
          onApprove={async () => {
            const ok = await handleApprove(currentRequest, profile);
            if (ok) {
              setProfile((p) => ({
                ...p,
                managerId:   currentRequest.fromId,
                managerName: currentRequest.fromName,
              }));
              refreshTeamCount();
              setTreeKey((k) => k + 1);
            }
          }}
          onDeny={() => handleDeny(currentRequest)}
        />
      )}

      {/* Manager badge */}
      {profile.managerId && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">You're in a Team</p>
            <p className="text-[12px] text-foreground font-medium">
              {profile.managerName || "Team Leader"}{" "}
              <span className="text-muted-foreground font-mono text-[10px]">· {profile.managerId}</span>
            </p>
          </div>
        </div>
      )}

      {/* My activity graph */}
      <MemberGraph memberProfile={selfProfile} />

      {/* Team activity graph (only shows if user has team members) */}
      <TeamGraph myId={myId} />

      {/* My Report — collapsible, collapsed by default */}
      {/* <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setReportOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground text-[13px] leading-tight">My Report</p>
              <p className="text-[10px] text-muted-foreground">Tap to view & export your weekly report</p>
            </div>
          </div>
          <GitBranch
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${reportOpen ? "rotate-90" : ""}`}
          />
        </button>
        {reportOpen && (
          <div className="border-t border-border/50">
            <MemberReportView memberProfile={selfProfile} />
          </div>
        )}
      </div> */}
    </div>
  );
}

export default function UnifiedView({ profile: initialProfile, activeTab }) {
  const [profile,    setProfile]    = useState(initialProfile);
  const [openModal,  setOpenModal]  = useState(null);
  const [viewChoice, setViewChoice] = useState(null);
  const [teamCount,  setTeamCount]  = useState(null);
  const [treeKey,    setTreeKey]    = useState(0);

  const myId      = profile.profileId || profile.managerId;
  const myDocId   = profile.id;
  const selfProfile = { ...profile, memberId: myId, managerId: myId };

  const { pendingRequests, handleApprove, handleDeny } =
    usePendingRequests(myId, myDocId);

  // Show one request at a time (the first pending one)
  const currentRequest = pendingRequests[0] || null;

  useEffect(() => {
    if (activeTab !== "view-work") setViewChoice(null);
  }, [activeTab]);

  const refreshTeamCount = useCallback(() => {
    if (!myId) return;
    getDocs(query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", myId)))
      .then((snap) => setTeamCount(snap.size))
      .catch(() => setTeamCount(0));
  }, [myId]);

  useEffect(() => { refreshTeamCount(); }, [refreshTeamCount]);

  /* Dashboard ─────────────────────────────────────────────────── */
  if (activeTab === "dashboard") {
    return (
      <DashboardContent
        profile={profile}
        selfProfile={selfProfile}
        myId={myId}
        currentRequest={currentRequest}
        handleApprove={handleApprove}
        handleDeny={handleDeny}
        setProfile={setProfile}
        refreshTeamCount={refreshTeamCount}
        setTreeKey={setTreeKey}
      />
    );
  }

  /* Add-team ───────────────────────────────────────────────────── */
  if (activeTab === "add-team") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

        {/* Invite section */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#0088DA,#4f6fcf)" }} />
          <div className="px-4 py-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[13px]">Add Reporting Team</p>
              <p className="text-[10px] text-muted-foreground">Search and invite members to join your team</p>
            </div>
          </div>
        </div>

        <AddToTeamSection
          profile={profile}
          onRequestSent={refreshTeamCount}
        />

        {/* Current team members with unassign */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
              <UserMinus className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[13px]">Current Team Members</p>
              <p className="text-[10px] text-muted-foreground">Tap Unassign to release a member from your team</p>
            </div>
          </div>
          <div className="p-3">
            <TeamMembersList
              myId={myId}
              onUnassigned={() => { refreshTeamCount(); setTreeKey((k) => k + 1); }}
            />
          </div>
        </div>

      </div>
    );
  }

  /* Add-work ───────────────────────────────────────────────────── */
  if (activeTab === "add-work") {
    return (
      <>
        <div className="px-4 py-5 space-y-3 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
            <p className="font-bold text-foreground text-[14px]">Add Work Reporting</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tap any section to open and fill your report</p>
          </div>

          {WORK_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <WorkButton
                key={item.key}
                icon={<Icon className="w-4 h-4 text-accent" />}
                label={item.label}
                subtitle={item.subtitle}
                count={item.collection ? <TodayCountBadge memberId={myId} collectionName={item.collection} /> : undefined}
                onClick={() => setOpenModal(item.key)}
              />
            );
          })}

          <WorkItemModal modalKey={openModal} onClose={() => setOpenModal(null)} memberProfile={selfProfile} />
        </div>
      </>
    );
  }

  /* View-work ──────────────────────────────────────────────────── */
  if (activeTab === "view-work") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <MemberReportView memberProfile={selfProfile} />
      </div>
    );
  }

  /* View-team ─────────────────────────────────────────────────── */
  if (activeTab === "view-team") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#0088DA,#4f6fcf)" }} />
          <div className="px-4 py-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[13px]">View Reporting Team</p>
              <p className="text-[10px] text-muted-foreground">
                {teamCount !== null
                  ? `${teamCount} direct member${teamCount !== 1 ? "s" : ""} in your network`
                  : "Your network & team reports"}
              </p>
            </div>
          </div>
        </div>

        {/* Network Tree */}
        <NetworkTree key={treeKey} profile={profile} />

        {/* Team Report Generator */}
        <TeamReportView managerProfile={{ ...profile, managerId: myId }} />

      </div>
    );
  }

  /* Team-weekly ──────────────────────────────────────────────── */
  if (activeTab === "team-weekly") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <TeamWeeklyReport managerProfile={{ ...profile, managerId: myId }} />
      </div>
    );
  }

  /* Add-guest ─────────────────────────────────────────────────── */
  if (activeTab === "add-guest") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <AddGuest memberProfile={selfProfile} />
      </div>
    );
  }

  /* View-guest-list ───────────────────────────────────────────── */
  if (activeTab === "view-guest-list") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <ViewGuestList memberProfile={selfProfile} />
      </div>
    );
  }

  /* Leaderboard ───────────────────────────────────────────────── */
  if (activeTab === "leaderboard") {
    return <Leaderboard profile={profile} />;
  }

  return (
    <div className="px-4 py-10 text-center max-w-2xl mx-auto">
      <p className="text-[13px] text-muted-foreground">Select a tab to continue</p>
    </div>
  );
}
