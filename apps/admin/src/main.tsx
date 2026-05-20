import "antd/dist/reset.css";
import faviconUrl from "../../../packages/shared/assets/logo/logo.png";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app";
import { queryClient } from "./lib/query-client";
import "./styles.css";

const faviconLink =
  document.querySelector<HTMLLinkElement>("#app-favicon") ??
  document.querySelector<HTMLLinkElement>("link[rel='icon']");
if (faviconLink) {
  faviconLink.href = faviconUrl;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#147a84",
          colorInfo: "#147a84",
          colorSuccess: "#2f9b8f",
          colorWarning: "#ef9f45",
          colorError: "#d25d62",
          colorBgBase: "#eef5f4",
          colorBgLayout: "#eef5f4",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
          colorBorder: "#d7e4e2",
          colorText: "#15363d",
          colorTextSecondary: "#647b82",
          colorFillSecondary: "#f4f9f8",
          borderRadius: 18,
          fontSize: 14
        },
        components: {
          Button: {
            defaultBg: "#ffffff",
            defaultBorderColor: "#d7e4e2",
            defaultColor: "#15363d"
          },
          Table: {
            headerBg: "#f3f9f8",
            headerColor: "#15363d",
            rowHoverBg: "#f5fbfa"
          }
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>
);
