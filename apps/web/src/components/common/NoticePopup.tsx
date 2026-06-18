import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/common/Button";

export type NoticeVariant = "info" | "success" | "warning" | "danger";

const VARIANT_META: Record<
  NoticeVariant,
  {
    topBar: string;
    blob: string;
    iconWrap: string;
    icon: typeof InformationCircleIcon;
  }
> = {
  info: {
    topBar: "from-cyan-400/90 to-cyan-500/40",
    blob: "bg-cyan-500/25",
    iconWrap: "bg-cyan-500/15 text-cyan-300",
    icon: InformationCircleIcon,
  },
  success: {
    topBar: "from-emerald-400/90 to-emerald-500/40",
    blob: "bg-emerald-500/25",
    iconWrap: "bg-emerald-500/15 text-emerald-300",
    icon: CheckCircleIcon,
  },
  warning: {
    topBar: "from-amber-400/90 to-amber-500/40",
    blob: "bg-amber-500/25",
    iconWrap: "bg-amber-500/15 text-amber-300",
    icon: ExclamationTriangleIcon,
  },
  danger: {
    topBar: "from-rose-400/90 to-rose-500/40",
    blob: "bg-rose-500/25",
    iconWrap: "bg-rose-500/15 text-rose-300",
    icon: XCircleIcon,
  },
};

export interface NoticePopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Plain text body (whitespace preserved). Ignored when `children` is set. */
  description?: string;
  children?: React.ReactNode;
  variant?: NoticeVariant;
  /** Default labels: single button — "Got it"; dual — "Confirm". */
  confirmLabel?: string;
  hideIcon?: boolean;
  /** Show cancel; confirm runs `onConfirm` then `onClose`. */
  onConfirm?: () => void | Promise<void>;
  cancelLabel?: string;
  confirmButtonVariant?: "primary" | "danger";
}

export default function NoticePopup({
  open,
  onClose,
  title,
  description,
  children,
  variant = "info",
  confirmLabel,
  hideIcon = false,
  onConfirm,
  cancelLabel,
  confirmButtonVariant = "primary",
}: NoticePopupProps) {
  const titleId = useId();
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;
  const dual = typeof onConfirm === "function";
  const effectiveConfirmLabel =
    confirmLabel ?? (dual ? "Confirm" : "Got it");
  const effectiveCancelLabel = cancelLabel ?? "Cancel";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

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
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  const primaryVariant =
    dual && confirmButtonVariant === "danger" ? "danger" : "primary";

  async function handlePrimary() {
    if (!dual || !onConfirm) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

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
            disabled={busy}
            onClick={() => {
              if (!busy) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.85rem] border border-white/10 bg-[#0b1224] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`h-1.5 bg-gradient-to-r ${meta.topBar}`}
              aria-hidden
            />
            <div
              className={`pointer-events-none absolute -right-10 top-10 h-36 w-36 rounded-full blur-3xl ${meta.blob}`}
              aria-hidden
            />
            <div className="relative border-b border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-transparent px-6 pb-5 pt-6">
              <div className="flex items-start gap-4">
                {!hideIcon ? (
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrap}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2
                    id={titleId}
                    className="text-sm font-black uppercase tracking-[0.18em] text-white"
                  >
                    {title}
                  </h2>
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
            <div className="relative px-6 py-5">
              {children ? (
                <div className="text-sm leading-relaxed text-[#cbd5e1]">
                  {children}
                </div>
              ) : description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#cbd5e1]">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="relative flex justify-end gap-3 border-t border-white/[0.06] bg-black/20 px-6 py-4">
              {dual ? (
                <>
                  <Button
                    variant="ghost"
                    size="md"
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                  >
                    {effectiveCancelLabel}
                  </Button>
                  <Button
                    variant={primaryVariant}
                    size="md"
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePrimary()}
                  >
                    {busy ? "…" : effectiveConfirmLabel}
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="md" type="button" onClick={onClose}>
                  {effectiveConfirmLabel}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
