import { Component, createContext, useContext, useEffect, useState } from "react";

// ── Offline context ────────────────────────────────────────────────────────
const OnlineCtx = createContext(true);

export function OnlineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (!isOnline) return <OfflineScreen />;
  return <OnlineCtx.Provider value={isOnline}>{children}</OnlineCtx.Provider>;
}

// ── Shared icon helper ─────────────────────────────────────────────────────
function IconWifi({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth={2.5} />
    </svg>
  );
}

function IconWifiOff({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a11 11 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth={2.5} />
    </svg>
  );
}

function IconAlertTriangle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
    </svg>
  );
}

// ── Shared screen shell ────────────────────────────────────────────────────
const screenStyle = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0f2b5b 0%, #1a3a8a 50%, #0e4fa8 100%)",
  color: "#fff",
  fontFamily: "'Figtree', sans-serif",
  padding: "24px",
  zIndex: 99999,
  textAlign: "center",
};

const cardStyle = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "20px",
  padding: "36px 32px",
  maxWidth: "360px",
  width: "100%",
};

const iconWrapStyle = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 20px",
};

const btnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px 28px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 600,
  transition: "opacity 0.15s",
};

const btnPrimary = { ...btnStyle, background: "#fff", color: "#0f2b5b" };
const btnGhost   = { ...btnStyle, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" };

// ── Offline screen ─────────────────────────────────────────────────────────
function OfflineScreen() {
  const [checking, setChecking] = useState(false);

  const retry = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (navigator.onLine) window.location.reload();
    }, 1200);
  };

  return (
    <div style={screenStyle}>
      <div style={cardStyle}>
        <div style={iconWrapStyle}>
          <IconWifiOff className="w-9 h-9" style={{ width: 36, height: 36, color: "#93c5fd" }} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          No Internet Connection
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
          Please check your Wi-Fi or mobile data and try again.
        </p>
        <button
          style={btnPrimary}
          onClick={retry}
          disabled={checking}
        >
          {checking ? (
            <>
              <span style={{
                width: 16, height: 16, border: "2px solid #0f2b5b", borderTopColor: "transparent",
                borderRadius: "50%", display: "inline-block",
                animation: "errorBoundarySpinAnim 0.7s linear infinite",
              }} />
              Checking…
            </>
          ) : (
            <>
              <IconWifi style={{ width: 16, height: 16 }} />
              Try Again
            </>
          )}
        </button>
      </div>
      <style>{`
        @keyframes errorBoundarySpinAnim { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Crash screen (used by class boundary) ─────────────────────────────────
function CrashScreen({ error, onReset, compact }) {
  const goHome  = () => { window.location.href = "/"; };
  const reload  = () => window.location.reload();

  const msg = "Please reload the page or try again.";

  if (compact) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", minHeight: "300px",
        background: "linear-gradient(135deg,#0f2b5b,#0e4fa8)",
        borderRadius: "16px", padding: "32px", textAlign: "center", color: "#fff",
        fontFamily: "'Figtree', sans-serif",
      }}>
        <div style={{ ...iconWrapStyle, marginBottom: 16 }}>
          <IconAlertTriangle style={{ width: 36, height: 36, color: "#fca5a5" }} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>Editor crashed</h3>
        <p style={{ margin: "0 0 4px", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, maxWidth: 260 }}>
          The canvas hit an unexpected error. Your data is safe.
        </p>
        <p style={{ margin: "0 0 24px", fontSize: "11px", fontFamily: "'Figtree', sans-serif",
          color: "rgba(255,255,255,0.35)", maxWidth: 280, wordBreak: "break-word" }}>
          {msg}
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          {onReset && (
            <button style={btnGhost} onClick={onReset}>Try Again</button>
          )}
          <button style={btnPrimary} onClick={reload}>Reload Page</button>
          <button style={{ ...btnGhost, fontSize: 13 }} onClick={goHome}>← Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={screenStyle}>
      <div style={cardStyle}>
        <div style={iconWrapStyle}>
          <IconAlertTriangle style={{ width: 36, height: 36, color: "#fca5a5" }} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          Something went wrong
        </h2>
        <p style={{ margin: "0 0 6px", fontSize: "14px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
          An unexpected error occurred. Your data is safe.
        </p>
        <p style={{ margin: "0 0 28px", fontSize: "11px", fontFamily: "'Figtree', sans-serif",
          color: "rgba(255,255,255,0.35)", wordBreak: "break-word" }}>
          {msg}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {onReset && (
            <button style={btnPrimary} onClick={onReset}>Try Again</button>
          )}
          <button style={btnGhost} onClick={reload}>Reload Page</button>
          <button style={{ ...btnGhost, fontSize: 13 }} onClick={goHome}>← Go Home</button>
        </div>
      </div>
    </div>
  );
}

// ── Class-based Error Boundary ─────────────────────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  }

  render() {
    if (this.state.hasError) {
      return (
        <CrashScreen
          error={this.state.error}
          onReset={this.props.resetable !== false ? this.handleReset : null}
          compact={this.props.compact}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
