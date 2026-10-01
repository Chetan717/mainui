import React from "react";

const FlipIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" />
    <path d="M20.71 6.04a1 1 0 0 0 0-1.41L19.37 3.29a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.13-1.13z" />
  </svg>
);

/**
 * A small floating toolbar rendered above a selected Konva image.
 * Positioned absolutely relative to the Stage container.
 *
 * Props:
 *  - top, left  : CSS positioning (px)
 *  - onFlip     : called on mouse-down / touch-start
 *  - title      : tooltip string (optional)
 */
function FlipToolbar({ top, left, onFlip, title = "Flip horizontal" }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(203, 202, 202, 0.7)",
        borderRadius: 30,
        padding: "4px",
        boxShadow: "0 2px 8px rgba(136, 133, 133, 0.35)",
      }}
    >
      <button
        title={title}
        onMouseDown={onFlip}
        onTouchStart={onFlip}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FlipIcon />
      </button>
    </div>
  );
}

export default FlipToolbar;