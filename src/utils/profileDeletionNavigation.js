const PROFILE_DELETED_STATE_KEY = "mlmProfileDeleted";

export function createProfileDeletedNavigationState() {
  return { [PROFILE_DELETED_STATE_KEY]: true };
}

export function isProfileDeletedNavigation(state) {
  return state?.[PROFILE_DELETED_STATE_KEY] === true;
}
