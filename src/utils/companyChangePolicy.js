export const COMPANY_CHANGE_MODE = "change";
export const COMPANY_SELECTION_LOCKED_CODE =
  "MLM_PROFILE_COMPANY_LOCKED";

export function isCompanyChangeRequest(search = "") {
  return new URLSearchParams(search).get("mode") === COMPANY_CHANGE_MODE;
}

export function getCompanySelectionDestination(search = "") {
  return isCompanyChangeRequest(search) ? "/mlmprofile" : "/";
}

export function canChangeCompanyBeforeProfile({
  profileLookupState,
  existingDocId,
} = {}) {
  return profileLookupState === "missing" && !existingDocId;
}
