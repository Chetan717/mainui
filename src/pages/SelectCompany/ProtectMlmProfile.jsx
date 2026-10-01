import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../Auth/AuthContext";
import { getUser } from "../../utils/authStorage";
import {
  getMlmProfileFromStorage,
  hasMlmProfileInStorage,
  saveMlmProfileToStorage,
} from "../../utils/companyStorage";
import { getVerifiedMlmProfile } from "../../utils/mlmProfileVerification";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";
import {
  getProfileCompanyIdentity,
  hasCompleteCompanyIdentity,
} from "../../utils/mlmProfileCompanyIdentity";

export default function ProtectMlmProfile({ children, requireProfile = false }) {
  const { user, loading } = useAuth();
  const { selectedCompany, loading: companyLoading } = useSelectedCompany();
  const [serverProfileState, setServerProfileState] = useState(
    requireProfile ? "checking" : "not-required",
  );
  const storedProfile = getMlmProfileFromStorage();
  const hasMlmProfile = hasMlmProfileInStorage();
  const needsCompanyRepair =
    hasMlmProfile &&
    !hasCompleteCompanyIdentity(getProfileCompanyIdentity(storedProfile));

  useEffect(() => {
    if (!requireProfile || loading || !user) return;
    let cancelled = false;

    const verifyProfile = async () => {
      const mobile = getUser()?.mobileNo;
      if (!mobile) {
        if (!cancelled) setServerProfileState("missing");
        return;
      }

      try {
        const profile = await getVerifiedMlmProfile(user.uid, mobile);
        if (cancelled) return;
        if (!profile) {
          setServerProfileState("missing");
          return;
        }
        saveMlmProfileToStorage(profile);
        setServerProfileState(
          hasCompleteCompanyIdentity(getProfileCompanyIdentity(profile))
            ? "verified"
            : "company-repair-required",
        );
      } catch (error) {
        
        if (!cancelled) setServerProfileState("error");
      }
    };

    verifyProfile();
    return () => { cancelled = true; };
  }, [loading, requireProfile, user]);

  if (loading || companyLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireProfile && serverProfileState === "checking") return null;
  if (
    (requireProfile && serverProfileState === "company-repair-required") ||
    (!requireProfile && needsCompanyRepair)
  ) {
    return <Navigate to="/selectcomp" replace />;
  }
  if (requireProfile && serverProfileState === "verified") return children;
  if (requireProfile && serverProfileState === "error") {
    return <Navigate to="/" replace />;
  }
  if (requireProfile && serverProfileState === "missing") {
    return selectedCompany
      ? <Navigate to="/mlmprofile" replace />
      : <Navigate to="/selectcomp" replace />;
  }
  if (hasMlmProfile) return children;
  if (selectedCompany && !requireProfile) return children;
  if (selectedCompany) return <Navigate to="/mlmprofile" replace />;

  return <Navigate to="/selectcomp" replace />;
}
