import React from "react";
import ReactDOM from "react-dom/client";
import faviconUrl from "../../../packages/shared/assets/logo/favicon.ico";
import { App } from "./app";
import "./styles.css";

// 入口统一接管 favicon，避免 web/admin 在同一 workspace 下出现默认图标串用。
const faviconLink =
  document.querySelector<HTMLLinkElement>("#app-favicon") ??
  document.querySelector<HTMLLinkElement>("link[rel='icon']");

if (faviconLink) {
  faviconLink.href = faviconUrl;
}

// 根节点只保留最薄的一层挂载，页面路由和数据提供器全部收敛到 App 内部。
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element '#root' not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
