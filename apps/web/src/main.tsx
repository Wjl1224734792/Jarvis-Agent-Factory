import React from "react";
import ReactDOM from "react-dom/client";
import faviconUrl from "../../../packages/shared/assets/logo/favicon.ico";
import { App } from "./app";
import "./styles.css";

const faviconLink =
  document.querySelector<HTMLLinkElement>("#app-favicon") ??
  document.querySelector<HTMLLinkElement>("link[rel='icon']");

if (faviconLink) {
  faviconLink.href = faviconUrl;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
