# Firebase profile photo canvas compatibility fix

## What was wrong
During the R2 transition, legacy Firestore `mlmprofiles/...` Firebase download URLs were being rewritten to the second R2 bucket in browser/session storage before the Firestore cutover was completed. If that object had not been resynced to R2 yet, the editor/canvas received a missing R2 URL and the old profile photo disappeared.

## What changed
- Legacy Firebase profile URLs are preserved exactly as stored in Firestore during dual-storage mode.
- New profile uploads keep using the public profile R2 bucket.
- Existing R2 profile URLs remain R2 URLs.
- No change to new R2 profile upload/delete functions.
- After the profile-only Firestore URL migration, the same app automatically receives R2 URLs, so no second canvas patch is required.

## Recommended rollout order
1. Deploy this Web App.
2. Run the `mlmprofiles/` storage resync to the profile R2 bucket.
3. Verify old Firebase profile photos and new R2 profile photos both render inside the editor/canvas.
4. Run the profile-only Firestore URL migration.
5. Verify again; after migration all profile URLs should be R2.

If an already-open browser tab was running the previous build, close/reopen the tab (or hard refresh) so its session profile is loaded again.
