import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const ToastContext = createContext(null);

let _addToast = null;

export function useToast() {
  return useContext(ToastContext);
}

/* Tiny global helper — call from anywhere after <ToastRoot /> is mounted */
export const toast = {
  success: (msg) => _addToast?.({ msg, type: "success" }),
  error:   (msg) => _addToast?.({ msg, type: "error"   }),
  info:    (msg) => _addToast?.({ msg, type: "info"    }),
  warning: (msg) => _addToast?.({ msg, type: "warning" }),
};

const ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
    </svg>
  ),
};

const BG = {
  success: "bg-[#16a34a] text-white",
  error:   "bg-[#dc2626] text-white",
  info:    "bg-[#0088DA] text-white",
  warning: "bg-[#d97706] text-white",
};

function ToastItem({ id, msg, type, onRemove }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(id), 280);
    }, 3200);
    return () => clearTimeout(t);
  }, [id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-[13.5px] font-semibold w-full max-w-[360px] cursor-pointer select-none ${BG[type]} ${leaving ? "animate-toast-out" : "animate-toast-in"}`}
      onClick={() => { setLeaving(true); setTimeout(() => onRemove(id), 280); }}
    >
      <span className="flex-shrink-0">{ICONS[type]}</span>
      <span className="flex-1 leading-snug">{msg}</span>
    </div>
  );
}

export function ToastRoot() {
  const [items, setItems] = useState([]);
  const counter = useRef(0);

  const addToast = useCallback(({ msg, type = "info" }) => {
    const id = ++counter.current;
    setItems((prev) => [...prev.slice(-3), { id, msg, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  if (items.length === 0) return null;

  return (
    <div
      id="toast-root"
      className="fixed bottom-[80px] md:bottom-6 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 md:right-6 z-[9999] flex flex-col-reverse gap-2 items-center md:items-end pointer-events-none"
      style={{ width: "min(90vw, 360px)" }}
    >
      {items.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={removeToast} />
      ))}
    </div>
  );
}

export default ToastRoot;
