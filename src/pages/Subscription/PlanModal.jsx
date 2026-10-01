import React from "react";
import { Modal, Chip } from "@heroui/react";
import { X, Calendar, Clock, Download, CreditCard, IndianRupee, Zap } from "lucide-react";

export function PlanModal({ plan, openA, setOpenA, onProceedToCheckout }) {
  if (!plan) return null;

  const today = new Date();
  const formatDate = (date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + (plan.Day_value ?? 0));

  const stats = [
    { label: "Duration", value: plan.Day_value ? `${plan.Day_value} Days` : "—", Icon: Clock },
    { label: "Downloads", value: plan.downloads ?? 0, Icon: Download },
    { label: "Type", value: plan.Type || "—", Icon: Zap },
    { label: "Amount", value: `₹${plan.PlanAmount ?? 0}`, Icon: IndianRupee },
  ];

  return (
    <Modal isOpen={openA}>
      <Modal.Backdrop className="bg-black/60 backdrop-blur-sm">
        <Modal.Container placement="center" className="px-4">
          <Modal.Dialog className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] bg-background border border-border shadow-2xl">

            {/* Header with gradient */}
            <div className="relative bg-accent p-6 pb-8 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a8f] to-[#0a1744]" />
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        plan.Launch
                          ? "bg-green-500/20 text-green-300 border-green-400/30"
                          : "bg-red-500/20 text-red-300 border-red-400/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${plan.Launch ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                        {plan.Launch ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h2 className="text-white font-display font-bold text-xl leading-tight">
                      {plan.PlanName || "Unnamed Plan"}
                    </h2>
                  </div>

                  <button
                    onClick={() => setOpenA(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {plan.Description && (
                  <p className="text-white/70 text-sm leading-relaxed border-l-2 border-white/30 pl-3">
                    {plan.Description}
                  </p>
                )}
              </div>

              {/* Curved bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-background rounded-t-[20px]" />
            </div>

            {/* Stats grid */}
            <div className="px-6 pt-2 pb-4">
              <div className="grid grid-cols-2 gap-3 mb-5">
                {stats.map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl p-4 bg-muted/40 dark:bg-black/20 border border-border"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {label}
                      </p>
                    </div>
                    <p className="font-display font-bold text-base text-foreground leading-none">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Timeline card */}
              <div className="rounded-2xl overflow-hidden border border-border bg-background mb-5">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-accent">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <p className="text-xs font-bold text-white uppercase tracking-wide">
                    If Purchased Today
                  </p>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Starts</p>
                    <p className="text-sm font-bold text-foreground">{formatDate(today)}</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-1.5 px-3">
                    <div className="w-full flex items-center gap-1">
                      <div className="flex-1 h-px bg-border" />
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <span className="text-[10px] text-accent font-bold whitespace-nowrap">
                      {plan.Day_value ?? 0} Days
                    </span>
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Expires</p>
                    <p className="text-sm font-bold text-danger">{formatDate(expiryDate)}</p>
                  </div>
                </div>
              </div>

              {/* Price + CTA */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-accent/5 border border-accent/15 rounded-2xl px-3 py-2.5 shrink-0">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Total</p>
                  <p className="text-lg font-display font-bold text-accent leading-none whitespace-nowrap">
                    ₹{plan.PlanAmount ?? 0}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setOpenA(false);
                    if (onProceedToCheckout) onProceedToCheckout();
                  }}
                  className="flex-1 min-w-0 h-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-xs shadow-lg shadow-accent/25 transition-all duration-200 flex items-center justify-center gap-1.5 px-2"
                >
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Subscribe Now</span>
                </button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
