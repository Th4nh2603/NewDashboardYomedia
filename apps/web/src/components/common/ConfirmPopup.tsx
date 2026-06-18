import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/common/Button';

export type ConfirmPopupProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmLoading?: boolean;
  confirmLoadingLabel?: string;
  isDark: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
};

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  open,
  onClose,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmLoading = false,
  confirmLoadingLabel,
  isDark,
  error,
  onConfirm,
}) => {
  const loading = Boolean(confirmLoading);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  const panelClass = isDark
    ? 'border-white/[0.1] bg-[#151d2f] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)]'
    : 'border-slate-200/90 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.18)]';
  const titleClass = isDark ? 'text-white' : 'text-slate-900';
  const messageClass = isDark ? 'text-[#94a3b8]' : 'text-slate-600';
  const confirmText = loading ? (confirmLoadingLabel ?? confirmLabel) : confirmLabel;

  const tree = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="confirm-popup-root"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close"
            disabled={loading}
            onClick={() => {
              if (!loading) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl border ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-start justify-between gap-4 border-b px-6 py-4 ${
                isDark ? 'border-white/[0.06]' : 'border-slate-200/90'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isDark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'
                  }`}
                  aria-hidden
                >
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 id={titleId} className={`text-lg font-black tracking-tight ${titleClass}`}>
                    {title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (!loading) onClose();
                }}
                className={`shrink-0 rounded-lg p-2 transition-colors disabled:opacity-40 ${
                  isDark
                    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
                aria-label={cancelLabel}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <p className={`text-sm leading-relaxed ${messageClass}`}>{message}</p>
              {error ? (
                <p
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isDark
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div
              className={`flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end ${
                isDark ? 'border-white/[0.06] bg-black/20' : 'border-slate-200/90 bg-slate-50/80'
              }`}
            >
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={loading}
                onClick={() => {
                  if (!loading) onClose();
                }}
                className={
                  isDark
                    ? '!normal-case !tracking-normal !text-sm !font-bold'
                    : '!normal-case !tracking-normal !text-sm !font-bold !bg-slate-100 !text-slate-800 hover:!bg-slate-200'
                }
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="lg"
                disabled={loading}
                onClick={() => void onConfirm()}
                className={
                  isDark
                    ? '!normal-case !tracking-normal !text-sm !font-bold'
                    : '!normal-case !tracking-normal !text-sm !font-bold !bg-rose-600 !text-white hover:!bg-rose-700'
                }
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(tree, document.body);
};

export default ConfirmPopup;
