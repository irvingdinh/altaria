import "./styles/globals.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
