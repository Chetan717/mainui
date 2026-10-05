# MLMLIVE — Calling Team Referral Integration

This MLMLIVE app is integrated with the Marketing Panel Calling Team feature.

## Signup flow

When a user enters a normal referral/coupon code, the existing signup flow continues unchanged.

When the entered code belongs to a Marketing Member's Calling Team:

1. MLMLIVE calls `resolveCallingTeamCode` in `asia-south1`.
2. The resolver returns the owning Marketing Member's real `mainReferCode` and `mainCouponCode`, plus a short-lived mobile-bound claim token.
3. Existing `authSignupInit` still runs in `us-central1`, but receives the **main Marketing referral code**, not the Calling Team tracking code.
4. After OTP verification creates and signs in the user, MLMLIVE calls `claimCallingTeamAttribution` with the one-time claim token.
5. The server sets:
   - `referredByMteam` = main Marketing Member ID
   - `referredBy` = main Marketing referral code
   - `mteamCouponCode` = main Marketing coupon code
   - `callingTeamId` = Calling Team member ID
   - `callingTeamCode` = tracking code used at signup

## Commission rule

The Calling Team tracking code never becomes `mteamCouponCode` and never becomes the subscription `couponApplied` value.

The existing checkout reads `users.mteamCouponCode`, so paid subscription coupon/commission continues to use the main Marketing Member coupon only.

## Function regions

- Existing app auth functions: `us-central1`
- Marketing/Calling Team functions: `asia-south1`

Do not move the existing app auth functions to another region.

## Required deployment

The existing MLMLIVE auth functions are **not changed** and do not need to be redeployed from this app package.

The Marketing project must deploy the new Calling Team callables because the app now depends on:

- `resolveCallingTeamCode`
- `claimCallingTeamAttribution`

Use the Marketing package's `CALLING_TEAM_DEPLOY_STEPS.txt` and deploy the named Calling Team functions only. Then deploy the updated MLMLIVE frontend/app build.
