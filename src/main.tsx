import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa-update-available"));
  },
  onOfflineReady() {
    console.log("App ready for offline use");
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        registration.update();
      }
    });
    setInterval(() => registration.update(), 60 * 1000);
  },
});
