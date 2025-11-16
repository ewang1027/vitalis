import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load OpenRouter debugging utilities
import "./utils/openrouterDebug";

createRoot(document.getElementById("root")!).render(<App />);
