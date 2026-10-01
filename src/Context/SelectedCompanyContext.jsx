import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "@firebase-config";
import { useAuth } from "../Auth/AuthContext";
import { COLLECTIONS } from "../collections";
import {
  clearCompanyScopedStorage,
  clearMlmProfileStorage,
  saveMlmProfileToStorage,
} from "../utils/companyStorage";
import { COMPANY_SELECTION_LOCKED_CODE } from "../utils/companyChangePolicy";
import {
  clearPendingCompanySelection,
  readPendingCompanySelection,
  savePendingCompanySelection,
} from "../utils/companySelectionStorage";
import {
  getVerifiedMlmProfile,
  invalidateVerifiedMlmProfileCache,
} from "../utils/mlmProfileVerification";
import { invalidateCompanyTemplateState } from "../utils/companyTemplateState";
import {
  getProfileCompanyIdentity,
  getSelectedCompanyIdentity,
  hasCompleteCompanyIdentity,
} from "../utils/mlmProfileCompanyIdentity";

const SelectedCompanyContext = createContext({
  selectedCompany: null,
  loading: true,
  selectCompany: async () => {},
  refreshCompany: async () => {},
  clearCompanySelection: async () => {},
  deleteProfileAndCompanySelection: async () => {},
});

async function readCompany(companyId, fallbackCompanyName = "") {
  if (!companyId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.MLMCOMP, companyId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() || {};
  const identity = getSelectedCompanyIdentity({
    ...data,
    // The Firestore document id must win over any stale/null `id` data field.
    id: snapshot.id,
    companyName: data.companyName || fallbackCompanyName,
  });
  return {
    ...data,
    id: identity.companyId,
    name: identity.companyName,
  };
}

async function repairMlmProfileCompanyIdentity(profile, company) {
  const profileId = String(profile?.id || "").trim();
  const companyIdentity = getSelectedCompanyIdentity(company);
  if (!profileId || !hasCompleteCompanyIdentity(companyIdentity)) {
    throw new Error("A valid MLM Profile and selected company are required.");
  }

  const patch = {
    companyId: companyIdentity.companyId,
    companyName: companyIdentity.companyName,
  };
  await updateDoc(doc(db, COLLECTIONS.MLMPROFILES, profileId), patch);

  const repairedProfile = { ...profile, ...patch, id: profileId };
  invalidateVerifiedMlmProfileCache();
  saveMlmProfileToStorage(repairedProfile);
  return repairedProfile;
}

export function SelectedCompanyProvider({ children }) {
  const { user, identity, loading: authLoading } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const selectionRequestVersionRef = useRef(0);
  const selectedCompanyIdRef = useRef("");

  const commitSelectedCompany = useCallback((company, reason) => {
    const previousCompanyId = selectedCompanyIdRef.current;
    const nextCompanyId = company?.id || "";

    if (previousCompanyId !== nextCompanyId) {
      // Home and All Templates are keep-alive pages. Invalidate their React
      // and service caches synchronously so the previous company's templates
      // cannot flash or be restored by an older in-flight request.
      invalidateCompanyTemplateState({
        previousCompanyId,
        nextCompanyId,
        reason,
      });
      selectedCompanyIdRef.current = nextCompanyId;
    }

    setSelectedCompany(company);
    return company;
  }, []);

  useEffect(() => {
    // Remove the old unscoped object. New pending selections contain only a
    // company id and are namespaced by the Firebase-verified UID.
    try { localStorage.removeItem("selectedCompany"); } catch {}
    try { sessionStorage.removeItem("selectedCompany"); } catch {}
  }, []);

  const loadSelection = useCallback(async () => {
    const requestVersion = ++selectionRequestVersionRef.current;
    if (!user) {
      if (requestVersion === selectionRequestVersionRef.current) {
        commitSelectedCompany(null, "signed-out");
        setLoading(false);
      }
      return null;
    }

    setLoading(true);
    try {
      // Profile details intentionally live in sessionStorage only, so closing
      // the app clears the browser copy. Rehydrate it from Firestore before
      // Home/Templates become interactive; otherwise an existing account is
      // incorrectly sent to the Update Profile page on its first template tap.
      let verifiedProfile = null;
      if (identity?.mobileNo) {
        // Reuse the shared 2-minute verified-profile cache/request coalescer.
        // Login and company bootstrap often run back-to-back for the same
        // mobile; this keeps Firestore as source of truth while avoiding the
        // duplicate query in that short transition.
        verifiedProfile = await getVerifiedMlmProfile(
          user.uid,
          identity.mobileNo,
        );
        if (verifiedProfile) {
          saveMlmProfileToStorage(verifiedProfile);
        } else {
          clearMlmProfileStorage();
        }
      }

      // A completed MLM profile is the server-backed source of truth. Before
      // the profile exists, keep the chosen public company id locally under
      // the verified UID. This avoids relying on an undeployed Firestore
      // collection while still surviving refreshes and app restarts.
      let profileCompanyIdentity = getProfileCompanyIdentity(verifiedProfile);
      const profileCompanyId = profileCompanyIdentity.companyId || null;
      const pendingCompanyId = readPendingCompanySelection(user.uid);
      const companyId =
        profileCompanyId || pendingCompanyId;

      const company = await readCompany(
        companyId,
        profileCompanyIdentity.companyName,
      );
      if (
        verifiedProfile &&
        company &&
        !hasCompleteCompanyIdentity(profileCompanyIdentity)
      ) {
        verifiedProfile = await repairMlmProfileCompanyIdentity(
          verifiedProfile,
          company,
        );
        profileCompanyIdentity = getProfileCompanyIdentity(verifiedProfile);
      }
      if (hasCompleteCompanyIdentity(profileCompanyIdentity)) {
        clearPendingCompanySelection(user.uid);
      }
      if (!company && companyId && !profileCompanyId) {
        clearPendingCompanySelection(user.uid);
      }
      if (requestVersion === selectionRequestVersionRef.current) {
        commitSelectedCompany(company, "company-loaded");
      }
      return company;
    } catch (error) {
      if (requestVersion === selectionRequestVersionRef.current) {
        commitSelectedCompany(null, "company-load-failed");
      }
      throw error;
    } finally {
      if (requestVersion === selectionRequestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [commitSelectedCompany, identity?.mobileNo, user]);

  useEffect(() => {
    if (authLoading) return;
    loadSelection().catch(() => {});
  }, [authLoading, loadSelection]);

  const selectCompany = useCallback(
    async (company) => {
      const companyIdentity = getSelectedCompanyIdentity(company);
      if (!user?.uid || !hasCompleteCompanyIdentity(companyIdentity)) {
        throw new Error("Authenticated user and company are required.");
      }

      if (!identity?.mobileNo) {
        throw new Error("Verified mobile number is required.");
      }

      const verifiedProfile = await getVerifiedMlmProfile(
        user.uid,
        identity.mobileNo,
      );
      if (verifiedProfile) {
        const profileCompanyIdentity = getProfileCompanyIdentity(verifiedProfile);
        if (!hasCompleteCompanyIdentity(profileCompanyIdentity)) {
          const normalizedCompany = {
            ...company,
            id: companyIdentity.companyId,
            name: companyIdentity.companyName,
          };
          await repairMlmProfileCompanyIdentity(
            verifiedProfile,
            normalizedCompany,
          );
          clearPendingCompanySelection(user.uid);
          selectionRequestVersionRef.current += 1;
          return commitSelectedCompany(
            normalizedCompany,
            "profile-company-repaired",
          );
        }

        saveMlmProfileToStorage(verifiedProfile);
        clearPendingCompanySelection(user.uid);

        const error = new Error(
          "Company cannot be changed after MLM Profile creation.",
        );
        error.code = COMPANY_SELECTION_LOCKED_CODE;
        throw error;
      }

      const normalizedCompany = {
        ...company,
        id: companyIdentity.companyId,
        name: companyIdentity.companyName,
      };
      const previousCompanyId = selectedCompanyIdRef.current;
      if (previousCompanyId && previousCompanyId !== normalizedCompany.id) {
        // Discard company-specific drafts before switching an unfinished
        // profile to another company.
        clearCompanyScopedStorage();
      }

      // The company object came from the freshly loaded Firestore directory.
      // Save only its public id; the full document is re-read on app startup.
      savePendingCompanySelection(user.uid, normalizedCompany.id);
      selectionRequestVersionRef.current += 1;
      return commitSelectedCompany(normalizedCompany, "company-selected");
    },
    [commitSelectedCompany, identity?.mobileNo, user],
  );

  const clearCompanySelection = useCallback(async () => {
    if (!user?.uid) throw new Error("Authenticated user is required.");
    clearPendingCompanySelection(user.uid);
    selectionRequestVersionRef.current += 1;
    commitSelectedCompany(null, "company-selection-cleared");
  }, [commitSelectedCompany, user]);

  const deleteProfileAndCompanySelection = useCallback(
    async (profileId) => {
      if (!user?.uid) throw new Error("Authenticated user is required.");
      if (!profileId) throw new Error("MLM profile is required.");

      await deleteDoc(doc(db, COLLECTIONS.MLMPROFILES, profileId));

      // Keep the authenticated Firebase session, but remove every draft/cache
      // tied to the deleted company before Select Company can render.
      clearPendingCompanySelection(user.uid);
      selectionRequestVersionRef.current += 1;
      invalidateVerifiedMlmProfileCache();
      clearCompanyScopedStorage();
      commitSelectedCompany(null, "mlm-profile-deleted");
      // If a company refresh was still in flight, invalidating its request means
      // its finally block can no longer clear this flag. Release the route guard
      // here so Select Company never remains on a blank loading screen.
      setLoading(false);
    },
    [commitSelectedCompany, user],
  );

  const value = useMemo(
    () => ({
      selectedCompany,
      loading: authLoading || loading,
      selectCompany,
      clearCompanySelection,
      deleteProfileAndCompanySelection,
      refreshCompany: loadSelection,
    }),
    [
      authLoading,
      clearCompanySelection,
      deleteProfileAndCompanySelection,
      loadSelection,
      loading,
      selectCompany,
      selectedCompany,
    ],
  );

  return (
    <SelectedCompanyContext.Provider value={value}>
      {children}
    </SelectedCompanyContext.Provider>
  );
}

export function useSelectedCompany() {
  return useContext(SelectedCompanyContext);
}
