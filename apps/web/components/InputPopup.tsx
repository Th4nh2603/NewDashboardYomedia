import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChatBubbleBottomCenterTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "./Button";

export interface InputPopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Shown above the field */
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  cancelLabel?: string;
  /** Multiline expands the field */
  multiline?: boolean;
  rows?: number;
  onSubmit: (value: string) => void | Promise<void>;
  /** Return error message to block submit, or null / "" if ok */
  validate?: (value: string) => string | null | undefined;
}

export default function InputPopup({
  open,
  onClose,
  title,
  description,
  label,
  placeholder = "",
  initialValue = "",
  submitLabel = "Confirm",
  cancelLabel = "Cancel",
  multiline = false,
  rows = 4,
  onSubmit,
  validate,
}: InputPopupProps) {
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setBusy(false);
      queueMicrotask(() => {
        if (multiline) textareaRef.current?.focus();
        else inputRef.current?.focus();
      });
    }
  }, [open, initialValue, multiline]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const v = validate?.(trimmed);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const fieldId = `${titleId}-field`;

  const node = (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-[#020617]/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!busy) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.85rem] border border-white/10 bg-[#0b1224] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1.5 bg-gradient-to-r from-violet-400/90 to-[#4cceac]/70"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-10 top-24 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl"
              aria-hidden
            />
            <form onSubmit={handleSubmit}>
              <div className="relative border-b border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-transparent px-6 pb-5 pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                    <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2
                      id={titleId}
                      className="text-sm font-black uppercase tracking-[0.18em] text-white"
                    >
                      {title}
                    </h2>
                    {description ? (
                      <p id={descId} className="mt-2 text-xs text-[#94a3b8]">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="Close"
                    disabled={busy}
                    onClick={onClose}
                    className="shrink-0 text-white/40 hover:text-white disabled:opacity-40"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="relative space-y-3 px-6 py-5">
                {label ? (
                  <label htmlFor={fieldId} className="block text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
                    {label}
                  </label>
                ) : null}
                {multiline ? (
                  <textarea
                    ref={textareaRef}
                    id={fieldId}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={busy}
                    className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white placeholder:text-[#64748b] outline-none ring-0 transition-[border-color,box-shadow] focus:border-[#4cceac]/50 focus:shadow-[0_0_0_3px_rgba(76,206,172,0.12)] disabled:opacity-50"
                  />
                ) : (
                  <input
                    ref={inputRef}
                    id={fieldId}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    disabled={busy}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white placeholder:text-[#64748b] outline-none transition-[border-color,box-shadow] focus:border-[#4cceac]/50 focus:shadow-[0_0_0_3px_rgba(76,206,172,0.12)] disabled:opacity-50"
                  />
                )}
                {error ? (
                  <p className="text-xs font-medium text-rose-300" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
              <div className="relative flex justify-end gap-3 border-t border-white/[0.06] bg-black/20 px-6 py-4">
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                >
                  {cancelLabel}
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={busy}>
                  {submitLabel}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
