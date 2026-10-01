import { useState } from "react";
import { db } from "../../../Firebase";
import { collection, writeBatch, doc, Timestamp } from "firebase/firestore";
import { CalendarPlus } from "lucide-react";
import { toast } from "@heroui/react";
import { BatchList, FormFields, ModalActions } from "./AddPlan";
import { COLLECTIONS } from "../../../collections";

export default function AddNextDayPlan({ memberProfile, onClose }) {
  const [batch, setBatch] = useState([]);
  const [form, setForm] = useState({ name: "", mobile: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    if (!form.name.trim() || !form.mobile.trim()) { toast.danger("Name and Mobile required"); return; }
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
        const ref = doc(collection(db, COLLECTIONS.REPORTNEXTDAY));
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
      toast.success(`${batch.length} next-day plan(s) saved`);
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
      <FormFields
        form={form}
        setForm={setForm}
        fields={[
          { key: "name", label: "Name", placeholder: "Full Name" },
          { key: "mobile", label: "Mobile", placeholder: "Mobile Number", type: "tel" },
          { key: "address", label: "Address / Place", placeholder: "Address or place to meet" },
        ]}
      />
      <ModalActions onAdd={handleAdd} onSubmit={handleSubmit} onCancel={onClose} count={batch.length} submitting={submitting} label="Next Day Plans" />
    </>
  );
}
