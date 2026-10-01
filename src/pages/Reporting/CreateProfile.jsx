import { useState } from "react";
import { db } from "../../Firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { UserPlus, ChevronRight, CheckCircle } from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../collections";

const NAME_MAX    = 100;
const ADDRESS_MAX = 300;
const ID_MIN      = 4;
const ID_MAX      = 12;

function sanitizeText(str, max) {
  return String(str || "").trim().slice(0, max);
}

function isValidProfileId(id) {
  return /^[A-Za-z0-9]{4,12}$/.test(id);
}

export default function CreateProfile({ userMobile, userName, onProfileCreated }) {
  const [form, setForm] = useState({
    name:    (userName || "").slice(0, NAME_MAX),
    address: "",
    profileId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name    = sanitizeText(form.name, NAME_MAX);
    const address = sanitizeText(form.address, ADDRESS_MAX);
    const id      = form.profileId.trim().toUpperCase();

    if (!name || name.length < 2) {
      toast.danger("Name must be at least 2 characters");
      return;
    }
    if (!address) {
      toast.danger("Address is required");
      return;
    }
    if (!isValidProfileId(id)) {
      toast.danger(`ID must be 4–12 characters, letters and numbers only`);
      return;
    }

    setSubmitting(true);
    try {
      const existing = await getDocs(
        query(collection(db, COLLECTIONS.REPORTINGUSER), where("profileId", "==", id))
      );
      if (!existing.empty) {
        toast.danger("This ID is already taken — choose another");
        setSubmitting(false);
        return;
      }

      const docData = {
        name,
        mobile:     userMobile,
        address,
        profileId:  id,
        managerId:  "",
        managerName: "",
        userMobile,
        createdAt:  Timestamp.now(),
      };

      const ref = await addDoc(collection(db, COLLECTIONS.REPORTINGUSER), docData);
      const newProfile = { id: ref.id, ...docData };
      setCreatedId(id);
      setDone(true);

      setTimeout(() => onProfileCreated(newProfile), 1800);
    } catch (err) {
      
      toast.danger("Failed to create profile");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-[24px] flex items-center justify-center shadow-xl"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-[22px] font-black text-foreground">Profile Created!</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Share your ID with people to add them to your team</p>
        </div>
        <div className="px-8 py-4 rounded-2xl bg-accent/10 border-2 border-accent/30 w-full">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Your Profile ID</p>
          <p className="text-[32px] font-black text-accent tracking-widest font-mono">{createdId}</p>
        </div>
        <p className="text-[12px] text-muted-foreground">Taking you to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-[22px] flex items-center justify-center mx-auto mb-3 shadow-lg"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}>
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground">Create Your Profile</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Set up your profile to start building your network</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Full Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.slice(0, NAME_MAX) }))}
            placeholder="Enter your full name"
            maxLength={NAME_MAX}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Address
          </label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value.slice(0, ADDRESS_MAX) }))}
            placeholder="Enter your address"
            maxLength={ADDRESS_MAX}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Profile ID <span className="text-[10px] normal-case font-normal text-muted-foreground">(4–12 chars · letters &amp; numbers)</span>
          </label>
          <input
            type="text"
            value={form.profileId}
            onChange={(e) => {
              const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, ID_MAX);
              setForm((f) => ({ ...f, profileId: val }));
            }}
            placeholder="e.g. RAHUL123 or ABC001"
            maxLength={ID_MAX}
            autoCapitalize="characters"
            className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-foreground text-[20px] font-mono font-bold tracking-widest outline-none focus:ring-2 focus:ring-accent/30 text-center uppercase"
          />
          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-[10px] text-muted-foreground">Letters (A–Z) and numbers (0–9) only</p>
            <p className={`text-[10px] font-bold font-mono ${
              form.profileId.length >= ID_MIN ? "text-green-500" : "text-muted-foreground"
            }`}>
              {form.profileId.length}/{ID_MAX}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-3 flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-accent text-[10px] font-black">i</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your Profile ID is your unique network identity. Share it with others so they can join your team.
            Choose something easy to remember.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !isValidProfileId(form.profileId.trim())}
          className="w-full py-3.5 rounded-xl text-white text-[14px] font-bold disabled:opacity-50 mt-2 flex items-center justify-center gap-2 transition-opacity"
          style={{ background: "linear-gradient(135deg,#0088DA,#4f6fcf)" }}
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <><ChevronRight className="w-4 h-4" /> Create Profile</>
          )}
        </button>
      </form>
    </div>
  );
}
