import { useState } from "react";
import { db } from "../../../Firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../../collections";

const EMPTY = { name: "", mobile: "", address: "", occupation: "", age: "", date: new Date().toISOString().slice(0, 10) };

export default function AddGuest({ memberProfile }) {
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const memberId = memberProfile?.memberId || memberProfile?.profileId || memberProfile?.managerId || "";

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setSaved(false); };

  const handleSubmit = async () => {
    if (!form.name.trim())   { toast.warning("Name is required");          return; }
    if (!form.mobile.trim()) { toast.warning("Contact number is required"); return; }
    if (!form.date)          { toast.warning("Date is required");           return; }
    if (!memberId)           { toast.danger("Profile not found");           return; }

    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.REPORTGUEST), {
        memberId,
        name:       form.name.trim(),
        mobile:     form.mobile.trim(),
        address:    form.address.trim(),
        occupation: form.occupation.trim(),
        age:        form.age.trim(),
        date:       form.date,
        createdAt:  Timestamp.now(),
      });
      setSaved(true);
      setForm({ ...EMPTY, date: form.date });
      toast.success("Guest added successfully!");
    } catch (e) {
      
      toast.danger("Failed to add guest");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#0088DA,#4f6fcf)" }} />

      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
          <UserPlus className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-foreground text-[14px] leading-tight">Add Guest</p>
          <p className="text-[10px] text-muted-foreground">Fill in the guest details below</p>
        </div>
      </div>

      <div className="px-4 pb-5 space-y-3 pt-2">

        {/* Date — top so user sets context first */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Name */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Name *</label>
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Contact */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Contact No. *</label>
          <input
            type="tel"
            placeholder="Mobile number"
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 15))}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Address */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Address</label>
          <textarea
            placeholder="Full address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Occupation + Age side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Occupation</label>
            <input
              type="text"
              placeholder="e.g. Teacher"
              value={form.occupation}
              onChange={(e) => set("occupation", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Age</label>
            <input
              type="number"
              placeholder="Age"
              min="1"
              max="120"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity mt-1"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved! Add Another</>
          ) : (
            <><UserPlus className="w-4 h-4" /> Add Guest</>
          )}
        </button>
      </div>
    </div>
  );
}
