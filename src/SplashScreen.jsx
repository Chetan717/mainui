import { useEffect, useState } from "react";
import logo from "/mlmboo2.ico";

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3100);

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(150deg, var(--app-blue-start) 0%, #2778e8 45%, var(--app-blue-end) 100%)",
        transition: "opacity 0.4s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "all" : "none",
      }}
    >
      <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-white/[0.055]" />
      <div className="pointer-events-none absolute -left-14 top-24 h-44 w-44 rounded-full bg-white/[0.05]" />

      <div className="pointer-events-none absolute left-1/2 top-[48%] h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.075]" />
      <div className="pointer-events-none absolute left-1/2 top-[48%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.09]" />
      <div className="pointer-events-none absolute left-1/2 top-[48%] h-[218px] w-[218px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.11]" />

      <div className="flex h-full flex-col items-center justify-center px-6 pb-20">
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[24px] border-[3px] border-white/55 bg-white p-2 shadow-[0_16px_45px_rgba(7,47,123,0.35)]">
            <img src={logo} alt="MLM LIVE" className="h-full w-full object-contain" />
          </div>
          <h1 className="mt-7 text-[23px] font-bold tracking-[0.055em]">MLM LIVE</h1>
          <p className="mt-2 text-[15px] font-medium text-white/80">
            Banners for your business, every day
          </p>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 text-center text-[11px] font-semibold tracking-[0.1em] text-white/55">
        MADE IN INDIA
      </div>
    </div>
  );
}
