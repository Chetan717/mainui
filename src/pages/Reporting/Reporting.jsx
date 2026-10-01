import { useState, useEffect } from "react";
import { db } from "../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSearchParams } from "react-router";
import CreateProfile from "./CreateProfile";
import UnifiedView from "./UnifiedView";
import { BarChart3 } from "lucide-react";
import { COLLECTIONS } from "../../collections";
import { getUser } from "../../utils/authStorage";

export default function Reporting() {
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);
  const [userMobile, setUserMobile] = useState("");
  const [userName, setUserName] = useState("");
  const [searchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    const user = getUser();
    if (!user) { setStatus("no-user"); return; }
    const mobile = user.mobileNo || user.mobile || "";
    const name = user.name || "";
    setUserMobile(mobile);
    setUserName(name);
    if (!mobile) { setStatus("no-user"); return; }

    getDocs(query(collection(db, COLLECTIONS.REPORTINGUSER), where("userMobile", "==", mobile)))
      .then((snap) => {
        if (snap.empty) {
          localStorage.removeItem("reportingProfile");
          setStatus("no-profile");
        } else {
          const docSnap = snap.docs[0];
          const p = { id: docSnap.id, ...docSnap.data() };
          localStorage.setItem("reportingProfile", JSON.stringify(p));
          setProfile(p);
          setStatus("has-profile");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  // if (status === "loading") {
  //   return (
  //     <div className="flex h-[60vh] items-center justify-center">
  //       <div className="flex flex-col items-center gap-3">
  //         <div className="w-10 h-10 border-3 border-border border-t-accent rounded-full animate-spin" />
  //         <p className="text-[13px] text-muted-foreground">Loading reporting...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // if (status === "error") {
  //   return (
  //     <div className="flex h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
  //       <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
  //         <BarChart3 className="w-7 h-7 text-red-500" />
  //       </div>
  //       <p className="text-[15px] font-bold text-foreground">Failed to load</p>
  //       <p className="text-[12px] text-muted-foreground">Please check your connection and try again.</p>
  //       <button onClick={() => window.location.reload()}
  //         className="px-5 py-2 rounded-xl text-white text-[13px] font-bold"
  //         style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
  //         Retry
  //       </button>
  //     </div>
  //   );
  // }

  // if (status === "no-user") {
  //   return (
  //     <div className="flex h-[60vh] flex-col items-center justify-center px-6 text-center">
  //       <p className="text-[15px] font-bold text-foreground">Not logged in</p>
  //       <p className="text-[12px] text-muted-foreground mt-1">Please log in to access reporting.</p>
  //     </div>
  //   );
  // }

  // if (status === "no-profile") {
  //   return (
  //     <CreateProfile
  //       userMobile={userMobile}
  //       userName={userName}
  //       onProfileCreated={(newProfile) => {
  //         setProfile(newProfile);
  //         setStatus("has-profile");
  //       }}
  //     />
  //   );
  // }

  // if (status === "has-profile" && profile) {
  //   return <UnifiedView profile={profile} activeTab={activeTab} />;
  // }

  // return null;
  return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {/* <div className="w-10 h-10 border-3 border-border border-t-accent rounded-full animate-spin" /> */}
          <p className="text-[13px] text-muted-foreground">Reporting Feature Is Coming Soon ...</p>
        </div>
      </div>
    );
}
