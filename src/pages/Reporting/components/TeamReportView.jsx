import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { FileText, Eye, Download, Search, X, ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { toast } from "@heroui/react";
import { viewPDF, downloadPDF } from "../utils/pdfGenerator";
import { COLLECTIONS as GLOBAL_COLLECTIONS } from "../../../collections";

const DAYS    = ["THURSDAY","FRIDAY","SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY"];
const DAY_JS  = [4,5,6,0,1,2,3];
const WORK_COLS = {
  plan:   GLOBAL_COLLECTIONS.REPORTPLAN,
  follow: GLOBAL_COLLECTIONS.REPORTFOLLOWUP,
  kit:    GLOBAL_COLLECTIONS.REPORTKITBOOK,
  sp:     GLOBAL_COLLECTIONS.REPORTSP,
  nac:    GLOBAL_COLLECTIONS.REPORTNAC,
};
const PICKER_PAGE_SIZE = 8;

function parseDate(str)    { if (!str) return null; const [y,m,d]=str.split("-"); return new Date(+y,+m-1,+d,0,0,0,0); }
function parseDateEnd(str) { if (!str) return null; const [y,m,d]=str.split("-"); return new Date(+y,+m-1,+d,23,59,59,999); }
function todayStr()        { return new Date().toISOString().slice(0,10); }
function sevenAgoStr()     { const d=new Date(); d.setDate(d.getDate()-6); return d.toISOString().slice(0,10); }
function getMid(m)         { return m.profileId || m.memberId || m.id || ""; }

/* ─── Searchable Member Picker Modal ─────────────────────────── */
function MemberPickerModal({ members, loading, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name?.toLowerCase().includes(q) || getMid(m).toLowerCase().includes(q)
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PICKER_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * PICKER_PAGE_SIZE, (safePage + 1) * PICKER_PAGE_SIZE);

  const handleSearch = (v) => { setSearch(v); setPage(0); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60">
          <div>
            <p className="font-bold text-foreground text-[14px]">Select Member</p>
            <p className="text-[10px] text-muted-foreground">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or ID…"
              className="flex-1 bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => handleSearch("")}>
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="px-3 pb-2 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[12px]">{search ? "No members match your search" : "No team members yet"}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pageItems?.map((m) => {
                const mid = getMid(m);
                return (
                  <button key={m.id || mid}
                    onClick={() => onSelect(m)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/8 bg-card  text-left group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                      {m.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{m.name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{mid}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-40 hover:bg-muted/50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-[11px] text-muted-foreground">
              {safePage + 1} / {totalPages}
              <span className="ml-1 text-[10px] opacity-60">({filtered.length} result{filtered.length !== 1 ? "s" : ""})</span>
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-40 hover:bg-muted/50 transition-colors">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function TeamReportView({ managerProfile }) {
  const [approvedMembers,  setApprovedMembers]  = useState([]);
  const [membersLoading,   setMembersLoading]   = useState(true);
  const [selectedMember,   setSelectedMember]   = useState(null);
  const [pickerOpen,       setPickerOpen]       = useState(false);
  const [dateFrom,         setDateFrom]         = useState(sevenAgoStr);
  const [dateTo,           setDateTo]           = useState(todayStr);
  const [reportData,       setReportData]       = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [showReport,       setShowReport]       = useState(false);
  const [pdfModal,         setPdfModal]         = useState(false);

  /* Fetch team members once */
  useEffect(() => {
    if (!managerProfile?.managerId) return;
    setMembersLoading(true);
    getDocs(query(
      collection(db, GLOBAL_COLLECTIONS.REPORTINGUSER),
      where("managerId", "==", managerProfile.managerId)
    ))
      .then((snap) => setApprovedMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setMembersLoading(false));
  }, [managerProfile?.managerId]);

  const handleSelectMember = (m) => {
    setSelectedMember(m);
    setPickerOpen(false);
    setShowReport(false);
    setReportData(null);
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setShowReport(false);
    setReportData(null);
  };

  const handleGenerate = async () => {
    if (!selectedMember)         { toast.warning("Select a member first"); return; }
    if (!dateFrom || !dateTo)    { toast.warning("Select a date range");   return; }
    const start = parseDate(dateFrom);
    const end   = parseDateEnd(dateTo);
    if (!start || !end || start > end) { toast.warning("Invalid date range"); return; }

    const mid = getMid(selectedMember);
    setLoading(true);
    try {
      const dayData = Array(7).fill(null).map(() => ({
        plan:0, follow:0, kit:0, sp:0, nac:0, nextDays:[],
        planItems:[], followItems:[], kitItems:[], spItems:[], nacItems:[],
      }));

      await Promise.all(Object.entries(WORK_COLS).map(async ([key, col]) => {
        const snap = await getDocs(query(collection(db, col), where("memberId", "==", mid)));
        snap.docs.forEach((d) => {
          const raw = d.data().date;
          const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (!dt || dt < start || dt > end) return;
          const slot = DAY_JS.indexOf(dt.getDay());
          if (slot >= 0) {
            dayData[slot][key]++;
            dayData[slot][`${key}Items`].push({ id: d.id, ...d.data() });
          }
        });
      }));

      const nextSnap = await getDocs(
        query(collection(db, GLOBAL_COLLECTIONS.REPORTNEXTDAY), where("memberId", "==", mid))
      );
      nextSnap.docs.forEach((d) => {
        const raw = d.data().date;
        const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
        if (!dt || dt < start || dt > end) return;
        const slot = DAY_JS.indexOf(dt.getDay());
        if (slot >= 0 && dayData[slot].nextDays.length < 4) {
          dayData[slot].nextDays.push({ name: d.data().name, mobile: d.data().mobile, address: d.data().address });
        }
      });

      setReportData({ member: selectedMember, dayData, dateFrom, dateTo });
      setShowReport(true);
    } catch (e) {
      
      toast.danger("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const totals = reportData?.dayData?.reduce(
    (acc, d) => ({ plan: acc.plan+d.plan, follow: acc.follow+d.follow, kit: acc.kit+d.kit, sp: acc.sp+d.sp, nac: acc.nac+d.nac }),
    { plan:0, follow:0, kit:0, sp:0, nac:0 }
  );

  const handleView     = () => { viewPDF({ memberProfile: reportData.member, dateFrom: reportData.dateFrom, dateTo: reportData.dateTo, dayData: reportData.dayData }); setPdfModal(false); };
  const handleDownload = () => { downloadPDF({ memberProfile: reportData.member, dateFrom: reportData.dateFrom, dateTo: reportData.dateTo, dayData: reportData.dayData }); toast.success("PDF downloaded!"); setPdfModal(false); };

  return (
    <>
      {/* Member Picker Modal */}
      {pickerOpen && (
        <MemberPickerModal
          members={approvedMembers}
          loading={membersLoading}
          onSelect={handleSelectMember}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* PDF Modal */}
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
              <p className="font-bold text-foreground text-[16px]">Weekly Report PDF</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {reportData?.member?.name} · {reportData?.dateFrom} → {reportData?.dateTo}
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
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border/50">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-foreground text-[13px] leading-tight">Generate Team Report</p>
            <p className="text-[10px] text-muted-foreground">Weekly reporting sheet per approved member</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Member picker button */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1.5">
              Select Member {membersLoading && <span className="opacity-50">(loading…)</span>}
            </label>
            {selectedMember ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-accent/40 bg-accent/5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                  {selectedMember.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">{selectedMember.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{getMid(selectedMember)}</p>
                </div>
                <button onClick={handleClearMember}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors shrink-0">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button onClick={() => setPickerOpen(true)} disabled={membersLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors disabled:opacity-50 text-left">
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-muted-foreground">
                    {membersLoading ? "Loading members…" : approvedMembers.length === 0 ? "No team members yet" : "Tap to search & select member"}
                  </p>
                </div>
                {!membersLoading && approvedMembers.length > 0 && (
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Date From</label>
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setShowReport(false); }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Date To</label>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setShowReport(false); }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !selectedMember}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><Search className="w-4 h-4" /> Generate Report</>}
          </button>
        </div>

        {/* Report */}
        {showReport && reportData && (
          <div className="border-t border-border/50">
            <div className="px-4 py-3 bg-muted/20 border-b border-border/30 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-[13px] text-foreground truncate">{reportData.member.name}</p>
                <p className="text-[10px] text-muted-foreground">{reportData.dateFrom} → {reportData.dateTo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setPdfModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-bold"
                  style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => setShowReport(false)}
                  className="p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-5 gap-2 px-4 pt-3 pb-2">
              {[
                { label:"Plans",  value:totals?.plan   ?? 0, color:"#0088DA" },
                { label:"Follow", value:totals?.follow ?? 0, color:"#1a6fbf" },
                { label:"Kit",    value:totals?.kit    ?? 0, color:"#2196f3" },
                { label:"SP",     value:totals?.sp     ?? 0, color:"#43a047" },
                { label:"NAC",    value:totals?.nac    ?? 0, color:"#ff7043" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border p-2 text-center">
                  <p className="text-[17px] font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly table */}
            <div className="overflow-x-auto pb-4 px-2">
              <table className="w-full text-[10px] border-collapse min-w-[680px]">
                <thead>
                  <tr style={{ background:"#0088DA", color:"white" }}>
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
                  <tr style={{ background:"#0088DA", color:"white" }}>
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
                    const nd   = d.nextDays || [];
                    const bg   = i % 2 === 0 ? "" : "bg-blue-50/40 dark:bg-blue-950/10";
                    const gND  = (idx, f) => nd[idx]?.[f] || "";
                    return (
                      <>
                        <tr key={`${i}-t`} className={bg}>
                          <td className="px-2 py-1 text-center border border-border font-bold" rowSpan={3}>{i+1}</td>
                          <td className="px-2 py-1 text-left border border-border font-semibold text-[8.5px] leading-tight" rowSpan={3}>{DAYS[i]}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.plan  || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.follow|| ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.kit   || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.sp    || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.nac   || ""}</td>
                          <td className="px-1 py-1 border border-border" rowSpan={3} />
                          <td className="px-1 py-1 border border-border" rowSpan={3} />
                          <NDCell value={gND(0,"mobile")} /><NDCell value={gND(1,"mobile")} /><NDCell value={gND(2,"mobile")} /><NDCell value={gND(3,"mobile")} />
                        </tr>
                        <tr key={`${i}-n`} className={bg}>
                          <NDCell value={gND(0,"name")} bold /><NDCell value={gND(1,"name")} bold /><NDCell value={gND(2,"name")} bold /><NDCell value={gND(3,"name")} bold />
                        </tr>
                        <tr key={`${i}-p`} className={bg}>
                          <NDCell value={gND(0,"address")} muted /><NDCell value={gND(1,"address")} muted /><NDCell value={gND(2,"address")} muted /><NDCell value={gND(3,"address")} muted />
                        </tr>
                      </>
                    );
                  })}
                  <tr style={{ background: "var(--surface-secondary)" }}>
                    <td className="px-2 py-2 border border-border" />
                    <td className="px-2 py-2 border border-border font-bold text-[10px] text-left">TOTAL</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.plan   || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.follow || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.kit    || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.sp     || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.nac    || 0}</td>
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
