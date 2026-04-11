import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import MiraDemo from "./mira/MiraDemo";
import "./App.css";

// Path-based entry split — /mira shows the Mira welcome prototype,
// anything else shows the live UniSpace app. No router dependency.
const isMiraDemo = window.location.pathname.startsWith("/mira");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isMiraDemo ? <MiraDemo /> : <App />}</StrictMode>,
);
