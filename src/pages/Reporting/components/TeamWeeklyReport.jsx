import { useState, useCallback } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Users, Calendar, Loader2, RefreshCw,
  FileText, Eye, Download, Search, X,
} from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../../collections";
import { viewTeamWeeklyPDF, downloadTeamWeeklyPDF } from "../utils/teamWeeklyPdfGenerator";

const WORK_COLS = {
  plan:   COLLECTIONS.REPORTPLAN    || "reportplan",
  follow: COLLECTIONS.REPORTFOLLOWUP || "reportfollowup",
  kit:    COLLECTIONS.REPORTKITBOOK  || "reportkitbook",
  sp:     COLLECTIONS.REPORTSP       || "reportsp",
  nac:    COLLECTIONS.REPORTNAC      || "reportnac",
};

function todayStr()    { return new Date().toISOString().slice(0, 10); }
function sevenAgoStr() { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }

function normDate(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return raw.slice(0, 10);
  if (raw?.toDate) return raw.toDate().toISOString().slice(0, 10);
  return new Date(raw).toISOString().slice(0, 10);
}

function getMemberId(m) {
  return m.profileId || m.memberId || m.id || "";
}

export default function TeamWeeklyReport({ managerProfile }) {
  const managerId   = managerProfile?.managerId || managerProfile?.profileId || managerProfile?.id || "";
  const managerName = managerProfile?.name || "";

  const [dateFrom, setDateFrom] = useState(sevenAgoStr());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [rows,     setRows]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [pdfModal, setPdfModal] = useState(false);
  const [search,   setSearch]   = useState("");

  const load = useCallback(async () => {
    if (!managerId) { toast.danger("Manager profile not found"); return; }
    if (!dateFrom || !dateTo) { toast.warning("Select a date range"); return; }
    if (dateFrom > dateTo)    { toast.warning("From date must be before To date"); return; }

    setLoading(true);
    try {
      /* 1 — Fetch team members */
      const memberSnap = await getDocs(
        query(collection(db, COLLECTIONS.REPORTINGUSER), where("managerId", "==", managerId))
      );
      const members = memberSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (members.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      /* 2 — For each member, count entries in each work collection */
      const result = await Promise.all(
        members.map(async (m) => {
          const mid = getMemberId(m);
          if (!mid) return { name: m.name || "—", plan: 0, follow: 0, kit: 0, sp: 0, nac: 0 };

          const counts = await Promise.all(
            Object.entries(WORK_COLS).map(async ([key, col]) => {
              try {
                const snap = await getDocs(
                  query(collection(db, col), where("memberId", "==", mid))
                );
                const cnt = snap.docs.filter((d) => {
                  const ds = normDate(d.data().date);
                  return ds && ds >= dateFrom && ds <= dateTo;
                }).length;
                return [key, cnt];
              } catch {
                return [key, 0];
              }
            })
          );

          const c = Object.fromEntries(counts);
          return { name: m.name || mid, plan: c.plan, follow: c.follow, kit: c.kit, sp: c.sp, nac: c.nac };
        })
      );

      result.sort((a, b) => a.name.localeCompare(b.name));
      setRows(result);
    } catch (e) {
      
      toast.danger("Failed to load team report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [managerId, dateFrom, dateTo]);

  const filtered = rows
    ? rows.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const totals = filtered
    ? filtered.reduce(
        (acc, r) => ({
          plan:   acc.plan   + (Number(r.plan)   || 0),
          follow: acc.follow + (Number(r.follow) || 0),
          kit:    acc.kit    + (Number(r.kit)    || 0),
          sp:     acc.sp     + (Number(r.sp)     || 0),
          nac:    acc.nac    + (Number(r.nac)    || 0),
        }),
        { plan: 0, follow: 0, kit: 0, sp: 0, nac: 0 }
      )
    : null;

  const pdfOpts = { managerName, dateFrom, dateTo, rows: filtered || [] };
  const handleView     = () => { viewTeamWeeklyPDF(pdfOpts);  setPdfModal(false); };
  const handleDownload = () => { downloadTeamWeeklyPDF(pdfOpts); toast.success("PDF downloaded!"); setPdfModal(false); };

  return (
    <>
      {/* PDF modal */}
      {pdfModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setPdfModal(false)}>
          <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xs p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                <FileText className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-foreground text-[16px]">Team Weekly Report</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {dateFrom} → {dateTo} · {filtered?.length || 0} member{(filtered?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-2">
              <button onClick={handleView}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-accent text-accent font-bold text-[14px] hover:bg-accent/5 transition-colors">
                <Eye className="w-4 h-4" /> View PDF
              </button>
              <button onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <button onClick={() => setPdfModal(false)}
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#0088DA,#4f6fcf)" }} />
          <div className="px-4 py-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[13px] leading-tight">Team Weekly Report</p>
              <p className="text-[10px] text-muted-foreground">Total Plan · Follow · Kit · SP · NAC per member</p>
            </div>
          </div>
        </div>

        {/* Date range picker */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Date Range</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">From</label>
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setRows(null); }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">To</label>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setRows(null); }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
              : <><RefreshCw className="w-4 h-4" /> {rows === null ? "Generate Report" : "Refresh"}</>}
          </button>
        </div>

        {/* Results table */}
        {rows !== null && !loading && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Search row + PDF button */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${rows.length} member${rows.length !== 1 ? "s" : ""}…`}
                  className="flex-1 bg-transparent text-[12px] outline-none text-foreground placeholder:text-muted-foreground" />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              {(filtered?.length || 0) > 0 && (
                <button onClick={() => setPdfModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[11px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              )}
            </div>

            {/* Empty state */}
            {(filtered?.length || 0) === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Users className="w-7 h-7 text-muted-foreground opacity-40" />
                </div>
                <p className="text-[14px] font-bold text-foreground">
                  {search ? "No members match your search" : "No team members found"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {search ? "Try a different search term" : "Add team members from the dashboard"}
                </p>
              </div>
            )}

            {/* Table — matches spreadsheet format */}
            {(filtered?.length || 0) > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse min-w-[480px]">
                  <thead>
                    <tr style={{ background: "#0088DA", color: "#fff" }}>
                      <th className="px-2 py-2.5 border border-gray-300 text-center font-bold w-10">SR.NO</th>
                      <th className="px-2 py-2.5 border border-gray-300 text-left font-bold">NAME</th>
                      <th className="px-2 py-2.5 border border-gray-300 text-center font-bold">PLAN</th>
                      <th className="px-2 py-2.5 border border-gray-300 text-center font-bold">FOLLOW</th>
                      <th className="px-2 py-2.5 border border-gray-300 text-center font-bold">KIT</th>
                      <th className="px-2 py-2.5 border border-gray-300 text-center font-bold">SP</th>
                      <th className="px-2 py-2.5 border border-gray-300 text-center font-bold">NAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="bg-card dark:bg-gray-900 hover:bg-green-50/30 dark:hover:bg-green-950/10 transition-colors">
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center font-bold text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-left font-semibold text-foreground">{r.name || "—"}</td>
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center text-foreground">{r.plan ?? 0}</td>
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center text-foreground">{r.follow ?? 0}</td>
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center text-foreground">{r.kit ?? 0}</td>
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center text-foreground">{r.sp ?? 0}</td>
                        <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center text-foreground">{r.nac ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#0088DA" }}>
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-center font-bold text-black dark:text-white" />
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-left font-bold text-black dark:text-white">TOTAL</td>
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-center font-bold text-black dark:text-white">{totals.plan}</td>
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-center font-bold text-black dark:text-white">{totals.follow}</td>
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-center font-bold text-black dark:text-white">{totals.kit}</td>
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-center font-bold text-black dark:text-white">{totals.sp}</td>
                      <td className="px-2 py-2.5 border border-gray-300 dark:border-gray-700 text-center font-bold text-black dark:text-white">{totals.nac}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Bottom PDF buttons */}
                <div className="flex gap-2 p-3 border-t border-border/50 bg-muted/20">
                  <button onClick={handleView}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-accent text-accent font-bold text-[12px] hover:bg-accent/5 transition-colors">
                    <Eye className="w-4 h-4" /> View PDF
                  </button>
                  <button onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-bold text-[12px]"
                    style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
