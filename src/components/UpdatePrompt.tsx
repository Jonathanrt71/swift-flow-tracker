import { useState, useEffect } from "react";

const UpdatePrompt = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("pwa-update-available", handler);
    return () => window.removeEventListener("pwa-update-available", handler);
  }, []);

  if (!visible) return null;

  const handleRefresh = () => {
    const updateSW = (window as any).__pwaUpdate;
    if (updateSW) updateSW(true);
    else window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#F5F3EE",
        color: "#3D3A37",
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
          color: "#3D3A37",
          border: "1px solid rgba(61,58,55,0.3)",
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
