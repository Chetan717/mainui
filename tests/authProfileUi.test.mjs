import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  DEFAULT_COUPON_CODE,
  createPlayStoreReferralLink,
  getReferralCodeFromBridgeMessage,
  getReferralCodeFromInstallReferrer,
  getReferralCodeFromSearch,
  getInitialSignupCouponCode,
  getSignupCouponCode,
} from "../src/utils/referralCode.js";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("signup coupon defaults to editable MLM100 while preserving entered codes", () => {
  assert.equal(DEFAULT_COUPON_CODE, "MLM100");
  assert.equal(getSignupCouponCode(""), "MLM100");
  assert.equal(getSignupCouponCode("  team-42  "), "TEAM-42");
  assert.equal(
    getInitialSignupCouponCode({ pendingCode: "MLM300" }),
    "MLM300",
    "a non-empty Play referral must never be mistaken for the default",
  );
  assert.equal(
    getInitialSignupCouponCode({
      pendingCode: "MLM300",
      pendingSource: "manual",
    }),
    "MLM300",
    "an explicitly entered coupon must be preserved",
  );
  assert.equal(
    getInitialSignupCouponCode({
      queryCode: "team-7",
      pendingCode: "MLM300",
    }),
    "TEAM-7",
    "a referral link must keep priority over the default",
  );

  const signup = read("src/Auth/Signup.jsx");
  assert.match(
    signup,
    /getInitialSignupCouponCode\(\{[\s\S]*?queryCode,[\s\S]*?pendingCode: getPendingReferralCode\(\)/,
  );
  assert.match(signup, /const couponCode = getSignupCouponCode\(referInput\)/);

  const couponInput =
    signup.match(
      /<input[\s\S]*?aria-label="Coupon Code \/ कूपन कोड"[\s\S]*?\/>/,
    )?.[0] || "";
  assert.ok(couponInput, "coupon input was not found");
  assert.doesNotMatch(couponInput, /\bdisabled\b|\breadOnly\b/);
});

test("Play Store install-referrer MLM300 reaches the signup coupon field", () => {
  const playLink =
    "https://play.google.com/store/apps/details?id=com.mlmbooster.mlmbooster&referrer=ref%3DMLM300";

  assert.equal(
    getReferralCodeFromSearch(new URL(playLink).search),
    "MLM300",
  );
  assert.equal(getReferralCodeFromInstallReferrer("ref=MLM300"), "MLM300");
  assert.equal(
    getReferralCodeFromInstallReferrer("ref%3Dteam-42"),
    "TEAM-42",
  );
  assert.equal(
    getReferralCodeFromBridgeMessage({
      type: "INSTALL_REFERRER",
      referrer: "ref=MLM300",
    }),
    "MLM300",
  );
  assert.equal(
    getReferralCodeFromBridgeMessage(
      JSON.stringify({
        type: "PLAY_INSTALL_REFERRER",
        data: { installReferrer: "ref%3DMLM300" },
      }),
    ),
    "MLM300",
  );
  assert.equal(
    getReferralCodeFromBridgeMessage({
      type: "INSTALL_REFERRER_RESPONSE",
      code: "ref=MLM300",
    }),
    "MLM300",
  );
  assert.equal(getReferralCodeFromBridgeMessage("ref=MLM300"), "MLM300");

  const generatedLink = new URL(createPlayStoreReferralLink("MLM300"));
  assert.equal(generatedLink.searchParams.get("referrer"), "ref=MLM300");

  const main = read("src/main.tsx");
  const index = read("index.html");
  assert.match(main, /installGlobalReferralCapture\(\)/);
  assert.match(index, /__MLMLIVE_EARLY_BRIDGE_MESSAGES__/);
});

test("login and registration use one bilingual password field", () => {
  const login = read("src/Auth/Login.jsx");
  const signup = read("src/Auth/Signup.jsx");

  assert.match(
    login,
    /Enter Your Password \/ अपना पासवर्ड दर्ज करें/,
  );
  assert.match(login, /<input[\s\S]{0,180}name="pin"/);
  assert.doesNotMatch(login, /InputOTP/);

  assert.match(signup, /Full Name \/ पूरा नाम/);
  assert.match(signup, /Mobile Number \/ मोबाइल नंबर/);
  assert.match(signup, /Add Your Password \/ अपना पासवर्ड जोड़ें/);
  assert.match(signup, /<input[\s\S]{0,180}name="pin"/);
  assert.doesNotMatch(signup, /<InputOTP\s+name="pin"/);
  assert.match(signup, /Enter 4-Digit OTP \/ 4 अंकों का OTP दर्ज करें/);
});

test("login and registration password fields have accessible show-hide buttons", () => {
  for (const file of ["src/Auth/Login.jsx", "src/Auth/Signup.jsx"]) {
    const source = read(file);

    assert.match(source, /import \{ Eye, EyeOff \} from "lucide-react"/);
    assert.match(source, /const \[showPassword, setShowPassword\] = useState\(false\)/);
    assert.match(source, /type=\{showPassword \? "text" : "password"\}/);
    assert.match(source, /type="button"[\s\S]{0,180}aria-label=\{/);
    assert.match(source, /Show password \/ पासवर्ड दिखाएं/);
    assert.match(source, /Hide password \/ पासवर्ड छिपाएं/);
    assert.match(source, /aria-pressed=\{showPassword\}/);
    assert.match(source, /onClick=\{\(\) => setShowPassword\(\(visible\) => !visible\)\}/);
    assert.match(source, /<EyeOff aria-hidden="true"/);
    assert.match(source, /<Eye aria-hidden="true"/);
  }
});

test("MLM Profile opens a rank modal with manual entry above a scrollable rank list", () => {
  const profile = read("src/pages/Form/Mlmprofilemodal.jsx");

  assert.match(profile, /Select Rank \/ रैंक चुनें/);
  assert.match(
    profile,
    /aria-haspopup="dialog"[\s\S]{0,160}aria-controls="mlm-rank-picker"/,
  );

  const modalStart = profile.indexOf('id="mlm-rank-picker"');
  const modalEnd = profile.indexOf("{/* Delete Confirmation Modal */}", modalStart);
  const rankPanel = profile.slice(modalStart, modalEnd);
  assert.ok(modalStart >= 0 && modalEnd > modalStart, "rank picker modal was not found");
  assert.match(rankPanel, /role="dialog"/);
  assert.match(rankPanel, /aria-modal="true"/);
  assert.ok(
    rankPanel.indexOf('id="manual-rank"') <
      rankPanel.indexOf("designations.map"),
    "manual rank input must appear before the company rank list",
  );
  assert.match(rankPanel, /Use Manual Rank \/ मैन्युअल रैंक चुनें/);
  assert.match(rankPanel, /max-h-\[48dvh\][^"\n]*overflow-y-auto/);
  assert.doesNotMatch(profile, /Enter designation manually/);
  assert.match(
    profile,
    /Add Top Upline\/Seniors Image \/ टॉप अपलाइन\/सीनियर्स की इमेज जोड़ें/,
  );
  assert.match(
    profile,
    /Add Profile Photo \/ प्रोफाइल फोटो जोड़ें/,
  );
});

test("both profile upload strips are full-area click targets and mobile styling matches", () => {
  const profile = read("src/pages/Form/Mlmprofilemodal.jsx");
  const topUplinePicker = read("src/pages/Form/MultiImagePicker.jsx");

  const mobileInput =
    profile.match(/value=\{`\+91 \$\{userMobile\}`\}[\s\S]*?\/>/)?.[0] || "";
  assert.ok(mobileInput, "read-only account mobile input was not found");
  assert.match(mobileInput, /bg-background/);
  assert.doesNotMatch(mobileInput, /bg-muted\/20/);

  assert.match(
    profile,
    /role="button"[\s\S]{0,220}aria-label="Add Profile Photo \/ प्रोफाइल फोटो जोड़ें"/,
  );
  assert.match(
    profile,
    /onClick=\{\(\) => \{[\s\S]{0,120}profileInputRef\.current\?\.click\(\)/,
  );

  assert.match(
    topUplinePicker,
    /role="button"[\s\S]{0,260}aria-label="Add Top Upline or Seniors Image \/ टॉप अपलाइन या सीनियर्स की इमेज जोड़ें"/,
  );
  assert.match(
    topUplinePicker,
    /onClick=\{\(\) => \{[\s\S]{0,100}handleOpen\(\)/,
  );
});
