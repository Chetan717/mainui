import { useState, useEffect } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { TrendingUp } from "lucide-react";
import { toast } from "@heroui/react";
import { BatchList, FormFields, ModalActions } from "./AddPlan";
import SearchablePicker from "./SearchablePicker";
import { COLLECTIONS } from "../../../collections";

export default function AddSPClosed({ memberProfile, onClose }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [batch, setBatch] = useState([]);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", sp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansSnap = await getDocs(
          query(collection(db, COLLECTIONS.REPORTPLAN), where("memberId", "==", memberProfile.memberId))
        );
        const allPlans = plansSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const spSnap = await getDocs(
          query(collection(db, COLLECTIONS.REPORTSP), where("memberId", "==", memberProfile.memberId))
        );
        const closedPlanIds = new Set(spSnap.docs.map((d) => d.data().planId));
        setPlans(allPlans.filter((p) => !closedPlanIds.has(p.id)));
      } catch {
        toast.danger("Failed to load plans");
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [memberProfile.memberId]);

  const handleSelectPlan = (planId) => {
    const p = plans.find((pl) => pl.id === planId);
    if (p) {
      setSelectedPlan(p);
      setForm((f) => ({ ...f, name: p.name, mobile: p.mobile, address: p.address }));
    } else {
      setSelectedPlan(null);
      setForm((f) => ({ ...f, name: "", mobile: "", address: "" }));
    }
  };

  const handleAdd = () => {
    if (!selectedPlan) { toast.danger("Select a plan first"); return; }
    if (!form.sp.trim()) { toast.danger("SP value is required"); return; }
    setBatch((prev) => [...prev, { ...form, planId: selectedPlan.id, _id: Date.now() }]);
    setForm({ name: "", mobile: "", address: "", sp: "" });
    setSelectedPlan(null);
  };

  const handleSubmit = async () => {
    if (batch.length === 0) { toast.danger("Add at least one SP"); return; }
    setSubmitting(true);
    try {
      const wb = writeBatch(db);
      const now = Timestamp.now();
      batch.forEach((item) => {
        const ref = doc(collection(db, COLLECTIONS.REPORTSP));
        wb.set(ref, {
          memberId: memberProfile.memberId,
          managerId: memberProfile.managerId,
          planId: item.planId,
          name: item.name,
          mobile: item.mobile,
          address: item.address,
          sp: item.sp,
          createdAt: now,
          date: now,
        });
      });
      await wb.commit();
      toast.success(`${batch.length} SP Closed saved`);
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
        renderLabel={(i) => `${i.name} · SP: ${i.sp}`}
      />

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Select Plan</label>
        {loadingPlans ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-[12px] text-muted-foreground">
            <div className="w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin" />
            Loading plans...
          </div>
        ) : (
          <SearchablePicker
            items={plans}
            value={selectedPlan?.id || ""}
            onChange={handleSelectPlan}
            placeholder="-- Select a Plan --"
            renderItem={(p) => (
              <div>
                <p className="text-[12px] font-semibold text-foreground leading-tight">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.mobile}</p>
              </div>
            )}
            getLabel={(p) => `${p.name} · ${p.mobile}`}
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
          { key: "sp", label: "Enter SP", placeholder: "Enter SP value" },
        ]}
      />

      <ModalActions onAdd={handleAdd} onSubmit={handleSubmit} onCancel={onClose} count={batch.length} submitting={submitting} label="SP Closed" />
    </>
  );
}
