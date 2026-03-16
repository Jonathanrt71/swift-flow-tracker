import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force rebuild - v4
createRoot(document.getElementById("root")!).render(<App />);
