import { useState } from "react";
import { db } from "../../../Firebase";
import { collection, writeBatch, doc, Timestamp } from "firebase/firestore";
import { Plus, Trash2, Send, Users, X } from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../../collections";

export function WorkModal({ open, onClose, title, subtitle, icon, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-card dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card dark:bg-gray-900 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,36,92,0.08)" }}>
              {icon}
            </div>
            <div>
              <p className="font-bold text-foreground text-[14px] leading-tight">{title}</p>
              {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function WorkButton({ icon, label, subtitle, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl border border-border bg-card shadow-sm hover:bg-muted/30 active:scale-[0.98] transition-all"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(14,36,92,0.08)" }}>
          {icon}
        </div>
        <div className="text-left">
          <p className="font-bold text-foreground text-[13px] leading-tight">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {count !== null && count !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
          {count}
        </span>
      )}
    </button>
  );
}

export function BatchList({ items, onRemove, renderLabel }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Added ({items.length})</p>
      {items.map((item) => (
        <div key={item._id} className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-xl px-3 py-2">
          <p className="text-[12px] text-foreground font-medium truncate">{renderLabel(item)}</p>
          <button onClick={() => onRemove(item._id)} className="ml-2 p-1 text-red-400 hover:text-red-600 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function FormFields({ form, setForm, fields }) {
  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">{f.label}</label>
          {f.readOnly ? (
            <div className="w-full px-3 py-2 rounded-xl border border-border/60 bg-muted/30 text-[13px] text-foreground min-h-[36px]">
              {form[f.key] || <span className="text-muted-foreground">—</span>}
            </div>
          ) : (
            <input
              type={f.type || "text"}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ModalActions({ onAdd, onSubmit, onCancel, count, submitting, label }) {
  return (
    <div className="flex gap-2 pt-1 border-t border-border/40">
      <button
        onClick={onCancel}
        className="py-2.5 px-4 rounded-xl border border-border text-muted-foreground text-[12px] font-semibold hover:bg-muted/40 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onAdd}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-accent/30 text-accent text-[12px] font-bold hover:bg-accent/5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add to List
      </button>
      {count > 0 && (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[12px] font-bold disabled:opacity-60 transition-opacity"
          style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}
        >
          {submitting
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><Send className="w-3.5 h-3.5" /> Save {count}</>}
        </button>
      )}
    </div>
  );
}

const PLAN_FIELDS = [
  { key: "name", placeholder: "Full Name", label: "Name" },
  { key: "mobile", placeholder: "Mobile Number", label: "Mobile", type: "tel" },
  { key: "address", placeholder: "Address / Location", label: "Address" },
];

export default function AddPlan({ memberProfile, onClose }) {
  const [batch, setBatch] = useState([]);
  const [form, setForm] = useState({ name: "", mobile: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    if (!form.name.trim() || !form.mobile.trim()) {
      toast.danger("Name and Mobile are required");
      return;
    }
    setBatch((prev) => [...prev, { ...form, _id: Date.now() }]);
    setForm({ name: "", mobile: "", address: "" });
  };

  const handleSubmit = async () => {
    if (batch.length === 0) { toast.danger("Add at least one plan"); return; }
    setSubmitting(true);
    try {
      const wb = writeBatch(db);
      const now = Timestamp.now();
      batch.forEach((item) => {
        const ref = doc(collection(db, COLLECTIONS.REPORTPLAN));
        wb.set(ref, {
          memberId: memberProfile.memberId,
          managerId: memberProfile.managerId,
          name: item.name,
          mobile: item.mobile,
          address: item.address,
          createdAt: now,
          date: now,
        });
      });
      await wb.commit();
      toast.success(`${batch.length} plan(s) saved`);
      setBatch([]);
      if (onClose) onClose();
    } catch {
      toast.danger("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BatchList items={batch} onRemove={(id) => setBatch((p) => p.filter((i) => i._id !== id))} renderLabel={(i) => `${i.name} · ${i.mobile}`} />
      <FormFields form={form} setForm={setForm} fields={PLAN_FIELDS} />
      <ModalActions onAdd={handleAdd} onSubmit={handleSubmit} onCancel={onClose} count={batch.length} submitting={submitting} label="Plans" />
    </>
  );
}

export function SectionCard({ icon, title, subtitle, count, open, setOpen, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,36,92,0.08)" }}>
            {icon}
          </div>
          <div className="text-left">
            <p className="font-bold text-foreground text-[13px] leading-tight">{title}</p>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#0088DA" }}>{count}</span>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">{children}</div>}
    </div>
  );
}

export function ActionRow({ onAdd, onSubmit, count, submitting, label }) {
  return (
    <div className="flex gap-2 pt-1">
      <button onClick={onAdd}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-accent/30 text-accent text-[12px] font-bold hover:bg-accent/5 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add to List
      </button>
      {count > 0 && (
        <button onClick={onSubmit} disabled={submitting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[12px] font-bold disabled:opacity-60 transition-opacity"
          style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
          {submitting
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><Send className="w-3.5 h-3.5" /> Submit {count}</>}
        </button>
      )}
    </div>
  );
}
