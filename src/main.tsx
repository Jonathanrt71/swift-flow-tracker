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
});
