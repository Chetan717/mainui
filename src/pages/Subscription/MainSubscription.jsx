import React, { useEffect, useState, useCallback } from "react";
import { getUser } from "../../utils/authStorage";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import {
  Button,
  IconCalendar,
  ExternalLinkIcon,
  Skeleton,
} from "@heroui/react";
import subcric from "./plan.webp";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "@firebase-config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { CheckoutModal } from "./CheckoutModal";
import { PlanModal } from "./PlanModal";
import "swiper/css";
import "swiper/css/pagination";
import { COLLECTIONS } from "../../collections";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";
import {
  CreditCard,
  History,
  Clock,
  Download,
  IndianRupee,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return "N/A";
  const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const daysLeft = (expiryStr) => {
  const today = new Date();
  const expiry = new Date(expiryStr);
  const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// ─── Active Subscription Card ─────────────────────────────────────────────────
function ActiveSubscriptionCard({ sub }) {
  const days = daysLeft(sub.expirydate);
  const totalDays = sub.duration ?? 1;
  const usedDays = totalDays - days;
  const progress = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));

  return (
    <div
      className="relative rounded-[28px] overflow-hidden shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg, #0088DA 0%, #0088DA 50%, #0088DA 100%)",
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, #6366f1 0%, transparent 70%), radial-gradient(ellipse at 80% 100%, #3b82f6 0%, transparent 60%)",
        }}
      />
      {/* Top highlight */}
      <div className="absolute top-0 left-6 right-6 h-px bg-white/20 rounded-full" />

      <div className="relative p-6">
        {/* Plan name + badge */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[18px] font-display font-bold text-white leading-tight">
                {sub.plan || "Subscription"}
              </p>
              <p className="text-[11px] font-semibold text-white/60 mt-0.5 tracking-wider uppercase">
                {sub.planType || "Premium Plan"}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
            style={{
              background: "rgba(34,197,94,0.18)",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
              Active
            </p>
          </div>
        </div>

        {/* Progress timeline */}
        <div
          className="mb-5 rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-1">
                Started
              </p>
              <p className="text-[13px] font-bold text-white/90">
                {formatDate(sub.startdate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-1">
                Expires
              </p>
              <p className="text-[13px] font-bold text-red-300">
                {formatDate(sub.expirydate)}
              </p>
            </div>
          </div>
          <div
            className="relative w-full h-2 rounded-full overflow-hidden mb-2"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-center text-blue-200">
            {days > 0 ? `${days} days remaining` : "Expiring today"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Downloads",
              value: sub.download ?? 0,
              icon: <Download className="w-3.5 h-3.5" />,
            },
            {
              label: "Duration",
              value: `${sub.duration ?? 0}d`,
              icon: <Clock className="w-3.5 h-3.5" />,
            },
            {
              label: "Paid",
              value: `₹${sub.PaymentAmount ?? 0}`,
              icon: <IndianRupee className="w-3.5 h-3.5" />,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div className="flex justify-center text-blue-200 mb-1.5">
                {s.icon}
              </div>
              <p className="text-[14px] font-bold text-white leading-none">
                {s.value}
              </p>
              <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wide mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Expired Subscription Card ────────────────────────────────────────────────
function ExpiredSubscriptionCard({ sub }) {
  return (
    <div className="relative rounded-[24px] overflow-hidden border border-border/60 shadow-sm bg-muted/20">
      {/* Faded stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[16px] font-display font-bold text-foreground/80">
                {sub.plan || "Subscription"}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 tracking-wider uppercase">
                {sub.planType || "Plan"}
              </p>
            </div>
          </div>
          <div className="bg-danger/8 border border-danger/15 rounded-full px-2.5 py-1 shrink-0">
            <p className="text-[10px] font-bold text-danger/80 uppercase tracking-wider">
              Expired
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">
                Started
              </p>
              <p className="text-[13px] font-bold text-foreground/70">
                {formatDate(sub.startdate)}
              </p>
            </div>
            <div className="h-6 w-px bg-border mx-3" />
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">
                Expired On
              </p>
              <p className="text-[13px] font-bold text-danger/70">
                {formatDate(sub.expirydate)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Downloads", value: sub.download ?? 0 },
            { label: "Duration", value: `${sub.duration ?? 0}d` },
            { label: "Paid", value: `₹${sub.PaymentAmount ?? 0}` },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-muted/20 p-2.5 text-center"
            >
              <p className="text-[14px] font-bold text-foreground/60">
                {s.value}
              </p>
              <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────
function SubSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="rounded-[24px] overflow-hidden border border-border bg-white dark:bg-black/20 p-6">
        <div className="flex gap-4 mb-6">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1 pt-1">
            <Skeleton className="h-6 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-1/4 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Tabs Component ───────────────────────────────────────────────────────────
function SubscriptionTabs({
  activeTab,
  setActiveTab,
  activeCount,
  expiredCount,
}) {
  const tabs = [
    { key: "active", label: "Active Plans", count: activeCount },
    { key: "expired", label: "History", count: expiredCount },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[13px] font-bold transition-all duration-300 border ${
            activeTab === tab.key
              ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
              : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
          }`}
        >
          {tab.key === "active" ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
          {tab.label}
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
              activeTab === tab.key
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MainSubscription() {
  const { selectedCompany } = useSelectedCompany();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [openCheckoutModal, setOpenCheckoutModal] = useState(false);

  // Subscription states
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [expiredSubscriptions, setExpiredSubscriptions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  // ── Helper: check if an expirydate (Firestore Timestamp or string) is past today ──
  const isExpiredByDate = (expirydate) => {
    if (!expirydate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = expirydate?.seconds
      ? new Date(expirydate.seconds * 1000)
      : new Date(expirydate);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // Fetch both active and expired subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      setSubLoading(true);
      const user = getUser();
      if (!user) return;
      const mobileNo = user?.mobileNo;
      if (!mobileNo) return;

      // ── Active: Active=true, Expire=false ─────────────────────────────
      const activeQuery = query(
        collection(db, COLLECTIONS.SUBSCRIPTION),
        where("mobileNo", "==", mobileNo),
        where("Active", "==", true),
        where("Expire", "==", false),
      );

      // ── Expired: Active=false, Expire=true ────────────────────────────
      const expiredQuery = query(
        collection(db, COLLECTIONS.SUBSCRIPTION),
        where("mobileNo", "==", mobileNo),
        where("Active", "==", false),
        where("Expire", "==", true),
      );

      const [activeSnap, expiredSnap] = await Promise.all([
        getDocs(activeQuery),
        getDocs(expiredQuery),
      ]);

      const sortByDate = (arr) =>
        arr.sort(
          (a, b) => (b.PurchaseAt?.seconds ?? 0) - (a.PurchaseAt?.seconds ?? 0),
        );

      // ── Auto-expire: if expirydate < today, update Firestore and move to expired ──
      const nowActive = [];
      const autoExpired = [];

      for (const d of activeSnap.docs) {
        const data = { id: d.id, ...d.data() };
        if (isExpiredByDate(data.expirydate)) {
          autoExpired.push(data);
          // Fire-and-forget Firestore update — don't block UI
          updateDoc(doc(db, "subscription", d.id), {
            Active: false,
            Expire: true,
          }).catch((e) => undefined);
        } else {
          nowActive.push(data);
        }
      }

      const expiredList = sortByDate([
        ...autoExpired,
        ...expiredSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ]);
      const activeList = sortByDate(nowActive);

      setActiveSubscriptions(activeList);
      setExpiredSubscriptions(expiredList);

      // Auto-switch to expired tab if no active subs but has expired
      if (activeList.length === 0 && expiredList.length > 0) {
        setActiveTab("expired");
      }
    } catch (err) {
      
    } finally {
      setSubLoading(false);
    }
  }, []);

  // Fetch available plans
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const company = selectedCompany;
      if (!company) throw new Error("No company data found.");
      if (!company?.id) throw new Error("Company ID not found.");
      const docRef = doc(db, "mlmcomp", company.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists())
        throw new Error("Company Doesnot Launch Any Plan Yet!.");
      const data = docSnap.data();
      const fetchedPlans = (data?.Plans ?? []).filter(
        (p) => p.PlanName || p.image_url,
      );

      setPlans(fetchedPlans);
    } catch (err) {
      
      setError("Failed to load plans. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (!subLoading) {
      fetchPlans();
    }
  }, [subLoading, fetchPlans]);

  const handleSlideClick = (plan) => {
    setSelectedPlan(plan);
    setOpenPlanModal(true);
  };

  const handlePaymentSuccess = useCallback(() => {
    setOpenCheckoutModal(false);
    setOpenPlanModal(false);
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const hasAnySub =
    activeSubscriptions.length > 0 || expiredSubscriptions.length > 0;
  const hasActiveSub = activeSubscriptions.length > 0;

  if (subLoading) {
    return (
      <div className="w-full min-h-full bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <SubSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Premium Hero Header */}
        <div
          className="relative mb-8 rounded-[28px] overflow-hidden p-6"
          style={{
            background:
              "linear-gradient(135deg, #0088da 0%, #0088DA 60%, #0088da 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at 80% 20%, #0088da 0%, transparent 60%)",
            }}
          />
          <div className="absolute top-0 left-8 right-8 h-px bg-white/15 rounded-full" />
          <div className="relative flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className="text-yellow-300"
              >
                <path
                  d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-0.5">
                Premium Access
              </p>
              <h1 className="text-[22px] font-display font-bold text-white leading-tight">
                My Subscriptions
              </h1>
            </div>
          </div>
        </div>

        {/* ── Subscription Tabs (only shown if user has any subs) ── */}
        {hasAnySub && (
          <div className="mb-10">
            <SubscriptionTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              activeCount={activeSubscriptions.length}
              expiredCount={expiredSubscriptions.length}
            />

            {/* Active Tab Content */}
            {activeTab === "active" && (
              <div className="space-y-6">
                {activeSubscriptions.length === 0 ? (
                  <div className="py-12 px-6 rounded-3xl bg-muted/30 border border-border text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-sm mb-4">
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">
                      No Active Plans
                    </h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      You don't have any active subscriptions. Choose a plan
                      below to unlock premium features.
                    </p>
                  </div>
                ) : (
                  activeSubscriptions.map((sub) => (
                    <ActiveSubscriptionCard key={sub.id} sub={sub} />
                  ))
                )}
              </div>
            )}

            {/* Expired Tab Content */}
            {activeTab === "expired" && (
              <div className="space-y-6">
                {expiredSubscriptions.length === 0 ? (
                  <div className="py-12 px-6 rounded-3xl bg-muted/30 border border-border text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-sm mb-4">
                      <History className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">
                      No History
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Your expired subscriptions will appear here.
                    </p>
                  </div>
                ) : (
                  expiredSubscriptions.map((sub) => (
                    <ExpiredSubscriptionCard key={sub.id} sub={sub} />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Available Plans Section (hidden when user has an active subscription) ── */}
        {!hasActiveSub && (
          <div className="mt-12">
            {/* <div className="mb-7">
              <p className="text-[11px] font-bold text-accent/80 uppercase tracking-widest mb-1">
                Unlock More
              </p>
              <h2 className="text-[22px] font-display font-bold text-foreground">
                Upgrade Your Plan
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                Choose a plan that fits your workflow
              </p>
            </div> */}

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64 rounded-3xl" />
                <Skeleton className="h-64 rounded-3xl" />
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-danger/10 border border-danger/20 text-center">
                <p className="text-danger font-medium">{error}</p>
              </div>
            ) : plans.length === 0 ? (
              <div className=" rounded-2xl w-full flex justify-center items-center h-full text-center">
                {/* <p className="text-muted-foreground">
                  No plans currently available.
                </p> */}
                {/* <div className="p-1 rounded-2xl text-center"> */}
                  <img src={subcric} className=" p-2 border border-border/60 rounded-xl  h-full object-contain" alt="Plans Coming Soon" />
                {/* </div> */}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {plans.map((plan, index) => (
                  <div
                    key={index}
                    onClick={() => handleSlideClick(plan)}
                    className="group cursor-pointer rounded-[24px] overflow-hidden border border-border/60 hover:border-accent/40 shadow-md hover:shadow-xl transition-all duration-300 relative bg-white dark:bg-[#0f1525]"
                  >
                    {/* Accent top bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(90deg, #0088DA, #4f6fd0)",
                      }}
                    />

                    {plan.image_url ? (
                      <div className="aspect-[16/9] w-full overflow-hidden relative">
                        <img
                          src={plan.image_url}
                          alt={plan.PlanName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <h3 className="text-white font-display font-bold text-[18px] mb-0.5">
                                {plan.PlanName}
                              </h3>
                              <p className="text-white/70 text-[12px]">
                                Tap to view details
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-white/60 mb-0.5">
                                Price
                              </p>
                              <p className="text-[20px] font-bold text-white">
                                ₹{plan.PlanAmount ?? 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-accent/20"
                            style={{
                              background:
                                "linear-gradient(135deg, rgba(14,36,92,0.12), rgba(79,111,208,0.08))",
                            }}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="text-accent"
                            >
                              <path
                                d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
                                fill="currentColor"
                              />
                            </svg>
                          </div>
                          <div className="px-2.5 py-1 rounded-full text-[10px] font-bold text-accent bg-accent/8 border border-accent/15">
                            Premium
                          </div>
                        </div>
                        <h3 className="font-display font-bold text-[18px] text-foreground mb-3 group-hover:text-accent transition-colors">
                          {plan.PlanName || "Premium Plan"}
                        </h3>
                        <div className="flex items-end justify-between pt-3 border-t border-border/40">
                          <div>
                            <p className="text-[9px] text-muted-foreground/70 uppercase font-bold tracking-widest mb-0.5">
                              One-time payment
                            </p>
                            <p className="text-[26px] font-bold text-accent leading-none">
                              ₹{plan.PlanAmount ?? 0}
                            </p>
                          </div>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-white opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shadow-lg shadow-accent/25">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PlanModal
        openA={openPlanModal}
        setOpenA={setOpenPlanModal}
        plan={selectedPlan}
        onProceedToCheckout={() => {
          setOpenPlanModal(false);
          setOpenCheckoutModal(true);
        }}
      />

      <CheckoutModal
        isOpen={openCheckoutModal}
        setIsOpen={setOpenCheckoutModal}
        plan={selectedPlan}
        onBack={() => {
          setOpenCheckoutModal(false);
          setOpenPlanModal(true);
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

// import React, { useEffect, useState, useCallback } from "react";
// import { Swiper, SwiperSlide } from "swiper/react";
// import { Pagination, Autoplay } from "swiper/modules";
// import {
//   Button,
//   IconCalendar,
//   ExternalLinkIcon,
//   Skeleton,
// } from "@heroui/react";
// import { jsPDF } from "jspdf";
// import autoTable from "jspdf-autotable";
// import { db } from "@firebase-config";
// import {
//   doc,
//   getDoc,
//   collection,
//   query,
//   where,
//   getDocs,
//   updateDoc,
// } from "firebase/firestore";
// import { CheckoutModal } from "./CheckoutModal";
// import { PlanModal } from "./PlanModal";
// import "swiper/css";
// import subcric from "./sub.webp"
// import "swiper/css/pagination";
// import { COLLECTIONS } from "../../collections";
// import {
//   CreditCard,
//   History,
//   Clock,
//   Download,
//   IndianRupee,
// } from "lucide-react";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const formatDate = (ts) => {
//   if (!ts) return "N/A";
//   const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
//   return d.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// };

// const daysLeft = (expiryStr) => {
//   const today = new Date();
//   const expiry = new Date(expiryStr);
//   const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
//   return diff;
// };

// // ─── Active Subscription Card ─────────────────────────────────────────────────
// function ActiveSubscriptionCard({ sub }) {
//   const days = daysLeft(sub.expirydate);
//   const totalDays = sub.duration ?? 1;
//   const usedDays = totalDays - days;
//   const progress = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));

//   return (
//     <div
//       className="relative rounded-[28px] overflow-hidden shadow-2xl"
//       style={{
//         background:
//           "linear-gradient(135deg, #0088DA 0%, #0088DA 50%, #0088DA 100%)",
//       }}
//     >
//       {/* Shimmer overlay */}
//       <div
//         className="absolute inset-0 opacity-20"
//         style={{
//           background:
//             "radial-gradient(ellipse at 30% 0%, #6366f1 0%, transparent 70%), radial-gradient(ellipse at 80% 100%, #3b82f6 0%, transparent 60%)",
//         }}
//       />
//       {/* Top highlight */}
//       <div className="absolute top-0 left-6 right-6 h-px bg-white/20 rounded-full" />

//       <div className="relative p-6">
//         {/* Plan name + badge */}
//         <div className="flex items-start justify-between gap-3 mb-5">
//           <div className="flex items-center gap-3">
//             <div
//               className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
//               style={{
//                 background: "rgba(255,255,255,0.12)",
//                 backdropFilter: "blur(8px)",
//               }}
//             >
//               <CreditCard className="w-5 h-5 text-white" />
//             </div>
//             <div>
//               <p className="text-[18px] font-display font-bold text-white leading-tight">
//                 {sub.plan || "Subscription"}
//               </p>
//               <p className="text-[11px] font-semibold text-white/60 mt-0.5 tracking-wider uppercase">
//                 {sub.planType || "Premium Plan"}
//               </p>
//             </div>
//           </div>
//           <div
//             className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
//             style={{
//               background: "rgba(34,197,94,0.18)",
//               border: "1px solid rgba(34,197,94,0.3)",
//             }}
//           >
//             <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
//             <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
//               Active
//             </p>
//           </div>
//         </div>

//         {/* Progress timeline */}
//         <div
//           className="mb-5 rounded-2xl p-4"
//           style={{
//             background: "rgba(255,255,255,0.07)",
//             backdropFilter: "blur(4px)",
//           }}
//         >
//           <div className="flex items-end justify-between mb-3">
//             <div>
//               <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-1">
//                 Started
//               </p>
//               <p className="text-[13px] font-bold text-white/90">
//                 {formatDate(sub.startdate)}
//               </p>
//             </div>
//             <div className="text-right">
//               <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-1">
//                 Expires
//               </p>
//               <p className="text-[13px] font-bold text-red-300">
//                 {formatDate(sub.expirydate)}
//               </p>
//             </div>
//           </div>
//           <div
//             className="relative w-full h-2 rounded-full overflow-hidden mb-2"
//             style={{ background: "rgba(255,255,255,0.1)" }}
//           >
//             <div
//               className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
//               style={{
//                 width: `${progress}%`,
//                 background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
//               }}
//             />
//           </div>
//           <p className="text-[11px] font-bold text-center text-blue-200">
//             {days > 0 ? `${days} days remaining` : "Expiring today"}
//           </p>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-3 gap-2">
//           {[
//             {
//               label: "Downloads",
//               value: sub.download ?? 0,
//               icon: <Download className="w-3.5 h-3.5" />,
//             },
//             {
//               label: "Duration",
//               value: `${sub.duration ?? 0}d`,
//               icon: <Clock className="w-3.5 h-3.5" />,
//             },
//             {
//               label: "Paid",
//               value: `₹${sub.PaymentAmount ?? 0}`,
//               icon: <IndianRupee className="w-3.5 h-3.5" />,
//             },
//           ].map((s, i) => (
//             <div
//               key={i}
//               className="rounded-xl p-3 text-center"
//               style={{ background: "rgba(255,255,255,0.08)" }}
//             >
//               <div className="flex justify-center text-blue-200 mb-1.5">
//                 {s.icon}
//               </div>
//               <p className="text-[14px] font-bold text-white leading-none">
//                 {s.value}
//               </p>
//               <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wide mt-1">
//                 {s.label}
//               </p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Expired Subscription Card ────────────────────────────────────────────────
// function ExpiredSubscriptionCard({ sub }) {
//   return (
//     <div className="relative rounded-[24px] overflow-hidden border border-border/60 shadow-sm bg-muted/20">
//       {/* Faded stripe */}
//       <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10" />
//       <div className="p-5">
//         <div className="flex items-start justify-between gap-3 mb-4">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
//               <History className="w-5 h-5" />
//             </div>
//             <div>
//               <p className="text-[16px] font-display font-bold text-foreground/80">
//                 {sub.plan || "Subscription"}
//               </p>
//               <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 tracking-wider uppercase">
//                 {sub.planType || "Plan"}
//               </p>
//             </div>
//           </div>
//           <div className="bg-danger/8 border border-danger/15 rounded-full px-2.5 py-1 shrink-0">
//             <p className="text-[10px] font-bold text-danger/80 uppercase tracking-wider">
//               Expired
//             </p>
//           </div>
//         </div>

//         <div className="rounded-xl border border-border/60 bg-background/40 p-3 mb-4">
//           <div className="flex justify-between items-center">
//             <div>
//               <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">
//                 Started
//               </p>
//               <p className="text-[13px] font-bold text-foreground/70">
//                 {formatDate(sub.startdate)}
//               </p>
//             </div>
//             <div className="h-6 w-px bg-border mx-3" />
//             <div className="text-right">
//               <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">
//                 Expired On
//               </p>
//               <p className="text-[13px] font-bold text-danger/70">
//                 {formatDate(sub.expirydate)}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-3 gap-2">
//           {[
//             { label: "Downloads", value: sub.download ?? 0 },
//             { label: "Duration", value: `${sub.duration ?? 0}d` },
//             { label: "Paid", value: `₹${sub.PaymentAmount ?? 0}` },
//           ].map((s, i) => (
//             <div
//               key={i}
//               className="rounded-xl border border-border/50 bg-muted/20 p-2.5 text-center"
//             >
//               <p className="text-[14px] font-bold text-foreground/60">
//                 {s.value}
//               </p>
//               <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide mt-1">
//                 {s.label}
//               </p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Skeleton Loaders ─────────────────────────────────────────────────────────
// function SubSkeleton() {
//   return (
//     <div className="space-y-6">
//       <Skeleton className="h-10 w-48 rounded-xl" />
//       <div className="rounded-[24px] overflow-hidden border border-border bg-white dark:bg-black/20 p-6">
//         <div className="flex gap-4 mb-6">
//           <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
//           <div className="space-y-2 flex-1 pt-1">
//             <Skeleton className="h-6 w-1/3 rounded-lg" />
//             <Skeleton className="h-4 w-1/4 rounded-lg" />
//           </div>
//         </div>
//         <Skeleton className="h-24 w-full rounded-2xl mb-6" />
//         <div className="grid grid-cols-3 gap-3">
//           <Skeleton className="h-20 rounded-xl" />
//           <Skeleton className="h-20 rounded-xl" />
//           <Skeleton className="h-20 rounded-xl" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Tabs Component ───────────────────────────────────────────────────────────
// function SubscriptionTabs({
//   activeTab,
//   setActiveTab,
//   activeCount,
//   expiredCount,
// }) {
//   const tabs = [
//     { key: "active", label: "Active Plans", count: activeCount },
//     { key: "expired", label: "History", count: expiredCount },
//   ];

//   return (
//     <div className="flex gap-2 mb-6">
//       {tabs.map((tab) => (
//         <button
//           key={tab.key}
//           onClick={() => setActiveTab(tab.key)}
//           className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[13px] font-bold transition-all duration-300 border ${
//             activeTab === tab.key
//               ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
//               : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
//           }`}
//         >
//           {tab.key === "active" ? (
//             <svg
//               width="13"
//               height="13"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="2.5"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <path d="M20 6 9 17l-5-5" />
//             </svg>
//           ) : (
//             <svg
//               width="13"
//               height="13"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="2.5"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <circle cx="12" cy="12" r="10" />
//               <path d="M12 6v6l4 2" />
//             </svg>
//           )}
//           {tab.label}
//           <span
//             className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
//               activeTab === tab.key
//                 ? "bg-white/20 text-white"
//                 : "bg-muted text-muted-foreground"
//             }`}
//           >
//             {tab.count}
//           </span>
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── Main Component ───────────────────────────────────────────────────────────
// export default function MainSubscription() {
//   const [plans, setPlans] = useState([]);
//   const [selectedPlan, setSelectedPlan] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [openPlanModal, setOpenPlanModal] = useState(false);
//   const [openCheckoutModal, setOpenCheckoutModal] = useState(false);

//   // Subscription states
//   const [activeSubscriptions, setActiveSubscriptions] = useState([]);
//   const [expiredSubscriptions, setExpiredSubscriptions] = useState([]);
//   const [subLoading, setSubLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("active");

//   // ── Helper: check if an expirydate (Firestore Timestamp or string) is past today ──
//   const isExpiredByDate = (expirydate) => {
//     if (!expirydate) return false;
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const expiry = expirydate?.seconds
//       ? new Date(expirydate.seconds * 1000)
//       : new Date(expirydate);
//     expiry.setHours(0, 0, 0, 0);
//     return expiry < today;
//   };

//   // Fetch both active and expired subscriptions
//   const fetchSubscriptions = useCallback(async () => {
//     try {
//       setSubLoading(true);
//       const user = getUser();
//       if (!user) return;
//       const mobileNo = user?.mobileNo;
//       if (!mobileNo) return;

//       // ── Active: Active=true, Expire=false ─────────────────────────────
//       const activeQuery = query(
//         collection(db, COLLECTIONS.SUBSCRIPTION),
//         where("mobileNo", "==", mobileNo),
//         where("Active", "==", true),
//         where("Expire", "==", false),
//       );

//       // ── Expired: Active=false, Expire=true ────────────────────────────
//       const expiredQuery = query(
//         collection(db, COLLECTIONS.SUBSCRIPTION),
//         where("mobileNo", "==", mobileNo),
//         where("Active", "==", false),
//         where("Expire", "==", true),
//       );

//       const [activeSnap, expiredSnap] = await Promise.all([
//         getDocs(activeQuery),
//         getDocs(expiredQuery),
//       ]);

//       const sortByDate = (arr) =>
//         arr.sort(
//           (a, b) => (b.PurchaseAt?.seconds ?? 0) - (a.PurchaseAt?.seconds ?? 0),
//         );

//       // ── Auto-expire: if expirydate < today, update Firestore and move to expired ──
//       const nowActive = [];
//       const autoExpired = [];

//       for (const d of activeSnap.docs) {
//         const data = { id: d.id, ...d.data() };
//         if (isExpiredByDate(data.expirydate)) {
//           autoExpired.push(data);
//           // Fire-and-forget Firestore update — don't block UI
//           updateDoc(doc(db, "subscription", d.id), {
//             Active: false,
//             Expire: true,
//           }).catch(() => undefined);
//         } else {
//           nowActive.push(data);
//         }
//       }

//       const expiredList = sortByDate([
//         ...autoExpired,
//         ...expiredSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
//       ]);
//       const activeList = sortByDate(nowActive);

//       setActiveSubscriptions(activeList);
//       setExpiredSubscriptions(expiredList);

//       // Auto-switch to expired tab if no active subs but has expired
//       if (activeList.length === 0 && expiredList.length > 0) {
//         setActiveTab("expired");
//       }
//     } catch (err) {
//     } finally {
//       setSubLoading(false);
//     }
//   }, []);

//   // Fetch available plans
//   const fetchPlans = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const raw = null; // legacy browser company cache removed
//       if (!raw) throw new Error("No company data found.");
//       const company = JSON.parse(raw);
//       if (!company?.id) throw new Error("Company ID not found.");
//       const docRef = doc(db, "mlmcomp", company.id);
//       const docSnap = await getDoc(docRef);
//       if (!docSnap.exists())
//         throw new Error("Company Doesnot Launch Any Plan Yet!.");
//       const data = docSnap.data();
//       const fetchedPlans = (data?.Plans ?? []).filter(
//         (p) => p.PlanName || p.image_url,
//       );

//       setPlans(fetchedPlans);
//     } catch (err) {
//       setError("Failed to load plans. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchSubscriptions();
//   }, [fetchSubscriptions]);

//   useEffect(() => {
//     if (!subLoading) {
//       fetchPlans();
//     }
//   }, [subLoading, fetchPlans]);

//   const handleSlideClick = (plan) => {
//     setSelectedPlan(plan);
//     setOpenPlanModal(true);
//   };

//   const handlePaymentSuccess = useCallback(() => {
//     setOpenCheckoutModal(false);
//     setOpenPlanModal(false);
//     fetchSubscriptions();
//   }, [fetchSubscriptions]);

//   const hasAnySub =
//     activeSubscriptions.length > 0 || expiredSubscriptions.length > 0;
//   const hasActiveSub = activeSubscriptions.length > 0;

//   if (subLoading) {
//     return (
//       <div className="w-full min-h-full bg-background p-4 md:p-8">
//         <div className="max-w-2xl mx-auto">
//           <SubSkeleton />
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full min-h-full bg-background p-4 md:p-8">
//       <div className="p-1 rounded-2xl text-center">
//         {/* <p className="text-muted-foreground">Plans Coming Soon! 🎉</p> */}
//         <img src={subcric} alt="Plans Coming Soon" />
//       </div>
//     </div>
//   );
// }
