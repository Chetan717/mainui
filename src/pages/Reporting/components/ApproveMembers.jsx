import { useState, useEffect, useRef } from "react";
import { db } from "../../../Firebase";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc,
} from "firebase/firestore";
import {
  UserCheck, UserX, CheckCircle, Clock,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  X, Search, Users, AlertTriangle, Trash2,
} from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../../collections";

const PAGE_SIZE      = 5;
const MODAL_PAGE_SIZE = 8;

export default function ApproveMembers({ managerProfile }) {
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [approving,    setApproving]    = useState(null);
  const [removing,     setRemoving]     = useState(null);
  const [open,         setOpen]         = useState(true);
  const [pendingPage,  setPendingPage]  = useState(1);

  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [approvedSearch,    setApprovedSearch]    = useState("");
  const [approvedPage,      setApprovedPage]      = useState(1);
  const [approvedLoading,   setApprovedLoading]   = useState(false);

  /* track previous actionNeededCount to detect new arrivals */
  const prevCountRef  = useRef(null);
  const [newAlert,    setNewAlert]      = useState(false);

  /* ── Real-time listener ─────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, COLLECTIONS.REPORTINGUSER),
      where("managerId", "==", managerProfile.managerId),
      where("role",      "==", "Team Member"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
      setMembers(all);
      setLoading(false);

      /* fire alert animation only when count increases */
      const count = all.filter((m) => !m.approvedByManager || m.sendDeleteApproval).length;
      if (prevCountRef.current !== null && count > prevCountRef.current) {
        setNewAlert(true);
        setTimeout(() => setNewAlert(false), 4000);
      }
      prevCountRef.current = count;
    }, () => {
      toast.danger("Failed to load members");
      setLoading(false);
    });

    return () => unsub();
  }, [managerProfile.managerId]);

  useEffect(() => { setApprovedPage(1); }, [approvedSearch]);

  const handleApprove = async (member) => {
    setApproving(member.id);
    try {
      await updateDoc(doc(db, "reportingUser", member.id), { approvedByManager: true });
      toast.success(`${member.name} approved!`);
      setPendingPage(1);
    } catch {
      toast.danger("Approval failed");
    } finally {
      setApproving(null);
    }
  };

  const handleConfirmRemove = async (member) => {
    setRemoving(member.id);
    try {
      await updateDoc(doc(db, "reportingUser", member.id), {
        sendDeleteApproval: false,
        managerId:          "",
        approvedByManager:  false,
      });
      toast.success(`${member.name} has been removed successfully`);
    } catch {
      toast.danger("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  /* ── Categorise ─────────────────────────────────────────── */
  const pending        = members.filter((m) => !m.approvedByManager && !m.sendDeleteApproval);
  const deleteRequests = members.filter((m) => m.sendDeleteApproval);
  const approved       = members.filter((m) => m.approvedByManager  && !m.sendDeleteApproval);

  const pendingPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const pendingSlice = pending.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE);

  const filteredApproved   = approved.filter((m) => {
    const q = approvedSearch.toLowerCase().trim();
    if (!q) return true;
    return (m.name || "").toLowerCase().includes(q) || (m.mobile || "").includes(q);
  });
  const approvedTotalPages = Math.max(1, Math.ceil(filteredApproved.length / MODAL_PAGE_SIZE));
  const approvedSlice      = filteredApproved.slice(
    (approvedPage - 1) * MODAL_PAGE_SIZE,
    approvedPage * MODAL_PAGE_SIZE,
  );

  const openApprovedModal = () => {
    setApprovedLoading(true);
    setApprovedSearch("");
    setApprovedPage(1);
    setShowApprovedModal(true);
    setTimeout(() => setApprovedLoading(false), 400);
  };

  const actionNeededCount = pending.length + deleteRequests.length;
  const hasPending        = actionNeededCount > 0;

  return (
    <>
      {/* pulse keyframes injected once */}
      <style>{`
        @keyframes am-pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.40); }
          70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0);   }
          100% { box-shadow: 0 0 0 0   rgba(239,68,68,0);    }
        }
        @keyframes am-dot-pulse {
          0%,100% { opacity:1; transform:scale(1);   }
          50%     { opacity:.6; transform:scale(1.3); }
        }
        .am-ring-pulse  { animation: am-pulse-ring 1.8s ease-out infinite; }
        .am-dot-pulse   { animation: am-dot-pulse   1.4s ease-in-out infinite; }
        @keyframes am-shake {
          0%,100% { transform:translateX(0);   }
          20%     { transform:translateX(-4px); }
          40%     { transform:translateX( 4px); }
          60%     { transform:translateX(-3px); }
          80%     { transform:translateX( 3px); }
        }
        .am-shake { animation: am-shake 0.5s ease-in-out; }
      `}</style>

      <div
        className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-colors duration-300 ${
          hasPending
            ? "border-red-300 dark:border-red-700"
            : "border-border"
        } ${newAlert ? "am-ring-pulse" : ""}`}
      >
        {/* ── Header button ─────────────────────────────────── */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {/* Icon — shows pulsing red dot when pending */}
            <div className="relative">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: hasPending ? "rgba(239,68,68,0.10)" : "rgba(14,36,92,0.08)" }}
              >
                <UserCheck className={`w-4 h-4 ${hasPending ? "text-red-500" : "text-accent"}`} />
              </div>
              {hasPending && (
                <>
                  {/* outer soft ring */}
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/20 am-dot-pulse" />
                  {/* hard badge */}
                  <span
                    className={`absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-[3px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow ${newAlert ? "am-shake" : ""}`}
                    style={{ boxShadow: "0 1px 5px rgba(239,68,68,0.5)" }}
                  >
                    {actionNeededCount > 99 ? "99+" : actionNeededCount}
                  </span>
                </>
              )}
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <p className={`font-bold text-[13px] leading-tight ${hasPending ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                  Approve Team Members
                </p>
                {hasPending && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 am-dot-pulse" />
                    <span className="text-[8px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Action needed</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {pending.length} pending · {deleteRequests.length} delete requests · {approved.length} approved
              </p>
            </div>
          </div>

          {open
            ? <ChevronUp   className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {/* ── Body ──────────────────────────────────────────── */}
        {open && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {!loading && members.length === 0 && (
              <div className="text-center py-6">
                <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">No team members linked yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Share your Manager ID:{" "}
                  <span className="font-bold text-accent font-mono">{managerProfile.managerId}</span>
                </p>
              </div>
            )}

            {/* Delete Requests */}
            {!loading && deleteRequests.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    Delete Requests ({deleteRequests.length})
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 am-dot-pulse" />
                </div>
                {deleteRequests.map((m) => (
                  <DeleteRequestRow
                    key={m.id}
                    member={m}
                    onConfirmRemove={handleConfirmRemove}
                    removing={removing === m.id}
                  />
                ))}
              </div>
            )}

            {/* Pending Approval */}
            {!loading && pending.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      Pending Approval ({pending.length})
                    </p>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 am-dot-pulse" />
                  </div>
                  {pendingPages > 1 && (
                    <Pager page={pendingPage} total={pendingPages} onChange={setPendingPage} />
                  )}
                </div>
                {pendingSlice.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    onApprove={handleApprove}
                    approving={approving === m.id}
                  />
                ))}
              </div>
            )}

            {/* Approved Members */}
            {!loading && (
              <div>
                <button
                  onClick={openApprovedModal}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-[12px] font-bold text-green-700 dark:text-green-400">
                      Approved Members ({approved.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-green-600 font-medium">View All →</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Approved Members Modal ─────────────────────────── */}
      {showApprovedModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,36,92,0.08)" }}>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Approved Members</p>
                  <p className="text-[10px] text-muted-foreground">{approved.length} members</p>
                </div>
              </div>
              <button onClick={() => setShowApprovedModal(false)} className="p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={approvedSearch}
                  onChange={(e) => setApprovedSearch(e.target.value)}
                  placeholder="Search by name or mobile..."
                  className="flex-1 bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground"
                />
                {approvedSearch && (
                  <button onClick={() => setApprovedSearch("")}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
              {approvedLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
                </div>
              ) : approvedSlice.length === 0 ? (
                <div className="py-8 text-center">
                  <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">
                    {approvedSearch ? "No results found" : "No approved members yet"}
                  </p>
                </div>
              ) : (
                approvedSlice.map((m) => <ApprovedMemberRow key={m.id} member={m} />)
              )}
            </div>

            {approvedTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">
                  {filteredApproved.length} result{filteredApproved.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setApprovedPage((p) => Math.max(1, p - 1))} disabled={approvedPage === 1} className="p-1 rounded-lg disabled:opacity-30 hover:bg-muted/50 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-[11px] text-muted-foreground font-medium min-w-[40px] text-center">
                    {approvedPage} / {approvedTotalPages}
                  </span>
                  <button onClick={() => setApprovedPage((p) => Math.min(approvedTotalPages, p + 1))} disabled={approvedPage === approvedTotalPages} className="p-1 rounded-lg disabled:opacity-30 hover:bg-muted/50 transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function MemberRow({ member, onApprove, approving }) {
  const ts      = member.createdAt?.toDate ? member.createdAt.toDate() : null;
  const dateStr = ts ? ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "";
  return (
    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/10 rounded-xl px-3 py-2.5 border border-amber-200 dark:border-amber-800/50">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{member.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {member.mobile} · <span className="font-mono text-[9px]">{member.memberId}</span>
        </p>
        {dateStr && <p className="text-[9px] text-muted-foreground/70 mt-0.5">Joined {dateStr}</p>}
      </div>
      <button
        onClick={() => onApprove(member)}
        disabled={approving}
        className="shrink-0 ml-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-opacity disabled:opacity-60 flex items-center gap-1"
        style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}
      >
        {approving
          ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
          : <><Clock className="w-3 h-3" /> Approve</>}
      </button>
    </div>
  );
}

function DeleteRequestRow({ member, onConfirmRemove, removing }) {
  const ts      = member.createdAt?.toDate ? member.createdAt.toDate() : null;
  const dateStr = ts ? ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "";
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          <p className="text-[13px] font-semibold text-red-700 dark:text-red-400 leading-tight truncate">{member.name}</p>
        </div>
        <p className="text-[10px] text-red-600/80 dark:text-red-400/70">
          {member.mobile} · <span className="font-mono text-[9px]">{member.memberId}</span>
        </p>
        <p className="text-[9px] text-red-500/70 mt-0.5">Requested deletion</p>
      </div>
      <button
        onClick={() => onConfirmRemove(member)}
        disabled={removing}
        className="shrink-0 ml-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center gap-1"
      >
        {removing
          ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
          : <><Trash2 className="w-3 h-3" /> Confirm Remove</>}
      </button>
    </div>
  );
}

function ApprovedMemberRow({ member }) {
  const ts      = member.createdAt?.toDate ? member.createdAt.toDate() : null;
  const dateStr = ts ? ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "";
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2.5 border border-border/50">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{member.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {member.mobile} · <span className="font-mono text-[9px]">{member.memberId}</span>
        </p>
        {dateStr && <p className="text-[9px] text-muted-foreground/70 mt-0.5">Joined {dateStr}</p>}
      </div>
      <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold shrink-0 ml-2">
        <CheckCircle className="w-3.5 h-3.5" /> Approved
      </span>
    </div>
  );
}

function Pager({ page, total, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-0.5 rounded-lg disabled:opacity-30 hover:bg-muted/50 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <span className="text-[10px] text-muted-foreground font-medium">{page}/{total}</span>
      <button onClick={() => onChange((p) => Math.min(total, p + 1))} disabled={page === total} className="p-0.5 rounded-lg disabled:opacity-30 hover:bg-muted/50 transition-colors">
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
