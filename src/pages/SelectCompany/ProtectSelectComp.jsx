import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../Auth/AuthContext";
import {
  getMlmProfileFromStorage,
  hasMlmProfileInStorage,
  saveMlmProfileToStorage,
} from "../../utils/companyStorage";
import { isCompanyChangeRequest } from "../../utils/companyChangePolicy";
import { getVerifiedMlmProfile } from "../../utils/mlmProfileVerification";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";
import {
  getProfileCompanyIdentity,
  hasCompleteCompanyIdentity,
} from "../../utils/mlmProfileCompanyIdentity";
import { isProfileDeletedNavigation } from "../../utils/profileDeletionNavigation";

export default function ProtectSelectComp({ children }) {
  const location = useLocation();
  const { user, identity, loading } = useAuth();
  const { selectedCompany, loading: companyLoading } = useSelectedCompany();
  const storedProfile = getMlmProfileFromStorage();
  const hasMlmProfile = hasMlmProfileInStorage();
  const needsCompanyRepair =
    hasMlmProfile &&
    !hasCompleteCompanyIdentity(getProfileCompanyIdentity(storedProfile));
  const isChangeRequest = isCompanyChangeRequest(location.search);
  const isPostDeleteSelection = isProfileDeletedNavigation(location.state);
  const [changeAccess, setChangeAccess] = useState("idle");

  useEffect(() => {
    if (!isChangeRequest) {
      setChangeAccess("idle");
      return;
    }
    if (loading || companyLoading || !user) return;

    if (hasMlmProfile) {
      setChangeAccess("locked");
      return;
    }

    const mobile = identity?.mobileNo;
    if (!mobile) {
      setChangeAccess("locked");
      return;
    }

    let cancelled = false;
    setChangeAccess("checking");

    getVerifiedMlmProfile(user.uid, mobile)
      .then((profile) => {
        if (cancelled) return;
        if (profile) {
          saveMlmProfileToStorage(profile);
          setChangeAccess("locked");
        } else {
          setChangeAccess("allowed");
        }
      })
      .catch(() => {
        // A failed verification must never unlock company changes.
        if (!cancelled) setChangeAccess("locked");
      });

    return () => {
      cancelled = true;
    };
  }, [
    companyLoading,
    hasMlmProfile,
    identity?.mobileNo,
    isChangeRequest,
    loading,
    user,
  ]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Profile deletion already cleared the company/profile state before this
  // navigation is issued. Do not let a stale company bootstrap/loading render
  // hide Select Company during that transition, otherwise the route can appear
  // completely blank until another navigation happens.
  if (isPostDeleteSelection) return children;

  if (companyLoading) return null;

  if (isChangeRequest) {
    if (hasMlmProfile || changeAccess === "locked") {
      return <Navigate to="/mlmprofile" replace />;
    }
    if (changeAccess !== "allowed") return null;
    return children;
  }

  // A legacy/corrupt profile is allowed through only for a one-time company
  // identity repair. This is separate from the normal company-change mode,
  // which stays locked for every existing MLM Profile.
  if (needsCompanyRepair) return children;

  if (hasMlmProfile || selectedCompany) {
    return <Navigate to="/" replace />;
  }

  return children;
}
