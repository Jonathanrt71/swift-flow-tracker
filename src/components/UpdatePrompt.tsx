import { useState, useEffect } from "react";

let showUpdateGlobal: (() => void) | null = null;
let registrationRef: ServiceWorkerRegistration | null = null;

export function triggerUpdatePrompt(registration: ServiceWorkerRegistration) {
  registrationRef = registration;
  showUpdateGlobal?.();
}

const UpdatePrompt = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    showUpdateGlobal = () => setVisible(true);
    return () => { showUpdateGlobal = null; };
  }, []);

  if (!visible) return null;

  const handleRefresh = () => {
    if (registrationRef?.waiting) {
      registrationRef.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#415162",
        color: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 14,
      }}
    >
      <span>Update available</span>
      <button
        onClick={handleRefresh}
        style={{
          background: "transparent",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.6)",
          borderRadius: 6,
          padding: "5px 14px",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Refresh
      </button>
    </div>
  );
};

export default UpdatePrompt;
