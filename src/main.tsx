import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force rebuild - v2
// Trigger fresh build and deploy
createRoot(document.getElementById("root")!).render(<App />);
