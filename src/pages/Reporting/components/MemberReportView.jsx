import { useState } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { FileText, Eye, Download, Search, X } from "lucide-react";

import {toast} from "@heroui/react"
import { viewPDF, downloadPDF } from "../utils/pdfGenerator";
import { COLLECTIONS as GLOBAL_COLLECTIONS } from "../../../collections";

const DAYS = ["THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"];
const DAY_JS = [4, 5, 6, 0, 1, 2, 3];
const WORK_COLS = { plan: GLOBAL_COLLECTIONS.REPORTPLAN, follow: GLOBAL_COLLECTIONS.REPORTFOLLOWUP, kit: GLOBAL_COLLECTIONS.REPORTKITBOOK, sp: GLOBAL_COLLECTIONS.REPORTSP, nac: GLOBAL_COLLECTIONS.REPORTNAC };

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
}
function parseDateEnd(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function sevenAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

export default function MemberReportView({ memberProfile }) {
  const [dateFrom, setDateFrom] = useState(sevenAgoStr);
  const [dateTo, setDateTo]     = useState(todayStr);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [pdfModal, setPdfModal] = useState(false);

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) { toast.danger("Select a date range"); return; }
    const start = parseDate(dateFrom);
    const end   = parseDateEnd(dateTo);
    if (!start || !end || start > end) { toast.danger("Invalid date range"); return; }

    setLoading(true);
    try {
      const dayData = Array(7).fill(null).map(() => ({
        plan: 0, follow: 0, kit: 0, sp: 0, nac: 0, nextDays: [],
        planItems: [], followItems: [], kitItems: [], spItems: [], nacItems: [],
      }));

      await Promise.all(Object.entries(WORK_COLS).map(async ([key, col]) => {
        // Single-field query — no composite index needed
        const snap = await getDocs(
          query(collection(db, col), where("memberId", "==", memberProfile.memberId))
        );
        snap.docs.forEach((d) => {
          const raw = d.data().date;
          const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (!dt || dt < start || dt > end) return;
          const slotIdx = DAY_JS.indexOf(dt.getDay());
          if (slotIdx >= 0) {
            dayData[slotIdx][key]++;
            dayData[slotIdx][`${key}Items`].push({ id: d.id, ...d.data() });
          }
        });
      }));

      const nextSnap = await getDocs(
        query(collection(db, GLOBAL_COLLECTIONS.REPORTNEXTDAY), where("memberId", "==", memberProfile.memberId))
      );
      nextSnap.docs.forEach((d) => {
        const raw = d.data().date;
        const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
        if (!dt || dt < start || dt > end) return;
        const slotIdx = DAY_JS.indexOf(dt.getDay());
        if (slotIdx >= 0 && dayData[slotIdx].nextDays.length < 4) {
          dayData[slotIdx].nextDays.push({ name: d.data().name, mobile: d.data().mobile, address: d.data().address });
        }
      });

      setReportData({ dayData, dateFrom, dateTo });
      setShowReport(true);
    } catch (e) {
      
      toast.danger("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleView = () => {
    viewPDF({ memberProfile, dateFrom: reportData.dateFrom, dateTo: reportData.dateTo, dayData: reportData.dayData });
    setPdfModal(false);
  };

  const handleDownload = () => {
    downloadPDF({ memberProfile, dateFrom: reportData.dateFrom, dateTo: reportData.dateTo, dayData: reportData.dayData });
    toast.success("PDF downloaded!");
    setPdfModal(false);
  };

  const totals = reportData?.dayData?.reduce(
    (acc, d) => ({ plan: acc.plan + d.plan, follow: acc.follow + d.follow, kit: acc.kit + d.kit, sp: acc.sp + d.sp, nac: acc.nac + d.nac }),
    { plan: 0, follow: 0, kit: 0, sp: 0, nac: 0 }
  );

  return (
    <>
      {/* PDF Modal */}
      {pdfModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setPdfModal(false)}>
          <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xs p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
                <FileText className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-foreground text-[16px]">My Weekly Report PDF</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {reportData?.dateFrom} → {reportData?.dateTo}
              </p>
            </div>
            <div className="space-y-2">
              <button onClick={handleView}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-accent text-accent font-bold text-[14px] hover:bg-accent/5 transition-colors">
                <Eye className="w-4 h-4" /> View PDF
              </button>
              <button onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <button onClick={() => setPdfModal(false)}
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border/50">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(14,36,92,0.08)" }}>
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="font-bold text-foreground text-[13px] leading-tight">View My Report</p>
            <p className="text-[10px] text-muted-foreground">Your weekly activity sheet with PDF export</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Date From</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setShowReport(false); }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Date To</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setShowReport(false); }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><Search className="w-4 h-4" /> Generate My Report</>}
          </button>
        </div>

        {showReport && reportData && (
          <div className="border-t border-border/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
              <div>
                <p className="font-bold text-[13px] text-foreground">{memberProfile.name}</p>
                <p className="text-[10px] text-muted-foreground">{reportData.dateFrom} → {reportData.dateTo}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPdfModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-bold"
                  style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => setShowReport(false)}
                  className="p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Member info pills */}
            <div className="grid grid-cols-3 gap-2 px-4 pt-3 pb-1 text-[11px]">
              <InfoPill label="ID" value={memberProfile.memberId} />
              <InfoPill label="Mobile" value={memberProfile.mobile} />
              <InfoPill label="Manager ID" value={memberProfile.managerId} />
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-5 gap-2 px-4 pt-2 pb-3">
              {[
                { label: "Plans",  value: totals?.plan   ?? 0, color: "#0088DA" },
                { label: "Follow", value: totals?.follow ?? 0, color: "#1a6fbf" },
                { label: "Kit",    value: totals?.kit    ?? 0, color: "#2196f3" },
                { label: "SP",     value: totals?.sp     ?? 0, color: "#43a047" },
                { label: "NAC",    value: totals?.nac    ?? 0, color: "#ff7043" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border p-2 text-center">
                  <p className="text-[17px] font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly table with TIME / NAME / PLACE sub-rows */}
            <div className="overflow-x-auto pb-4 px-2">
              <table className="w-full text-[10px] border-collapse min-w-[680px]">
                <thead>
                  <tr style={{ background: "#0088DA", color: "white" }}>
                    <th className="px-2 py-1.5 border border-blue-800 w-7" rowSpan={2}>S.NO</th>
                    <th className="px-2 py-1.5 text-left border border-blue-800 w-22" rowSpan={2}>DAYS</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>PLAN</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>FOLLOW</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>KIT</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>SP</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>NAC</th>
                    <th className="px-2 py-1.5 border border-blue-800 text-center" colSpan={2}>BONANZA</th>
                    <th className="px-2 py-1.5 border border-blue-800 text-center" colSpan={4}>NEXT DAY PLANNING</th>
                  </tr>
                  <tr style={{ background: "#0088DA", color: "white" }}>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">LEFT</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">RIGHT</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">FIRST</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">SECOND</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">THIRD</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">FOURTH</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.dayData.map((d, i) => {
                    const nd  = d.nextDays || [];
                    const bg  = i % 2 === 0 ? "" : "bg-blue-50/40 dark:bg-blue-950/10";
                    const getND = (idx, f) => nd[idx]?.[f] || "";
                    return (
                      <>
                        {/* Row 1 — TIME (mobile) */}
                        <tr key={`${i}-t`} className={bg}>
                          <td className="px-2 py-1 text-center border border-border font-bold" rowSpan={3}>{i + 1}</td>
                          <td className="px-2 py-1 text-left border border-border font-semibold text-[8.5px] leading-tight" rowSpan={3}>{DAYS[i]}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>
                            <PopoverCount value={d.plan} items={d.planItems} label={(it) => it.name} />
                          </td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>
                            <PopoverCount value={d.follow} items={d.followItems} label={(it) => it.name} />
                          </td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>
                            <PopoverCount value={d.kit} items={d.kitItems} label={(it) => `${it.name} ₹${it.amount}`} />
                          </td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>
                            <PopoverCount value={d.sp} items={d.spItems} label={(it) => `${it.name} SP:${it.sp}`} />
                          </td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>
                            <PopoverCount value={d.nac} items={d.nacItems} label={(it) => it.name} />
                          </td>
                          <td className="px-1 py-1 border border-border" rowSpan={3} />
                          <td className="px-1 py-1 border border-border" rowSpan={3} />
                          <NDCell value={getND(0, "mobile")} />
                          <NDCell value={getND(1, "mobile")} />
                          <NDCell value={getND(2, "mobile")} />
                          <NDCell value={getND(3, "mobile")} />
                        </tr>
                        {/* Row 2 — NAME */}
                        <tr key={`${i}-n`} className={bg}>
                          <NDCell value={getND(0, "name")} bold />
                          <NDCell value={getND(1, "name")} bold />
                          <NDCell value={getND(2, "name")} bold />
                          <NDCell value={getND(3, "name")} bold />
                        </tr>
                        {/* Row 3 — PLACE (address) */}
                        <tr key={`${i}-p`} className={bg}>
                          <NDCell value={getND(0, "address")} muted />
                          <NDCell value={getND(1, "address")} muted />
                          <NDCell value={getND(2, "address")} muted />
                          <NDCell value={getND(3, "address")} muted />
                        </tr>
                      </>
                    );
                  })}
                  <tr style={{ background: "var(--surface-secondary)" }}>
                    <td className="px-2 py-2 border border-border" />
                    <td className="px-2 py-2 border border-border font-bold text-[10px] text-left">TOTAL</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.plan || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.follow || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.kit || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.sp || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.nac || 0}</td>
                    <td className="border border-border" colSpan={6} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function NDCell({ value, bold, muted }) {
  return (
    <td className={`px-1.5 py-1 border border-border text-[8px] max-w-[60px] truncate
      ${bold ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : "text-foreground/80"}`}>
      {value}
    </td>
  );
}

function PopoverCount({ value, items = [], label }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)}
        className="font-bold text-accent hover:underline underline-offset-2">
        {value}
      </button>
      {open && (
        <div className="absolute z-30 left-1/2 -translate-x-1/2 top-5 bg-card border border-border rounded-xl shadow-2xl p-2 min-w-[150px] max-w-[200px] text-left space-y-1"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Details</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground text-[10px] hover:text-foreground">✕</button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="text-[9px] text-foreground bg-muted/30 rounded-lg px-2 py-1 truncate">
              {label(it)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="bg-muted/40 rounded-lg px-2 py-1.5">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-[11px] font-semibold text-foreground truncate">{value || "—"}</p>
    </div>
  );
}
