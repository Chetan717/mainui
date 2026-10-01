import { useEffect, useState } from "react";
import { DOWNLOAD_SUCCESS_EVENT } from "../utils/downloadCelebration";

const COLORS = [
  "#0088DA",
  "#FFD54A",
  "#FF4D6D",
  "#35D07F",
  "#8B5CF6",
  "#FF8A34",
  "#FFFFFF",
];

const PIECES = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  left: (index * 47) % 100,
  delay: (index % 18) * 0.045,
  duration: 1.9 + (index % 8) * 0.12,
  drift: ((index * 29) % 160) - 80,
  rotate: 540 + (index % 7) * 130,
  width: 6 + (index % 4) * 2,
  height: 9 + (index % 5) * 2,
  color: COLORS[index % COLORS.length],
  radius: index % 3 === 0 ? "50%" : "2px",
}));

export default function DownloadConfetti() {
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const handleSuccess = () => setBurst((value) => value + 1);
    window.addEventListener(DOWNLOAD_SUCCESS_EVENT, handleSuccess);
    return () =>
      window.removeEventListener(DOWNLOAD_SUCCESS_EVENT, handleSuccess);
  }, []);

  useEffect(() => {
    if (!burst) return undefined;
    const timer = setTimeout(() => setBurst(0), 3100);
    return () => clearTimeout(timer);
  }, [burst]);

  if (!burst) return null;

  return (
    <div
      key={burst}
      className="fixed inset-0 z-[2000] overflow-hidden pointer-events-none"
      aria-live="polite"
    >
      <style>{`
        @keyframes mlmConfettiFall {
          0% {
            opacity: 1;
            transform: translate3d(0, -14vh, 0) rotate(0deg);
          }
          82% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate3d(var(--confetti-drift), 114vh, 0)
              rotate(var(--confetti-rotate));
          }
        }
        @keyframes mlmDownloadPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.65); }
          18% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
          28%, 78% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(.92); }
        }
      `}</style>

      {PIECES.map((piece) => (
        <span
          key={piece.id}
          className="absolute -top-5 block"
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            borderRadius: piece.radius,
            boxShadow: "0 1px 2px rgba(0,0,0,.12)",
            animation: `mlmConfettiFall ${piece.duration}s cubic-bezier(.18,.75,.32,1) ${piece.delay}s forwards`,
            "--confetti-drift": `${piece.drift}px`,
            "--confetti-rotate": `${piece.rotate}deg`,
          }}
        />
      ))}

      {/* <div
        role="status"
        className="absolute left-1/2 top-[42%] flex items-center gap-3 rounded-2xl border border-white/30 bg-[#09204a]/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md"
        style={{ animation: "mlmDownloadPop 2.8s ease forwards" }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-xl font-bold shadow-lg">
          ✓
        </span>
        <div>
          <p className="text-sm font-bold leading-tight">Download Complete!</p>
          <p className="text-[11px] text-white/75">Your design is saved</p>
        </div>
      </div> */}
    </div>
  );
}
