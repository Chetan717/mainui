# Client-only Remove BG

This build contains no remove-background inference server integration.

Flow:

1. On WebGPU-capable devices with >= 4 GB reported memory, the app silently caches the browser-ready BiRefNet Lite 512 FP16 model while the user is on the image/crop flow.
2. The model is stored in the browser Cache API and persistent storage is requested when supported.
3. WebGPU session compilation is scheduled during browser idle time to reduce UI jank.
4. If the quality model is already cached/ready, Remove BG runs BiRefNet Lite entirely on-device and refines the 512 matte at up to 1920 px output resolution.
5. If the model is still downloading, WebGPU is unavailable, storage/RAM is insufficient, or the quality path fails, the bundled MODNet/WASM engine is used immediately. User photos are never uploaded for inference.
6. The Remove BG button waits at most 3.5 seconds for a background model preload before choosing the fast local fallback. This avoids first-use model-download stalls.

Model source default:
`studioludens/birefnet-lite-512`, FP16 browser export (MIT), fetched as a static model asset only. The validated FP16 file is about 98.5 MB. It can later be mirrored to your own CDN by setting `VITE_BIREFNET_MODEL_URL`; this does not change inference, which remains fully client-side.

Performance policy:
- no server calls
- one local Remove BG job at a time
- WebGPU quality path only on eligible devices
- weak/unsupported devices use bundled MODNet immediately
- if BiRefNet takes >18s on a device, the app avoids it for the rest of that session
- output capped at 1920 px / 2.5 MP for predictable mobile memory and post-processing time

Note: no browser can guarantee a strict 20-second maximum across every phone. The routing is designed to avoid the main causes of >20s waits: first model download, weak WebGPU hardware, and oversized output processing.

## Future Cloudflare R2 move (no code rewrite)

Current defaults keep the bundled MODNet/ORT files under `/public/modnet`, while
BiRefNet uses the public browser-model URL. Later, point the same client-only
engine at your CDN with Vercel environment variables:

- `VITE_BIREFNET_MODEL_URL=https://cdn.mlmlive.in/models/birefnet/model_fp16.onnx`
- `VITE_MODNET_ASSET_BASE_URL=https://cdn.mlmlive.in/models/modnet/`

The second URL must contain `modnet.onnx`, `ort-wasm-simd-threaded.wasm`, and
`ort-wasm-simd-threaded.mjs`. User photos still never leave the device; only
static model/runtime files are downloaded from the CDN.
