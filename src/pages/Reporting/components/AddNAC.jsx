import { useState, useEffect } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { Award } from "lucide-react";
import { toast } from "@heroui/react";
import { BatchList, FormFields, ModalActions } from "./AddPlan";
import SearchablePicker from "./SearchablePicker";
import { COLLECTIONS } from "../../../collections";

export default function AddNAC({ memberProfile, onClose }) {
  const [spList, setSpList] = useState([]);
  const [selectedSP, setSelectedSP] = useState(null);
  const [batch, setBatch] = useState([]);
  const [form, setForm] = useState({ name: "", mobile: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loadingSP, setLoadingSP] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, COLLECTIONS.REPORTSP), where("memberId", "==", memberProfile.memberId)))
      .then((snap) => setSpList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => toast.danger("Failed to load SP Closed entries"))
      .finally(() => setLoadingSP(false));
  }, [memberProfile.memberId]);

  const handleSelectSP = (spId) => {
    const s = spList.find((sp) => sp.id === spId);
    if (s) {
      setSelectedSP(s);
      setForm({ name: s.name, mobile: s.mobile, address: s.address });
    } else {
      setSelectedSP(null);
      setForm({ name: "", mobile: "", address: "" });
    }
  };

  const handleAdd = () => {
    if (!selectedSP) { toast.danger("Select an SP Closed entry first"); return; }
    setBatch((prev) => [...prev, { ...form, spId: selectedSP.id, _id: Date.now() }]);
    setForm({ name: "", mobile: "", address: "" });
    setSelectedSP(null);
  };

  const handleSubmit = async () => {
    if (batch.length === 0) { toast.danger("Add at least one NAC"); return; }
    setSubmitting(true);
    try {
      const wb = writeBatch(db);
      const now = Timestamp.now();
      batch.forEach((item) => {
        const ref = doc(collection(db, COLLECTIONS.REPORTNAC));
        wb.set(ref, {
          memberId: memberProfile.memberId,
          managerId: memberProfile.managerId,
          spId: item.spId,
          name: item.name,
          mobile: item.mobile,
          address: item.address,
          createdAt: now,
          date: now,
        });
      });
      await wb.commit();
      toast.success(`${batch.length} NAC(s) saved`);
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
      <BatchList
        items={batch}
        onRemove={(id) => setBatch((p) => p.filter((i) => i._id !== id))}
        renderLabel={(i) => `${i.name} · ${i.mobile}`}
      />

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Select from SP Closed</label>
        {loadingSP ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-[12px] text-muted-foreground">
            <div className="w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin" />
            Loading SP Closed entries...
          </div>
        ) : (
          <SearchablePicker
            items={spList}
            value={selectedSP?.id || ""}
            onChange={handleSelectSP}
            placeholder="-- Select SP Closed --"
            renderItem={(s) => (
              <div>
                <p className="text-[12px] font-semibold text-foreground leading-tight">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.mobile} · SP: {s.sp}</p>
              </div>
            )}
            getLabel={(s) => `${s.name} · ${s.mobile}`}
          />
        )}
      </div>

      <FormFields
        form={form}
        setForm={setForm}
        fields={[
          { key: "name", label: "Name", readOnly: true },
          { key: "mobile", label: "Mobile", readOnly: true },
          { key: "address", label: "Address", readOnly: true },
        ]}
      />

      <ModalActions onAdd={handleAdd} onSubmit={handleSubmit} onCancel={onClose} count={batch.length} submitting={submitting} label="NACs" />
    </>
  );
}
