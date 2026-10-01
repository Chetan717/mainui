import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Bell, X, ChevronRight } from 'lucide-react';

export default function NewTemplateToast({ template, onClose }) {
  const navigate   = useNavigate();
  const timerRef   = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, 6000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  const handleView = () => {
    onClose();
    navigate('/alltemp');
  };

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        width: 'min(340px, calc(100vw - 24px))',
        animation: 'ntSlideUp 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards',
        WebkitBackfaceVisibility: 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      <style>{`
        @keyframes ntSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(24px) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
        }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(135deg, #0088DA 0%, #0088DA 50%, #0088DA 100%)',
          borderRadius: '18px',
          padding: '14px 14px 14px 14px',
          boxShadow: '0 8px 32px rgba(14,36,92,0.45), 0 2px 8px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '11px',
        }}
      >
        {template?.showcaseUrl ? (
          <img
            src={template.showcaseUrl}
            alt="Template preview"
            style={{
              width: 46, height: 46, borderRadius: 10, objectFit: 'cover',
              flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)',
            }}
          />
        ) : (
          <div
            style={{
              width: 46, height: 46, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Bell style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {template?.title || 'New Template Published! 🎉'}
          </p>
          <p style={{
            margin: 0,
            color: 'rgba(255,255,255,0.72)',
            fontSize: 12,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {template?.body || 'A new template has been added. Tap to view.'}
          </p>

          <button
            onClick={handleView}
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '5px 10px',
              cursor: 'pointer',
              letterSpacing: 0.2,
            }}
          >
            View Templates
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            flexShrink: 0,
            width: 26, height: 26,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
          aria-label="Dismiss"
        >
          <X style={{ width: 13, height: 13, color: '#fff' }} />
        </button>
      </div>
    </div>
  );
}
