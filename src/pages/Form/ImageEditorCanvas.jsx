
import { useState, useRef, useCallback, useEffect } from "react";
import { buildPhotoEnhanceFilter } from "../../utils/photoEnhance";

// ── Helpers ───────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function containDims(imgW, imgH, boxW, boxH) {
  const ia = imgW / imgH;
  const ba = boxW / boxH;

  return ia > ba ? { dw: boxW, dh: boxW / ia } : { dw: boxH * ia, dh: boxH };
}

function getSelType() {
  try {
    return JSON.parse(localStorage.getItem("selType")) || {};
  } catch {
    return {};
  }
}

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Crop box helpers ──────────────────────────────────────────────
const HANDLE_VIS = 14;
const HANDLE_HIT = 36;
const MIN_BOX_W = 60;

function initBox(cw, ch, ratio) {
  const margin = 0.88;
  let w = cw * margin;
  let h = w / ratio;

  if (h > ch * margin) {
    h = ch * margin;
    w = h * ratio;
  }

  return {
    x: (cw - w) / 2,
    y: (ch - h) / 2,
    w,
    h,
  };
}

function initBoxInBounds(bounds, ratio) {
  const margin = 0.98;
  let w = bounds.w * margin;
  let h = w / ratio;

  if (h > bounds.h * margin) {
    h = bounds.h * margin;
    w = h * ratio;
  }

  return {
    x: bounds.x + (bounds.w - w) / 2,
    y: bounds.y + (bounds.h - h) / 2,
    w,
    h,
  };
}

const CORNERS = {
  TL: {
    ax: (box) => box.x + box.w,
    ay: (box) => box.y + box.h,
    sx: -1,
    sy: -1,
  },
  TR: {
    ax: (box) => box.x,
    ay: (box) => box.y + box.h,
    sx: 1,
    sy: -1,
  },
  BL: {
    ax: (box) => box.x + box.w,
    ay: (box) => box.y,
    sx: -1,
    sy: 1,
  },
  BR: {
    ax: (box) => box.x,
    ay: (box) => box.y,
    sx: 1,
    sy: 1,
  },
};

function hitCorner(px, py, box) {
  const half = HANDLE_HIT / 2;

  const points = {
    TL: [box.x, box.y],
    TR: [box.x + box.w, box.y],
    BL: [box.x, box.y + box.h],
    BR: [box.x + box.w, box.y + box.h],
  };

  for (const [name, [cx, cy]] of Object.entries(points)) {
    if (Math.abs(px - cx) <= half && Math.abs(py - cy) <= half) {
      return name;
    }
  }

  return null;
}

function insideBox(px, py, box) {
  return (
    px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h
  );
}

function resizeBox(dragX, dragY, anchor, sx, sy, cw, ch, ratio, bounds) {
  let dw = (dragX - anchor.x) * sx;
  let dh = (dragY - anchor.y) * sy;
  let w;
  let h;

  if (dw > 0 && dh > 0) {
    if (dw / ratio >= dh) {
      w = dw;
      h = dw / ratio;
    } else {
      h = dh;
      w = dh * ratio;
    }
  } else if (dw > 0) {
    w = dw;
    h = dw / ratio;
  } else if (dh > 0) {
    h = dh;
    w = dh * ratio;
  } else {
    w = MIN_BOX_W;
    h = MIN_BOX_W / ratio;
  }

  w = Math.max(w, MIN_BOX_W);
  h = w / ratio;

  let x = sx > 0 ? anchor.x : anchor.x - w;
  let y = sy > 0 ? anchor.y : anchor.y - h;

  x = clamp(x, 0, cw - w);
  y = clamp(y, 0, ch - h);

  w = Math.min(w, cw - x);
  h = Math.min(h, ch - y);

  if (w / h > ratio) {
    w = h * ratio;
  } else {
    h = w / ratio;
  }

  if (bounds) {
    w = Math.min(w, bounds.w, bounds.h * ratio);
    h = w / ratio;

    x = clamp(x, bounds.x, bounds.x + bounds.w - w);

    y = clamp(y, bounds.y, bounds.y + bounds.h - h);
  }

  return { x, y, w, h };
}

function moveBox(box, dx, dy, cw, ch, bounds) {
  const limit = bounds || {
    x: 0,
    y: 0,
    w: cw,
    h: ch,
  };

  return {
    ...box,
    x: clamp(box.x + dx, limit.x, limit.x + limit.w - box.w),
    y: clamp(box.y + dy, limit.y, limit.y + limit.h - box.h),
  };
}

// ── Component ─────────────────────────────────────────────────────
export function ImageEditorCanvas({
  src,
  onDone,
  onCancel,
  editingType,
  constrainToImage = true,
  enableEnhance = false,
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [tab, setTab] = useState("crop");
  const [enhance, setEnhance] = useState(() => (enableEnhance ? 65 : 0));
  const [skinTone, setSkinTone] = useState(0);
  const [isDoing, setIsDoing] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState(0);


  const rankW = 175;

  const rankH = 230;

  // Width ÷ Height based crop ratio
  const RATIO =
    editingType === "proof" || editingType === "feature"
      ? 1
      : editingType === "main"
        ? 2
        : rankW / rankH;

  const [canvasW, setCanvasW] = useState(300);
  const [canvasH, setCanvasH] = useState(Math.round(300 / RATIO));

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const offscreenRef = useRef(null);
  const offDirtyRef = useRef(true);

  const canvasSzRef = useRef({
    w: 300,
    h: Math.round(300 / RATIO),
  });

  const appliedSzRef = useRef({
    w: 0,
    h: 0,
    dpr: 0,
  });

  const cropBoxRef = useRef(initBox(300, Math.round(300 / RATIO), RATIO));

  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const rafRef = useRef(null);
  const progressTimerRef = useRef(null);
  const zoomRef = useRef(100);
  const rotRef = useRef(0);
  const flipHRef = useRef(false);
  const flipVRef = useRef(false);
  const enhanceRef = useRef(enableEnhance ? 65 : 0);
  const skinToneRef = useRef(0);

  useEffect(() => {
    zoomRef.current = zoom;
    offDirtyRef.current = true;
  }, [zoom]);

  useEffect(() => {
    rotRef.current = rotation;
    offDirtyRef.current = true;
  }, [rotation]);

  useEffect(() => {
    flipHRef.current = flipH;
    offDirtyRef.current = true;
  }, [flipH]);

  useEffect(() => {
    flipVRef.current = flipV;
    offDirtyRef.current = true;
  }, [flipV]);

  useEffect(() => {
    enhanceRef.current = enhance;
    offDirtyRef.current = true;
  }, [enhance]);

  useEffect(() => {
    skinToneRef.current = skinTone;
    offDirtyRef.current = true;
  }, [skinTone]);

  // ── Responsive canvas sizing ───────────────────────────────────
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;

      const { width } = containerRef.current.getBoundingClientRect();

      const cw = Math.max(200, Math.min(width - 4, 420));

      const ch = Math.min(Math.round(cw / RATIO), 520);

      if (cw !== canvasSzRef.current.w || ch !== canvasSzRef.current.h) {
        canvasSzRef.current = {
          w: cw,
          h: ch,
        };

        cropBoxRef.current = initBox(cw, ch, RATIO);

        offDirtyRef.current = true;
        setCanvasW(cw);
        setCanvasH(ch);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [RATIO]);

  // ── Image dimension computation ───────────────────────────────
  function imgDims(img, cw, ch, rot, zoomValue) {
    const rot90 = rot % 180 !== 0;
    const boxWidth = rot90 ? ch : cw;
    const boxHeight = rot90 ? cw : ch;

    const { dw, dh } = containDims(
      img.naturalWidth,
      img.naturalHeight,
      boxWidth,
      boxHeight,
    );

    return {
      dw: dw * (zoomValue / 100),
      dh: dh * (zoomValue / 100),
    };
  }

  function getCropBounds(img, cw, ch) {
    if (!constrainToImage || !img) {
      return null;
    }

    const { dw, dh } = imgDims(img, cw, ch, rotRef.current, zoomRef.current);

    const left = (cw - dw) / 2;
    const top = (ch - dh) / 2;

    const x = Math.max(0, left);
    const y = Math.max(0, top);

    return {
      x,
      y,
      w: Math.max(1, Math.min(cw, left + dw) - x),
      h: Math.max(1, Math.min(ch, top + dh) - y),
    };
  }

  function initialCropBox(img, cw, ch) {
    const bounds = getCropBounds(img, cw, ch);

    return bounds ? initBoxInBounds(bounds, RATIO) : initBox(cw, ch, RATIO);
  }

  // ── Rebuild offscreen image cache ─────────────────────────────
  function rebuildOffscreen(img, cw, ch, dpr) {
    const rot = rotRef.current;
    const fH = flipHRef.current;
    const fV = flipVRef.current;
    const currentZoom = zoomRef.current;

    const offscreenCanvas = document.createElement("canvas");

    offscreenCanvas.width = cw * dpr;
    offscreenCanvas.height = ch * dpr;

    const ctx = offscreenCanvas.getContext("2d");

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const { dw, dh } = imgDims(img, cw, ch, rot, currentZoom);

    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(fH ? -1 : 1, fV ? -1 : 1);

    ctx.filter = buildPhotoEnhanceFilter(
      enhanceRef.current,
      skinToneRef.current,
    );

    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

    ctx.filter = "none";
    ctx.restore();

    return offscreenCanvas;
  }

  // ── Draw ───────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;

    if (!canvas) return;

    const { w: cw, h: ch } = canvasSzRef.current;

    const dpr = window.devicePixelRatio || 1;
    const appliedSize = appliedSzRef.current;

    if (
      appliedSize.w !== cw ||
      appliedSize.h !== ch ||
      appliedSize.dpr !== dpr
    ) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;

      appliedSzRef.current = {
        w: cw,
        h: ch,
        dpr,
      };

      offDirtyRef.current = true;

      cropBoxRef.current = initialCropBox(img, cw, ch);
    }

    const ctx = canvas.getContext("2d");

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (img) {
      if (offDirtyRef.current || !offscreenRef.current) {
        offscreenRef.current = rebuildOffscreen(img, cw, ch, dpr);

        offDirtyRef.current = false;
      }

      ctx.drawImage(offscreenRef.current, 0, 0);
    }

    const box = cropBoxRef.current || initialCropBox(img, cw, ch);

    const { x: fx, y: fy, w: fw, h: fh } = box;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.clip();

    // Dim outside crop area
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, cw, fy);
    ctx.fillRect(0, fy + fh, cw, ch - fy - fh);
    ctx.fillRect(0, fy, fx, fh);
    ctx.fillRect(fx + fw, fy, cw - fx - fw, fh);

    // Crop border
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx, fy, fw, fh);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.7;

    for (let index = 1; index < 3; index++) {
      ctx.beginPath();
      ctx.moveTo(fx + (fw / 3) * index, fy);
      ctx.lineTo(fx + (fw / 3) * index, fy + fh);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(fx, fy + (fh / 3) * index);
      ctx.lineTo(fx + fw, fy + (fh / 3) * index);
      ctx.stroke();
    }

    // Corner lines
    const bracketLength = 18;
    const bracketThickness = 3;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = bracketThickness;
    ctx.lineCap = "square";

    [
      [fx, fy, 1, 1],
      [fx + fw, fy, -1, 1],
      [fx, fy + fh, 1, -1],
      [fx + fw, fy + fh, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * bracketLength, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * bracketLength);
      ctx.stroke();
    });

    // Touch handles
    const handleSize = HANDLE_VIS;

    ctx.fillStyle = "#ffffff";

    [
      [fx, fy],
      [fx + fw, fy],
      [fx, fy + fh],
      [fx + fw, fy + fh],
    ].forEach(([cx, cy]) => {
      ctx.fillRect(
        cx - handleSize / 2,
        cy - handleSize / 2,
        handleSize,
        handleSize,
      );
    });

    ctx.restore();
  }, [RATIO]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  const fitToCrop = useCallback(() => {
    const img = imgRef.current;

    if (!img) return;

    const { w: cw, h: ch } = canvasSzRef.current;

    const box = cropBoxRef.current || initBox(cw, ch, RATIO);

    const rot = rotRef.current;
    const rot90 = rot % 180 !== 0;

    const boxWidth = rot90 ? ch : cw;
    const boxHeight = rot90 ? cw : ch;

    const { dw: imageWidth, dh: imageHeight } = containDims(
      img.naturalWidth,
      img.naturalHeight,
      boxWidth,
      boxHeight,
    );

    const zoomNeeded = Math.max(box.w / imageWidth, box.h / imageHeight) * 100;

    const newZoom = clamp(Math.ceil(zoomNeeded), 100, 300);

    zoomRef.current = newZoom;
    setZoom(newZoom);
    offDirtyRef.current = true;
    scheduleDraw();
  }, [RATIO, scheduleDraw]);

  // ── Auto face detection ────────────────────────────────────────
  const autoDetectFace = useCallback(async () => {
    const img = imgRef.current;

    if (!img || !("FaceDetector" in window)) {
      return;
    }

    try {
      const detector = new window.FaceDetector({
        maxDetectedFaces: 1,
        fastMode: true,
      });

      const faces = await detector.detect(img);

      if (!faces.length) return;

      const face = faces[0].boundingBox;

      const { w: cw, h: ch } = canvasSzRef.current;

      const rot = rotRef.current;
      const rot90 = rot % 180 !== 0;

      const boxWidth = rot90 ? ch : cw;
      const boxHeight = rot90 ? cw : ch;

      const { dw, dh } = containDims(
        img.naturalWidth,
        img.naturalHeight,
        boxWidth,
        boxHeight,
      );

      const currentZoom = zoomRef.current;
      const scaledWidth = dw * (currentZoom / 100);
      const scaledHeight = dh * (currentZoom / 100);

      const imageLeft = (cw - scaledWidth) / 2;
      const imageTop = (ch - scaledHeight) / 2;

      const scaleX = scaledWidth / img.naturalWidth;
      const scaleY = scaledHeight / img.naturalHeight;

      const faceCenterX = imageLeft + (face.x + face.width / 2) * scaleX;

      const faceCenterY = imageTop + (face.y + face.height / 2) * scaleY;

      const faceHeight = face.height * scaleY;

      const desiredHeight = faceHeight * 2.2;

      const desiredWidth = desiredHeight * RATIO;

      const bounds = getCropBounds(img, cw, ch) || {
        x: 0,
        y: 0,
        w: cw,
        h: ch,
      };

      const finalWidth = Math.min(desiredWidth, bounds.w, bounds.h * RATIO);

      const finalHeight = finalWidth / RATIO;

      const boxX = clamp(
        faceCenterX - finalWidth / 2,
        bounds.x,
        bounds.x + bounds.w - finalWidth,
      );

      const boxY = clamp(
        faceCenterY - faceHeight * 0.1 - finalHeight / 2,
        bounds.y,
        bounds.y + bounds.h - finalHeight,
      );

      if (finalWidth < MIN_BOX_W) {
        return;
      }

      cropBoxRef.current = {
        x: boxX,
        y: boxY,
        w: finalWidth,
        h: finalHeight,
      };

      scheduleDraw();
    } catch {
      // FaceDetector unavailable or failed
    }
  }, [RATIO, scheduleDraw]);

  // ── Load image ─────────────────────────────────────────────────
  useEffect(() => {
    if (!src) return;

    imgRef.current = null;
    offscreenRef.current = null;
    offDirtyRef.current = true;

    zoomRef.current = 100;
    setZoom(100);

    rotRef.current = 0;
    setRotation(0);

    flipHRef.current = false;
    setFlipH(false);

    flipVRef.current = false;
    setFlipV(false);

    const defaultEnhance = enableEnhance ? 65 : 0;
    enhanceRef.current = defaultEnhance;
    setEnhance(defaultEnhance);

    skinToneRef.current = 0;
    setSkinTone(0);

    setIsDoing(false);

    const { w: cw, h: ch } = canvasSzRef.current;

    cropBoxRef.current = initBox(cw, ch, RATIO);

    const img = new Image();
    img.crossOrigin = "anonymous";

    let objectUrl = null;

    const handleImageLoad = () => {
      imgRef.current = img;

      const { w, h } = canvasSzRef.current;

      cropBoxRef.current = initialCropBox(img, w, h);

      offDirtyRef.current = true;
      scheduleDraw();

      setTimeout(autoDetectFace, 80);
    };

    img.onload = handleImageLoad;
    img.onerror = () => undefined;

    if (src instanceof Blob) {
      objectUrl = URL.createObjectURL(src);
      img.src = objectUrl;
    } else {
      img.src = src;
    }

    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad();
    }

    return () => {
      img.onload = null;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, RATIO, scheduleDraw, autoDetectFace]);

  useEffect(() => {
    const defaultEnhance = enableEnhance ? 65 : 0;
    enhanceRef.current = defaultEnhance;
    setEnhance(defaultEnhance);
    setTab(enableEnhance ? "enhance" : "crop");
  }, [enableEnhance, src]);

  useEffect(() => {
    if (imgRef.current) {
      scheduleDraw();
    }
  }, [
    rotation,
    flipH,
    flipV,
    zoom,
    enhance,
    skinTone,
    canvasW,
    canvasH,
    scheduleDraw,
  ]);

  // ── Pointer helpers ─────────────────────────────────────────────
  const getPosition = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;

    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      px: clientX - rect.left,
      py: clientY - rect.top,
    };
  };

  const handlePointerDown = (event) => {
    event.preventDefault();

    if (event.touches && event.touches.length >= 2) {
      pinchRef.current = {
        dist: getTouchDist(event.touches),
        zoom0: zoomRef.current,
      };

      dragRef.current = null;
      return;
    }

    pinchRef.current = null;

    const { px, py } = getPosition(event);

    const box = cropBoxRef.current;
    const corner = hitCorner(px, py, box);

    if (corner) {
      const { ax, ay, sx, sy } = CORNERS[corner];

      dragRef.current = {
        mode: "resize",
        corner,
        anchor: {
          x: ax(box),
          y: ay(box),
        },
        sx,
        sy,
      };
    } else if (insideBox(px, py, box)) {
      dragRef.current = {
        mode: "move",
        px,
        py,
        box0: { ...box },
      };

      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grabbing";
      }
    }
  };

  const handlePointerMove = (event) => {
    event.preventDefault();

    if (event.touches && event.touches.length >= 2 && pinchRef.current) {
      const newDistance = getTouchDist(event.touches);

      const newZoom = clamp(
        Math.round(
          (pinchRef.current.zoom0 * newDistance) / pinchRef.current.dist,
        ),
        100,
        300,
      );

      zoomRef.current = newZoom;
      setZoom(newZoom);
      offDirtyRef.current = true;
      scheduleDraw();

      return;
    }

    if (!dragRef.current) return;

    const { px, py } = getPosition(event);

    const { w: cw, h: ch } = canvasSzRef.current;

    const bounds = getCropBounds(imgRef.current, cw, ch);

    const drag = dragRef.current;

    if (drag.mode === "resize") {
      cropBoxRef.current = resizeBox(
        px,
        py,
        drag.anchor,
        drag.sx,
        drag.sy,
        cw,
        ch,
        RATIO,
        bounds,
      );
    } else {
      cropBoxRef.current = moveBox(
        drag.box0,
        px - drag.px,
        py - drag.py,
        cw,
        ch,
        bounds,
      );
    }

    scheduleDraw();
  };

  const handlePointerUp = (event) => {
    if (event?.touches?.length > 0) {
      if (event.touches.length < 2) {
        pinchRef.current = null;
      }

      return;
    }

    pinchRef.current = null;
    dragRef.current = null;

    if (canvasRef.current) {
      canvasRef.current.style.cursor = "grab";
    }
  };

  // ── Export ─────────────────────────────────────────────────────
  const handleDone = () => {
    if (isDoing) return;

    const img = imgRef.current;
    if (!img) return;

    setIsDoing(true);
    setEncodeProgress(0);

    let progress = 0;

    clearInterval(progressTimerRef.current);

    progressTimerRef.current = setInterval(() => {
      progress = Math.min(
        progress + (progress < 40 ? 10 : progress < 70 ? 4 : 1),
        85,
      );

      setEncodeProgress(progress);
    }, 55);

    const rot = rotRef.current;
    const fH = flipHRef.current;
    const fV = flipVRef.current;
    const currentZoom = zoomRef.current;

    const { w: cw, h: ch } = canvasSzRef.current;

    const box = cropBoxRef.current;

    const TARGET = 800;

    const outputWidth = RATIO >= 1 ? TARGET : Math.round(TARGET * RATIO);

    const outputHeight = RATIO >= 1 ? Math.round(TARGET / RATIO) : TARGET;

    const scale = outputWidth / box.w;

    const { dw, dh } = imgDims(img, cw, ch, rot, currentZoom);

    const cropCenterX = box.x + box.w / 2;

    const cropCenterY = box.y + box.h / 2;

    const imageCenterX = outputWidth / 2 + (cw / 2 - cropCenterX) * scale;

    const imageCenterY = outputHeight / 2 + (ch / 2 - cropCenterY) * scale;

    const outputCanvas = document.createElement("canvas");

    outputCanvas.width = outputWidth;

    outputCanvas.height = outputHeight;

    const ctx = outputCanvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.save();

    ctx.translate(imageCenterX, imageCenterY);

    ctx.rotate((rot * Math.PI) / 180);

    ctx.scale(fH ? -1 : 1, fV ? -1 : 1);

    ctx.filter = buildPhotoEnhanceFilter(
      enhanceRef.current,
      skinToneRef.current,
    );

    ctx.drawImage(
      img,
      (-dw * scale) / 2,
      (-dh * scale) / 2,
      dw * scale,
      dh * scale,
    );

    ctx.filter = "none";
    ctx.restore();

    // A transparent cutout must stay lossless. Lossy WebP colour compression
    // can recreate a pale fringe even though the alpha channel is valid.
    const exportType = enableEnhance ? "image/png" : "image/webp";
    outputCanvas.toBlob(
      (blob) => {
        clearInterval(progressTimerRef.current);

        setEncodeProgress(100);

        setTimeout(() => {
          setIsDoing(false);
          setEncodeProgress(0);
          onDone(blob);
        }, 180);
      },
      exportType,
      exportType === "image/webp" ? 0.92 : undefined,
    );
  };

  const tabs = [
    {
      id: "rotate",
      label: "Rotate",
      icon: "↺",
    },
    {
      id: "flip",
      label: "Flip",
      icon: "⇄",
    },
    {
      id: "crop",
      label: "Crop",
      icon: "⊡",
    },
    {
      id: "scale",
      label: "Zoom",
      icon: "⤢",
    },
    ...(enableEnhance
      ? [
          {
            id: "enhance",
            label: "Enhance",
            icon: "✨",
          },
        ]
      : []),
  ];

  const buttonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "12px 8px",
    flex: 1,
  };

  return (
    <div
      ref={containerRef}
      data-image-editor-open="true"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#181818",
        userSelect: "none",
        fontFamily: "'Figtree', sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 10px",
          borderBottom: "1px solid #2c2c2c",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
            padding: "4px 8px",
            touchAction: "manipulation",
          }}
        >
          ✕
        </button>

        <button
          type="button"
          disabled={isDoing}
          onClick={handleDone}
          style={{
            position: "relative",
            overflow: "hidden",
            background: isDoing
              ? "#1c0e04"
              : "linear-gradient(135deg,#ea580c,#f97316)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 12,
            minWidth: 90,
            minHeight: 36,
            border: "none",
            cursor: isDoing ? "default" : "pointer",
            touchAction: "manipulation",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 14px",
          }}
        >
          {isDoing && (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${encodeProgress}%`,
                background: "linear-gradient(135deg,#ea580c,#f97316)",
                transition: "width 0.1s linear",
                borderRadius: 12,
              }}
            />
          )}

          <span
            style={{
              position: "relative",
              zIndex: 1,
              letterSpacing: "0.01em",
            }}
          >
            {isDoing ? `Encoding ${encodeProgress}%` : "Done / पूरा करें"}
          </span>
        </button>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          backgroundColor: "#d1d5db",
          backgroundImage:
            "linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0,0 10px,10px -10px,-10px 0px",
          overflow: "hidden",
          minHeight: 200,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            touchAction: "none",
            display: "block",
            cursor: "grab",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Tab controls */}
      <div
        style={{
          backgroundColor: "#f4f4f4",
          borderTop: "1px solid #e0e0e0",
          flexShrink: 0,
        }}
      >
        {tab === "rotate" && (
          <div
            style={{
              padding: "6px 10px",
              display: "flex",
              justifyContent: "center",
              gap: 16,
            }}
          >
            {[
              ["↺", -90],
              ["↻", 90],
            ].map(([icon, degrees]) => (
              <button
                type="button"
                key={degrees}
                onClick={() => setRotation((current) => current + degrees)}
                style={{
                  padding: "6px 8px",
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        )}

        {tab === "flip" && (
          <div
            style={{
              padding: "6px 10px",
              display: "flex",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {[
              ["⇄", flipH, () => setFlipH((value) => !value)],
              ["⇅", flipV, () => setFlipV((value) => !value)],
            ].map(([label, active, action]) => (
              <button
                type="button"
                key={label}
                onClick={action}
                style={{
                  padding: "6px 12px",
                  backgroundColor: active ? "#f97316" : "#fff",
                  color: active ? "#fff" : "#333",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === "crop" && (
          <div
            style={{
              padding: "8px 10px",
              textAlign: "center",
              fontSize: 12,
              color: "#888",
            }}
          >
            Drag corners to resize · अंदर खींचकर फोटो सेट करें · Crop stays
            inside photo
          </div>
        )}

        {tab === "enhance" && enableEnhance && (
          <div
            style={{
              padding: "8px 14px 10px",
              color: "#333",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Photo Enhance
              </span>

              <button
                type="button"
                onClick={() => setEnhance((value) => (value ? 0 : 65))}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "5px 10px",
                  background: enhance ? "#f97316" : "#ddd",
                  color: enhance ? "#fff" : "#555",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {enhance ? "ON" : "AUTO"}
              </button>
            </div>

            <input
              aria-label="Photo enhance"
              type="range"
              min={0}
              max={100}
              value={enhance}
              onChange={(event) => setEnhance(Number(event.target.value))}
              style={{
                width: "100%",
                accentColor: "#f97316",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 7,
                marginBottom: 3,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <span>Cool</span>
              <span>Skin Tone</span>
              <span>Warm</span>
            </div>

            <input
              aria-label="Skin tone"
              type="range"
              min={-50}
              max={50}
              value={skinTone}
              onChange={(event) => setSkinTone(Number(event.target.value))}
              style={{
                width: "100%",
                accentColor: "#f97316",
              }}
            />
          </div>
        )}
      </div>

      {/* Zoom slider */}
      {tab !== "enhance" && (
        <div
          style={{
            backgroundColor: "#f4f4f4",
            padding: "6px 20px 12px",
            borderTop: "1px solid #e8e8e8",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: 15,
              fontWeight: 700,
              color: "#f97316",
              marginBottom: 6,
            }}
          >
            {zoom}%
          </div>

          <div
            style={{
              position: "relative",
              height: 36,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                height: 20,
                pointerEvents: "none",
                padding: "0 2px",
              }}
            >
              {Array.from({
                length: 35,
              }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: 1.5,
                    height: index % 5 === 0 ? 14 : 7,
                    backgroundColor: index === 0 ? "#f97316" : "#bbb",
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>

            <input
              type="range"
              min={100}
              max={300}
              step={1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              style={{
                width: "100%",
                appearance: "none",
                WebkitAppearance: "none",
                background: "transparent",
                height: 36,
                cursor: "pointer",
                position: "relative",
                zIndex: 1,
              }}
            />
          </div>

          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 5px;
              height: 28px;
              background: #f97316;
              border-radius: 3px;
              cursor: pointer;
            }

            input[type=range]::-webkit-slider-runnable-track {
              background: transparent;
              height: 36px;
            }
          `}</style>
        </div>
      )}

      {/* Bottom toolbar */}
      <div
        style={{
          backgroundColor: "#1e1e1e",
          display: "flex",
          borderTop: "1px solid #2a2a2a",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setRotation(0);
            setFlipH(false);
            setFlipV(false);
            setZoom(100);
            setEnhance(0);
            setSkinTone(0);

            const { w, h } = canvasSzRef.current;

            cropBoxRef.current = initialCropBox(imgRef.current, w, h);

            offDirtyRef.current = true;
            scheduleDraw();
          }}
          style={buttonStyle}
        >
          <span
            style={{
              fontSize: 20,
              color: "#888",
            }}
          >
            ↺
          </span>

          <span
            style={{
              fontSize: 10,
              color: "#666",
            }}
          >
            Reset
          </span>
        </button>

        <button type="button" onClick={fitToCrop} style={buttonStyle}>
          <span
            style={{
              fontSize: 20,
              color: "#888",
            }}
          >
            ⊞
          </span>

          <span
            style={{
              fontSize: 10,
              color: "#666",
            }}
          >
            Fit
          </span>
        </button>

        <button type="button" onClick={autoDetectFace} style={buttonStyle}>
          <span
            style={{
              fontSize: 18,
              color: "#888",
            }}
          >
            👤
          </span>

          <span
            style={{
              fontSize: 10,
              color: "#666",
            }}
          >
            Face
          </span>
        </button>

        {tabs.map(({ id, label, icon }) => {
          const active = tab === id;

          return (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              style={{
                ...buttonStyle,
                borderTop: active
                  ? "2.5px solid #f97316"
                  : "2.5px solid transparent",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  color: active ? "#f97316" : "#888",
                }}
              >
                {icon}
              </span>

              <span
                style={{
                  fontSize: 10,
                  color: active ? "#f97316" : "#777",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
