import "./instrument";
import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
