import "antd/dist/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app";
import { queryClient } from "./lib/query-client";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          colorBgBase: "#0b1220",
          colorBgContainer: "#111827",
          colorBgElevated: "#0f172a",
          colorBorder: "rgba(148, 163, 184, 0.18)",
          borderRadius: 12,
          fontSize: 14
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>
);
