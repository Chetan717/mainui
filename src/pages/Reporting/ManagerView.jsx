import { useState, useEffect } from "react";
import { db } from "../../Firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import ProfileCard from "./components/ProfileCard";
import ApproveMembers from "./components/ApproveMembers";
import TeamReportView from "./components/TeamReportView";
import ReportGraph from "./components/ReportGraph";
import MemberGraph from "./components/MemberGraph";
import MemberReportView from "./components/MemberReportView";
import AddPlan from "./components/AddPlan";
import AddFollowUp from "./components/AddFollowUp";
import AddKitBook from "./components/AddKitBook";
import AddSPClosed from "./components/AddSPClosed";
import AddNAC from "./components/AddNAC";
import AddNextDayPlan from "./components/AddNextDayPlan";
import { LayoutDashboard, PlusCircle, Eye, ClipboardList, Users, UserCheck, X } from "lucide-react";
import AddGuest from "./components/AddGuest";
import ViewGuestList from "./components/ViewGuestList";
import TeamWeeklyReport from "./components/TeamWeeklyReport";

const WORK_COLLECTIONS = [
  { key: "plan",   col: "reportplan",     label: "Plan" },
  { key: "follow", col: "reportfollowup", label: "Follow Up" },
  { key: "kit",    col: "reportkitbook",  label: "Kit Book" },
  { key: "sp",     col: "reportsp",       label: "SP Closed" },
  { key: "nac",    col: "reportnac",      label: "NAC" },
];

function TodayCountBadge({ memberId, collectionName }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!memberId) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    getDocs(
      query(
        collection(db, collectionName),
        where("memberId", "==", memberId)
      )
    ).then((snap) => {
      let cnt = 0;
      snap.docs.forEach((d) => {
        const raw = d.data().date;
        const dt = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
        if (dt && dt >= start && dt <= end) cnt++;
      });
      setCount(cnt);
    }).catch(() => setCount(0));
  }, [memberId, collectionName]);

  if (count === null) return <span className="text-[10px] text-muted-foreground">...</span>;
  return (
    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
      {count}
    </span>
  );
}

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: "rgba(14,36,92,0.08)" }}>
        <ClipboardList className="w-7 h-7 text-accent" />
      </div>
      <p className="text-[14px] font-bold text-foreground mb-1">{label}</p>
      <p className="text-[12px] text-muted-foreground">This section is coming soon.</p>
    </div>
  );
}

export default function ManagerView({ profile, activeTab }) {
  const [viewWorkPopup, setViewWorkPopup] = useState(false);
  const [viewWorkChoice, setViewWorkChoice] = useState(null);

  const selfProfile = { ...profile, memberId: profile.managerId };

  useEffect(() => {
    if (activeTab !== "view-work") {
      setViewWorkChoice(null);
    }
  }, [activeTab]);

  if (activeTab === "dashboard") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <ProfileCard profile={profile} />
        <MemberGraph memberProfile={selfProfile} />
        <ReportGraph managerProfile={profile} />
        <ApproveMembers managerProfile={profile} />
      </div>
    );
  }

  if (activeTab === "add-work") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
              <PlusCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[14px] leading-tight">Add Work Reporting</p>
              <p className="text-[10px] text-muted-foreground">Add your daily work activity below</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add Plan</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportplan" />
          </div>
          <AddPlan memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add Follow Up</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportfollowup" />
          </div>
          <AddFollowUp memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add Kit Book</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportkitbook" />
          </div>
          <AddKitBook memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">SP Closed</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportsp" />
          </div>
          <AddSPClosed memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">NAC</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportnac" />
          </div>
          <AddNAC memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Next Day Plan</p>
          </div>
          <AddNextDayPlan memberProfile={selfProfile} />
        </div>
      </div>
    );
  }

  if (activeTab === "view-work") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <MemberReportView memberProfile={selfProfile} />
      </div>
    );
  }

  if (activeTab === "add-patient") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ComingSoon label="Add Patient Reporting" />
    </div>
  );

  if (activeTab === "add-guest") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <AddGuest memberProfile={selfProfile} />
    </div>
  );

  if (activeTab === "view-patient") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ComingSoon label="View Patient Reporting" />
    </div>
  );

  if (activeTab === "view-guest-list") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ViewGuestList memberProfile={selfProfile} />
    </div>
  );

  if (activeTab === "view-team") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      
    </div>
  );

  if (activeTab === "team-weekly") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <TeamWeeklyReport managerProfile={selfProfile} />
    </div>
  );

  return null;
}
