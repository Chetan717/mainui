# MLM LIVE Remove-BG quality patch

This build changes the shared Remove-BG flow to:

- BiRefNet Lite 512 FP16 on WebGPU for capable devices.
- The model is loaded from `VITE_BIREFNET_MODEL_URL` (defaults to the current public R2 URL).
- Model download begins when the photo/editor UI mounts, not after the user finishes cropping.
- The downloaded model is persisted with browser Cache Storage/HTTP cache.
- There is no 3.5-second timeout that silently downgrades a capable device.
- MODNet remains only for devices that fail the WebGPU capability/provider check.
- BiRefNet output uses sigmoid + bilinear matte resize and does not run MODNet's aggressive portrait connectivity cleanup, preserving soft hair/ear/shoulder alpha.
- `VITE_MODNET_ASSET_BASE_URL` is now respected when supplied; otherwise the existing bundled `/modnet/` files remain the fallback.

Recommended Vercel environment variables:

```env
VITE_BIREFNET_MODEL_URL=https://pub-51f26ff29c2f4b7ca6dfe48387d68c35.r2.dev/models/birefnet/model_fp16.onnx
VITE_MODNET_ASSET_BASE_URL=https://pub-51f26ff29c2f4b7ca6dfe48387d68c35.r2.dev/models/modnet/
```

The first BiRefNet use still has to download the ~94 MB model. The difference is that the download starts early and is cached; it is not cut off after a few seconds and replaced with a different mask engine.
