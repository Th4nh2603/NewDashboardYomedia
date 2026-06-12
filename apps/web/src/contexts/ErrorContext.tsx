import React, { createContext, useContext, useState, useCallback } from 'react';
import { getApiErrorPresentation } from '../lib/apiErrorPresentation';
import { normalizeApiError } from '../lib/normalizeApiError';
import Button from '../components/Button';

export type ErrorSeverity = 'error' | 'warning' | 'info';

interface AppNotification {
  id: string;
  message: string;
  severity: ErrorSeverity;
  title?: string;
}

interface ErrorContextType {
  notifications: AppNotification[];
  notify: (message: string, severity?: ErrorSeverity, title?: string) => void;
  dismiss: (id: string) => void;
  handleApiError: (error: unknown, context?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((message: string, severity: ErrorSeverity = 'error', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, severity, title }]);
    
    // Auto-dismiss after 6 seconds
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  const handleApiError = useCallback((error: unknown, context: string = 'Operation') => {
    console.error(`[${context}] API Error:`, error);
    const backend = normalizeApiError(error);
    let { message, severity, title } = getApiErrorPresentation(backend, context);

    // Client-only Gemini / AI Studio errors (not from our API layer).
    if (
      backend.status >= 500 &&
      /Requested entity was not found/i.test(backend.message)
    ) {
      message =
        'The requested model or resource was not found. This might be an API key project issue.';
      title = 'Resource not found';
      severity = 'warning';
    } else if (/overloaded/i.test(backend.message)) {
      message = 'The AI server is busy. Retrying might help.';
      title = 'Server busy';
      severity = 'warning';
    }

    notify(message, severity, title);
  }, [notify]);

  return (
    <ErrorContext.Provider value={{ notifications, notify, dismiss, handleApiError }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex flex-col p-4 rounded-xl border dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl transform transition-all duration-300 animate-in slide-in-from-right-full ${
              n.severity === 'error' ? 'border-red-500/50 bg-red-50/90 dark:bg-red-500/10' :
              n.severity === 'warning' ? 'border-amber-500/50 bg-amber-50/90 dark:bg-amber-500/10' :
              'border-indigo-500/50 bg-indigo-50/90 dark:bg-indigo-500/10'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              {n.title && <span className={`font-bold text-sm ${
                n.severity === 'error' ? 'text-red-600 dark:text-red-400' :
                n.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                'text-indigo-600 dark:text-indigo-400'
              }`}>{n.title}</span>}
              <Button onClick={() => dismiss(n.id)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </Button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-200">{n.message}</p>
          </div>
        ))}
      </div>
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error('useError must be used within ErrorProvider');
  return context;
};
