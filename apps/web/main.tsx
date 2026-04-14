import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
const clientId = (import.meta.env as any).VITE_GOOGLE_CLIENT_ID as string | undefined;
if (!clientId) {
  throw new Error("Google client ID is not set");
}
const root = ReactDOM.createRoot(rootElement);
const queryClient = new QueryClient();

root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
      <App />
      </QueryClientProvider>
    </React.StrictMode>
);
