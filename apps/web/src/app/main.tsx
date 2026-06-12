import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "../styles/index.css";
import { clerkAppearance } from "../config/clerkTheme";
import { ClerkProvider } from "@clerk/react";

type ConfigIssueProps = {
  missingKeys: string[];
};

function ConfigIssueScreen({
  missingKeys,
}: ConfigIssueProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-400/30 bg-slate-900 shadow-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold text-amber-300">
          Configuration error
        </h1>
        <p className="text-sm text-slate-300">
          The app is missing required environment variables and cannot start
          correctly.
        </p>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Missing keys
          </p>
          <ul className="list-disc list-inside text-sm text-amber-200 space-y-1">
            {missingKeys.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">
          Add these keys in your web environment file, then restart the Vite dev
          server.
        </p>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
const clerkPublishableKey = (import.meta.env as any)
  .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const missingConfigKeys = [
  !clerkPublishableKey ? "VITE_CLERK_PUBLISHABLE_KEY" : null,
].filter(Boolean) as string[];

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {missingConfigKeys.length > 0 ? (
      <ConfigIssueScreen missingKeys={missingConfigKeys} />
    ) : (
      <ClerkProvider
        publishableKey={clerkPublishableKey as string}
        appearance={clerkAppearance}
      >
        <App />
      </ClerkProvider>
    )}
  </React.StrictMode>,
);
