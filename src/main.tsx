import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

const updateSW = registerSW({
  onNeedRefresh() {
    (window as any).__pwaUpdate = updateSW;
    window.dispatchEvent(new CustomEvent("pwa-update-available"));
  },
  onOfflineReady() {
    console.log("App ready for offline use");
  },
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    // Check for SW updates whenever the app regains focus
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        registration.update();
      }
    });
    // Also check periodically every 60 seconds
    setInterval(() => registration.update(), 60 * 1000);
  },
});
