import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { triggerUpdatePrompt } from "./components/UpdatePrompt";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            triggerUpdatePrompt(registration);
          }
        });
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update();
        }
      });
    } catch (e) {
      console.log("SW registration failed:", e);
    }
  });
}
