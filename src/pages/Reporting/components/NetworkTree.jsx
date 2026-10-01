import { useState, useEffect } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Users, ChevronDown, ChevronRight, User,
  FileText, Eye, Download, X, Calendar, Loader2,
} from "lucide-react";
import { COLLECTIONS } from "../../../collections";
import { viewPDF, downloadPDF } from "../utils/pdfGenerator";
import { toast } from "@heroui/react";

const DAYS   = ["THURSDAY","FRIDAY","SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY"];
const DAY_JS = [4,5,6,0,1,2,3];
const WORK_COLS = {
  plan:   COLLECTIONS.REPORTPLAN,
  follow: COLLECTIONS.REPORTFOLLOWUP,
  kit:    COLLECTIONS.REPORTKITBOOK,
  sp:     COLLECTIONS.REPORTSP,
  nac:    COLLECTIONS.REPORTNAC,
};

function parseDate(str)    { if(!str) return null; const [y,m,d]=str.split("-"); return new Date(+y,+m-1,+d,0,0,0,0); }
function parseDateEnd(str) { if(!str) return null; const [y,m,d]=str.split("-"); return new Date(+y,+m-1,+d,23,59,59,999); }

async function fetchChildren(profileId, depth = 0, maxDepth = 4) {
  if (depth >= maxDepth) return [];
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", profileId))
    );
    const children = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const childrenWithKids = await Promise.all(
      children.map(async (child) => ({
        ...child,
        children: await fetchChildren(child.profileId || child.managerId, depth + 1, maxDepth),
      }))
    );
    return childrenWithKids;
  } catch {
    return [];
  }
}

function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function NodeReportModal({ node, onClose }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportPayload, setReportPayload] = useState(null);

  const memberId = node.profileId || node.memberId || node.id;

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) { toast.danger("Select date range"); return; }
    const start = parseDate(dateFrom);
    const end   = parseDateEnd(dateTo);
    if (!start || !end || start > end) { toast.danger("Invalid date range"); return; }

    setGenerating(true);
    setReportReady(false);
    try {
      const dayData = Array(7).fill(null).map(() => ({
        plan: 0, follow: 0, kit: 0, sp: 0, nac: 0, nextDays: [],
      }));

      await Promise.all(Object.entries(WORK_COLS).map(async ([key, col]) => {
        const snap = await getDocs(
          query(collection(db, col), where("memberId", "==", memberId))
        );
        snap.docs.forEach((d) => {
          const raw = d.data().date;
          const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (!dt || dt < start || dt > end) return;
          const slotIdx = DAY_JS.indexOf(dt.getDay());
          if (slotIdx >= 0) dayData[slotIdx][key]++;
        });
      }));

      const nextSnap = await getDocs(
        query(collection(db, COLLECTIONS.REPORTNEXTDAY), where("memberId", "==", memberId))
      );
      nextSnap.docs.forEach((d) => {
        const raw = d.data().date;
        const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
        if (!dt || dt < start || dt > end) return;
        const slotIdx = DAY_JS.indexOf(dt.getDay());
        if (slotIdx >= 0 && dayData[slotIdx].nextDays.length < 4) {
          dayData[slotIdx].nextDays.push({
            name: d.data().name,
            mobile: d.data().mobile,
            address: d.data().address,
          });
        }
      });

      const memberProfile = { ...node, memberId };
      setReportPayload({ memberProfile, dateFrom, dateTo, dayData });
      setReportReady(true);
    } catch (e) {
      
      toast.danger("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const totals = reportPayload?.dayData?.reduce(
    (a, d) => ({ plan: a.plan+d.plan, follow: a.follow+d.follow, kit: a.kit+d.kit, sp: a.sp+d.sp, nac: a.nac+d.nac }),
    { plan: 0, follow: 0, kit: 0, sp: 0, nac: 0 }
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-card dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card dark:bg-gray-900 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              {node.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-bold text-foreground text-[14px] leading-tight">{node.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">ID: {memberId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Select Date Range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setReportReady(false); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setReportReady(false); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !dateFrom || !dateTo}
            className="w-full py-3 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-4 h-4" /> Generate Report</>
            )}
          </button>

          {reportReady && reportPayload && (
            <>
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Summary</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: "Plan",   value: totals?.plan   ?? 0, color: "#0088DA" },
                    { label: "Follow", value: totals?.follow ?? 0, color: "#1a6fbf" },
                    { label: "Kit",    value: totals?.kit    ?? 0, color: "#2196f3" },
                    { label: "SP",     value: totals?.sp     ?? 0, color: "#43a047" },
                    { label: "NAC",    value: totals?.nac    ?? 0, color: "#ff7043" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-card dark:bg-gray-800 p-2 text-center">
                      <p className="text-[18px] font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[8px] text-muted-foreground leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground text-center">
                  {dateFrom} → {dateTo}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    try { viewPDF(reportPayload); }
                    catch { toast.danger("Could not open PDF"); }
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-accent text-accent font-bold text-[13px] hover:bg-accent/5 transition-colors"
                >
                  <Eye className="w-4 h-4" /> View PDF
                </button>
                <button
                  onClick={() => {
                    try {
                      downloadPDF(reportPayload);
                      toast.success("PDF downloaded!");
                    } catch {
                      toast.danger("Download failed");
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px]"
                  style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth = 0, isRoot = false, onReportClick }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const totalBelow  = countDescendants(node);

  const colors = [
    "bg-blue-500","bg-purple-500","bg-green-500",
    "bg-orange-500","bg-pink-500","bg-teal-500",
  ];
  const avatarColor = colors[depth % colors.length];

  const handleRowClick = () => {
    if (hasChildren) setExpanded((e) => !e);
  };

  return (
    <div className={`${depth > 0 ? "ml-4 border-l-2 border-border/40 pl-3" : ""}`}>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
        isRoot ? "bg-accent/10 border border-accent/20" : "hover:bg-muted/40"
      }`}>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${avatarColor} cursor-pointer`}
          onClick={handleRowClick}
        >
          {node.name?.[0]?.toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleRowClick}>
          <p className={`text-[12px] font-bold truncate ${isRoot ? "text-accent" : "text-foreground"}`}>
            {node.name} {isRoot && <span className="text-[9px] font-normal opacity-60">(You)</span>}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono">
            ID: {node.profileId || node.managerId || "—"}
            {totalBelow > 0 && ` · ${totalBelow} below`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isRoot && (
            <button
              onClick={() => onReportClick(node)}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-bold text-white transition-opacity"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}
              title="View / Download Report"
            >
              <FileText className="w-3 h-3" />
              <span>PDF</span>
            </button>
          )}
          {hasChildren ? (
            <button onClick={handleRowClick} className="p-0.5 text-muted-foreground">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onReportClick={onReportClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkTree({ profile }) {
  const [loading,     setLoading]     = useState(true);
  const [tree,        setTree]        = useState(null);
  const [showTree,    setShowTree]    = useState(false);
  const [reportNode,  setReportNode]  = useState(null);
  const [directCount, setDirectCount] = useState(null);

  const myId = profile.profileId || profile.managerId;

  useEffect(() => {
    if (!showTree) return;
    setLoading(true);
    fetchChildren(myId).then((children) => {
      setTree({ ...profile, children });
      setLoading(false);
    });
  }, [showTree, myId]);

  useEffect(() => {
    if (!myId) return;
    getDocs(query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", myId)))
      .then((snap) => setDirectCount(snap.size))
      .catch(() => setDirectCount(0));
  }, [myId]);

  return (
    <>
      {reportNode && (
        <NodeReportModal node={reportNode} onClose={() => setReportNode(null)} />
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setShowTree((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground text-[13px] leading-tight">My Network Tree</p>
              <p className="text-[10px] text-muted-foreground">
                {directCount !== null
                  ? `${directCount} direct member${directCount !== 1 ? "s" : ""} · tap PDF to get report`
                  : "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {directCount !== null && directCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                {directCount}
              </span>
            )}
            {showTree
              ? <ChevronDown  className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {showTree && (
          <div className="border-t border-border/50 px-3 py-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-muted-foreground">
                <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                Building tree...
              </div>
            ) : !tree ? (
              <div className="text-center py-6">
                <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">No team members yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <TreeNode
                  node={tree}
                  depth={0}
                  isRoot={true}
                  onReportClick={(n) => setReportNode(n)}
                />
                {tree.children?.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-[11px] text-muted-foreground">
                      No one has linked you as their manager yet.
                      <br />Share your ID:{" "}
                      <span className="font-mono font-bold text-accent">
                        {profile.profileId || profile.managerId}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
