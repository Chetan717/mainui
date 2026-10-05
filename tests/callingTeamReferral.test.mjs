import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  getSignupCouponCode,
  normalizeReferralCode,
} from "../src/utils/referralCode.js";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("Calling Team tracking codes support up to 12 characters", () => {
  assert.equal(normalizeReferralCode(" caller_12345 "), "CALLER_12345");
  assert.equal(getSignupCouponCode("call-team-12"), "CALL-TEAM-12");
});

test("signup resolves Calling Team code to main Marketing ownership and claims it after OTP", () => {
  const signup = read("src/Auth/Signup.jsx");
  const service = read("src/services/callingReferralService.js");

  assert.match(service, /VITE_MARKETING_FUNCTIONS_REGION \|\| "asia-south1"/);
  assert.match(service, /"resolveCallingTeamCode"/);
  assert.match(service, /"claimCallingTeamAttribution"/);

  assert.match(signup, /resolveCallingTeamReferral\(\s*couponCode,\s*data\.mobile/);
  assert.match(signup, /callingReferral\.mainReferCode/);
  assert.match(signup, /signupInit\([\s\S]*?signupReferCode/);
  assert.match(signup, /claimCallingTeamAttribution\(claimToken\)/);
  assert.match(signup, /mteamCouponCode:\s*attribution\.mainCouponCode/);
  assert.match(signup, /callingTeamId:\s*attribution\.callingTeamId/);
  assert.match(signup, /callingTeamCode:\s*attribution\.callingTeamCode/);
});

test("verified app session retries a pending Calling Team attribution without touching auth function region", () => {
  const authContext = read("src/Auth/AuthContext.jsx");
  const authService = read("src/services/authService.js");

  assert.match(authContext, /getPendingReferralCode\(\)/);
  assert.match(authContext, /resolveCallingTeamReferral\([\s\S]*?identity\.mobileNo/);
  assert.match(authContext, /claimCallingTeamAttribution/);
  assert.match(authService, /getFunctions\(app, "us-central1"\)/);
});
