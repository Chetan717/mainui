# MLM LIVE Template CDN + Cloudflare R2 deployment

This patch is migration-safe:

- Existing Firestore template documents stay unchanged.
- Existing Firebase Storage URLs stay unchanged and keep loading normally.
- Only **new/replaced template media** uploaded from Add/Edit Template goes to R2.
- Public web-app template lists are **CDN JSON first** with Firestore fallback.
- After the one-time catalog bootstrap, normal template Add/Edit/Delete updates the R2 JSON incrementally instead of making user devices query Firestore.
- Catalog publishing is serialized with a short Firestore lock so bulk/copy operations cannot overwrite each other's CDN JSON updates.
- A full template-collection reference check runs only when an R2 media URL is actually replaced/deleted, to avoid deleting a file still reused by a copied template. Normal metadata writes do not perform that scan.
- Non-template Admin uploads still use Firebase Storage.

## 1. R2 bucket and custom domain

Use your existing R2 bucket (example: `mlmlive-media`). Connect a custom domain, preferably:

`https://cdn.mlmlive.in`

Do not use the temporary `r2.dev` URL for production delivery.

## 2. R2 CORS

Configure the bucket CORS so public files can be fetched by the web app and signed PUT uploads can come only from your Admin site.

Recommended policy (replace the Admin origin):

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  },
  {
    "AllowedOrigins": [
      "https://YOUR-ADMIN-DOMAIN",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The PUT URL is short-lived and can be created only by an authenticated Admin with Template permission.

## 3. Create an R2 API token

Create an R2 API token limited to this bucket with Object Read & Write access. You need:

- Account ID
- Access Key ID
- Secret Access Key
- Bucket name

The secret keys are used only inside Firebase Functions and are never bundled into the Admin or user web app.

## 4. Configure Firebase Functions secrets

From the Admin project root:

```bash
firebase functions:secrets:set R2_ACCOUNT_ID
firebase functions:secrets:set R2_ACCESS_KEY_ID
firebase functions:secrets:set R2_SECRET_ACCESS_KEY
```

For non-secret parameters, add these lines to the existing `functions/.env.mlmbooster-a4887` file (do not remove its existing values):

```env
R2_BUCKET=mlmlive-media
R2_PUBLIC_BASE_URL=https://cdn.mlmlive.in
```

Use your real bucket name if different.

## 5. Deploy the three new Functions

```bash
firebase deploy --only functions:panelCreateR2TemplateUpload,functions:panelRebuildTemplateCatalog,functions:publishTemplateCatalogOnWrite
```

The existing Firebase Storage cleanup function is intentionally retained for old Firebase Storage media.

## 6. Deploy Admin UI

Deploy this patched Admin normally. Under Templates you will see a **Sync CDN** button.

New template upload behavior:

- Add Template -> R2
- Edit Template -> only newly replaced/uploaded media -> R2
- Existing Firebase URLs are not moved
- Other Admin sections continue using Firebase Storage

R2 paths are namespaced per template, for example:

```text
templates/<templateId>/showcase/...
templates/<templateId>/graphics/...
templates/<templateId>/suggestion/...
templates/<templateId>/graphics-videos/...
```

## 7. One-time initial catalog sync

After Functions + Admin are deployed:

1. Open Admin -> Templates.
2. Click **Sync CDN** once.
3. Wait for `CDN catalog synced: ... active templates`.

This performs one intentional Firestore read of the current template collection and creates the initial R2 JSON catalog.

Until this first sync is complete, the user app continues using Firestore fallback. The Firestore trigger deliberately does not create a partial public catalog.

After bootstrap, normal Add/Edit/Delete uses the changed Firestore document + R2 objects to update the catalog incrementally. Concurrent bulk/copy writes are serialized so cards are not lost from JSON.

A full `mlmtemplate` reference scan is performed only when R2 media is being removed/replaced. That rare Admin-side check prevents shared media from being deleted while another copied template still references it; it is not part of normal user template delivery.

## 8. Cloudflare cache rules

Create Cache Rules for hostname `cdn.mlmlive.in`:

### Template media and AI models

Paths:

```text
/templates/*
/models/*
```

Set them cache eligible. Files are uploaded with:

`Cache-Control: public,max-age=31536000,immutable`

Every uploaded filename is unique, so long immutable caching is safe.

### JSON catalog

Path:

`/catalog/v1/*`

Make it cache eligible as well. Catalog objects use a short origin cache TTL. The app reads `version.json` and requests versioned catalog URLs, so updated template data never depends on a long stale browser cache.

## 9. User web-app Vercel variable

In the user app Vercel project add:

```env
VITE_TEMPLATE_CDN_BASE_URL=https://cdn.mlmlive.in
```

Redeploy the user app.

The app now does:

```text
R2/CDN JSON -> success -> use CDN
              failure -> Firestore fallback
```

So rollout is safe and reversible. Removing `VITE_TEMPLATE_CDN_BASE_URL` returns template reads to the current Firestore behavior.

## 10. RemoveBG models on the same R2 bucket

Upload these paths:

```text
models/birefnet/model_fp16.onnx
models/modnet/modnet.onnx
models/modnet/ort-wasm-simd-threaded.wasm
models/modnet/ort-wasm-simd-threaded.mjs
```

The MODNet source files are currently in the user app's `public/modnet/` folder. BiRefNet currently uses the validated browser FP16 model URL documented in `CLIENT_ONLY_REMOVE_BG.md`.

Then add these Vercel variables:

```env
VITE_BIREFNET_MODEL_URL=https://cdn.mlmlive.in/models/birefnet/model_fp16.onnx
VITE_MODNET_ASSET_BASE_URL=https://cdn.mlmlive.in/models/modnet/
```

Redeploy. RemoveBG remains 100% client-side; only model download location changes to R2/CDN.

After you verify model delivery on production, the local `public/modnet/` copies can be removed in a later cleanup release to reduce the Vercel deployment size. Keeping them in this migration patch is intentional so a missing env variable cannot break low-device RemoveBG.

## 11. Catalog layout

The publisher creates:

```text
catalog/v1/version.json
catalog/v1/home/general.json
catalog/v1/home/company/<companyId>.json
catalog/v1/general/<type>.json
catalog/v1/mlm/<companyId>/<type>.json
catalog/v1/festival/<YYYY-MM-DD>.json
catalog/v1/trending/general/<YYYY-MM-DD>.json
catalog/v1/template/<templateId>.json
```

Home uses the compact Home catalog, while View All / Editor can use type or template detail catalogs. This avoids one huge startup JSON file.

## 12. Expected result

Template-related normal-user Firestore reads should drop sharply because Home, Festival, Today Trending, Latest Update, Domestic Trip, MLM View All and Editor template lists are CDN-first.

Firestore remains the Admin/source-of-truth database. User profile, subscriptions, companies, payments, notifications, reports and all other non-template data remain unchanged.
