import { useState, useCallback } from "react";
import { db } from "../../../Firebase";
import {
  collection, query, where, getDocs,
  doc, updateDoc, deleteDoc,
} from "firebase/firestore";
import {
  Users, Search, Download, Eye, FileText, X,
  Calendar, Loader2, RefreshCw, Pencil, Trash2,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../../collections";
import { viewGuestPDF, downloadGuestPDF } from "../utils/guestPdfGenerator";

function todayStr()    { return new Date().toISOString().slice(0, 10); }
function sevenAgoStr() { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }

/* ── Edit modal ─────────────────────────────────────────────────── */
function EditModal({ guest, onClose, onSaved }) {
  const [form,   setForm]   = useState({ ...guest });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim())   { toast.warning("Name is required");          return; }
    if (!form.mobile?.trim()) { toast.warning("Contact number is required"); return; }
    if (!form.date)           { toast.warning("Date is required");           return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.REPORTGUEST, guest.id), {
        name:       form.name.trim(),
        mobile:     form.mobile.trim(),
        address:    form.address?.trim() || "",
        occupation: form.occupation?.trim() || "",
        age:        form.age || "",
        date:       form.date,
      });
      toast.success("Guest updated!");
      onSaved({ ...form, name: form.name.trim(), mobile: form.mobile.trim() });
    } catch (e) {
      
      toast.danger("Failed to update guest");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}>
      <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              <Pencil className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-foreground text-[15px]">Edit Guest</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {/* Date */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Date *</label>
            <input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Name *</label>
            <input type="text" value={form.name || ""} onChange={(e) => set("name", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          {/* Contact */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Contact No. *</label>
            <input type="tel" value={form.mobile || ""}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 15))}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          {/* Address */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Address</label>
            <textarea value={form.address || ""} onChange={(e) => set("address", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          {/* Occupation + Age */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Occupation</label>
              <input type="text" value={form.occupation || ""} onChange={(e) => set("occupation", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Age</label>
              <input type="number" min="1" max="120" value={form.age || ""} onChange={(e) => set("age", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-bold text-[13px] hover:bg-muted/30 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Delete confirm modal ────────────────────────────────────────── */
function DeleteModal({ guest, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.REPORTGUEST, guest.id));
      toast.success("Guest deleted");
      onDeleted(guest.id);
    } catch (e) {
      
      toast.danger("Failed to delete guest");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}>
      <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xs p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <p className="font-bold text-foreground text-[16px]">Delete Guest?</p>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            This will permanently remove <span className="font-semibold text-foreground">{guest.name}</span> from the guest list. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-bold text-[13px] hover:bg-muted/30 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors">
            {deleting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
              : <><Trash2 className="w-3.5 h-3.5" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function ViewGuestList({ memberProfile }) {
  const memberId = memberProfile?.memberId || memberProfile?.profileId || memberProfile?.managerId || "";

  const [dateFrom,     setDateFrom]     = useState(sevenAgoStr());
  const [dateTo,       setDateTo]       = useState(todayStr());
  const [guests,       setGuests]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [pdfModal,     setPdfModal]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [editGuest,    setEditGuest]    = useState(null);
  const [deleteGuest,  setDeleteGuest]  = useState(null);

  const load = useCallback(async () => {
    if (!memberId) { toast.danger("Profile not found"); return; }
    if (!dateFrom || !dateTo) { toast.warning("Select a date range"); return; }
    if (dateFrom > dateTo)    { toast.warning("From date must be before To date"); return; }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.REPORTGUEST), where("memberId", "==", memberId))
      );
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter((g) => g.date >= dateFrom && g.date <= dateTo);
      filtered.sort((a, b) => a.date.localeCompare(b.date));
      setGuests(filtered);
    } catch (e) {
      
      toast.danger("Failed to load guests");
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [memberId, dateFrom, dateTo]);

  /* Optimistic update after edit */
  const handleSaved = (updated) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
    setEditGuest(null);
  };

  /* Optimistic remove after delete */
  const handleDeleted = (id) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    setDeleteGuest(null);
  };

  const searchedGuests = guests
    ? guests.filter((g) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          g.name?.toLowerCase().includes(q) ||
          g.mobile?.includes(q) ||
          g.occupation?.toLowerCase().includes(q) ||
          g.address?.toLowerCase().includes(q)
        );
      })
    : null;

  const handleView     = () => { viewGuestPDF({ memberProfile, dateFrom, dateTo, guests: searchedGuests }); setPdfModal(false); };
  const handleDownload = () => { downloadGuestPDF({ memberProfile, dateFrom, dateTo, guests: searchedGuests }); toast.success("PDF downloaded!"); setPdfModal(false); };

  return (
    <>
      {/* Edit modal */}
      {editGuest && (
        <EditModal
          guest={editGuest}
          onClose={() => setEditGuest(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteGuest && (
        <DeleteModal
          guest={deleteGuest}
          onClose={() => setDeleteGuest(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* PDF action modal */}
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
              <p className="font-bold text-foreground text-[16px]">Guest List PDF</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {dateFrom} → {dateTo} · {searchedGuests?.length || 0} guest{(searchedGuests?.length || 0) !== 1 ? "s" : ""}
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
              <p className="font-bold text-foreground text-[13px] leading-tight">View Guest List</p>
              <p className="text-[10px] text-muted-foreground">Date-wise report · Edit or delete any entry · PDF export</p>
            </div>
          </div>
        </div>

        {/* Date filter */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Date Range</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">From</label>
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setGuests(null); }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">To</label>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setGuests(null); }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
              : <><RefreshCw className="w-4 h-4" /> {guests === null ? "Fetch Guests" : "Refresh"}</>}
          </button>
        </div>

        {/* Results */}
        {guests !== null && !loading && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Search + PDF button row */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${guests.length} guest${guests.length !== 1 ? "s" : ""}…`}
                  className="flex-1 bg-transparent text-[12px] outline-none text-foreground placeholder:text-muted-foreground" />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              {(searchedGuests?.length || 0) > 0 && (
                <button onClick={() => setPdfModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[11px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              )}
            </div>

            {/* Empty state */}
            {(searchedGuests?.length || 0) === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Users className="w-7 h-7 text-muted-foreground opacity-40" />
                </div>
                <p className="text-[14px] font-bold text-foreground">
                  {search ? "No guests match your search" : "No guests for this date range"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {search ? "Try a different search term" : "Add guests using the Add Guest tab"}
                </p>
              </div>
            )}

            {/* Table with Edit + Delete per row */}
            {(searchedGuests?.length || 0) > 0 && (
              <div className="overflow-x-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/5 border-b border-border/30">
                  <span className="text-[10px] font-bold text-accent">
                    {searchedGuests.length} guest{searchedGuests.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">{dateFrom} → {dateTo}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground italic">Tap ✏️ to edit · 🗑️ to delete</span>
                </div>

                <table className="w-full text-[11px] border-collapse min-w-[580px]">
                  <thead>
                    <tr style={{ background: "#0088DA", color: "white" }}>
                      <th className="px-2 py-2 border border-blue-700 text-center w-8 font-bold">Sl.</th>
                      <th className="px-2 py-2 border border-blue-700 text-left font-bold">Name</th>
                      <th className="px-2 py-2 border border-blue-700 text-center font-bold">Contact No.</th>
                      <th className="px-2 py-2 border border-blue-700 text-left font-bold">Address</th>
                      <th className="px-2 py-2 border border-blue-700 text-center font-bold">Occupation</th>
                      <th className="px-2 py-2 border border-blue-700 text-center font-bold w-10">Age</th>
                      <th className="px-2 py-2 border border-blue-700 text-center font-bold">Date</th>
                      <th className="px-2 py-2 border border-blue-700 text-center font-bold w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedGuests.map((g, i) => (
                      <tr key={g.id}
                        className={i % 2 === 0 ? "bg-card dark:bg-gray-900" : "bg-blue-50/40 dark:bg-blue-950/10"}>
                        <td className="px-2 py-2 border border-border text-center font-bold text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-2 border border-border text-left font-semibold text-foreground">{g.name || "—"}</td>
                        <td className="px-2 py-2 border border-border text-center font-mono text-foreground">{g.mobile || "—"}</td>
                        <td className="px-2 py-2 border border-border text-left text-foreground max-w-[120px]">
                          <span className="block truncate" title={g.address}>{g.address || "—"}</span>
                        </td>
                        <td className="px-2 py-2 border border-border text-center text-foreground">{g.occupation || "—"}</td>
                        <td className="px-2 py-2 border border-border text-center text-foreground">{g.age || "—"}</td>
                        <td className="px-2 py-2 border border-border text-center text-foreground font-mono text-[10px]">{g.date || "—"}</td>
                        <td className="px-2 py-1.5 border border-border text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditGuest(g)}
                              title="Edit"
                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 transition-colors">
                              <Pencil className="w-3 h-3 text-blue-600" />
                            </button>
                            <button
                              onClick={() => setDeleteGuest(g)}
                              title="Delete"
                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 transition-colors">
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#e8f2ff" }}>
                      <td colSpan={8} className="px-3 py-2 border border-border text-[11px] font-bold text-accent text-right">
                        Total: {searchedGuests.length} guest{searchedGuests.length !== 1 ? "s" : ""}
                      </td>
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
