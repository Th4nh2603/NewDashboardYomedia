import React, { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("AppErrorBoundary:", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
          <div className="max-w-lg w-full rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 shadow-xl p-6 space-y-4">
            <h1 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The UI hit an unexpected error. You can reload the page or go
              back to the dashboard.
            </p>
            <pre className="text-xs overflow-auto max-h-40 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = "#/";
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
