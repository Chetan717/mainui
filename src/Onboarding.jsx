import { useNavigate } from "react-router";
import logo from "/mlmboo2.ico";

function StartGraphic() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="140" cy="110" r="72" fill="white" fillOpacity="0.07" />
      <circle cx="140" cy="110" r="50" fill="white" fillOpacity="0.10" />
      <path d="M114 108 L126 102 L126 120 L138 114 L138 126 L152 120 L152 102 L164 108" stroke="white" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M120 130 Q140 140 160 130" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="60" r="8" fill="white" fillOpacity="0.1" />
      <circle cx="220" cy="56" r="11" fill="white" fillOpacity="0.08" />
      <circle cx="50" cy="164" r="6" fill="white" fillOpacity="0.08" />
      <circle cx="232" cy="158" r="9" fill="white" fillOpacity="0.09" />
      <path d="M200 100 L208 92 M208 92 L208 100 M208 92 L200 92" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M76 90 L84 82 M84 82 L84 90 M84 82 L76 82" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();

  const markDone = (path) => {
    localStorage.setItem("onboardingDone", "1");
    navigate(path, { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden select-none"
      style={{
        background: "linear-gradient(160deg, #040c22 0%, #0088DA 45%, #1a3a8f 100%)",
      }}
    >
      <div
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0088DA, transparent)" }}
      />
      <div
        className="absolute -bottom-32 -right-20 w-72 h-72 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0088DA, transparent)" }}
      />

      <div className="relative flex-1 flex flex-col items-center justify-center px-8 gap-4 overflow-hidden">
        <div
          className="w-16 h-16 bg-white rounded-[22px] flex items-center justify-center p-2 shadow-2xl border border-white/20"
          style={{ boxShadow: "0 8px 32px rgba(14,36,92,0.5), 0 2px 8px rgba(0,0,0,0.2)" }}
        >
          <img src={logo} alt="MLM LIVE" className="w-full h-full object-contain" />
        </div>

        <div
          className="w-56 h-44 mx-auto"
          style={{ filter: "drop-shadow(0 8px 24px rgba(79,108,196,0.3))" }}
        >
          <StartGraphic />
        </div>

        <div className="text-center px-2">
          <h1
            className="text-white font-display font-bold text-2xl leading-tight mb-2"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
          >
            आज ही शुरू करें!
          </h1>
          <p className="text-white/50 text-[13px] font-semibold tracking-wide uppercase mb-3">
            Get Started Today
          </p>
          <p className="text-white/75 text-[15px] leading-relaxed font-medium">
            नया अकाउंट बनाएं या{"\n"}पहले से है तो Login करें
          </p>
          <p className="text-white/40 text-[12px] leading-relaxed mt-1.5">
            Create an account or Sign in to continue
          </p>
        </div>
      </div>

      <div className="px-6 pb-14 flex flex-col items-center gap-3">
        <button
          onClick={() => markDone("/signup")}
          onTap={() => markDone("/login")}
          className="w-full max-w-sm h-14 rounded-2xl text-white font-bold text-base shadow-xl"
          style={{
            background: "linear-gradient(135deg, #0055a5 0%, #0088DA 100%)",
            boxShadow: "0 8px 24px rgba(0,136,218,0.4), 0 2px 6px rgba(0,0,0,0.2)",
            touchAction: "manipulation",
          }}
        >
          नया अकाउंट बनाएं — Signup
        </button>
        <button
          onClick={() => markDone("/login")}
          onTap={() => markDone("/login")}
          className="w-full max-w-sm h-14 rounded-2xl font-bold text-base border border-white/20"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.9)",
            touchAction: "manipulation",
          }}
        >
          Login करें — Sign In
        </button>
      </div>
    </div>
  );
}
