import React, { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChatBubbleBottomCenterTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "./Button";
import { Form, FormField, FormInput, FormTextarea } from "./form";
import {
  createInputPopupSchema,
  useZodForm,
  type InputPopupFormValues,
} from "../lib/form";

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
  const validateRef = useRef(validate);
  validateRef.current = validate;
  const schema = useMemo(
    () =>
      createInputPopupSchema({
        validate: (value) => validateRef.current?.(value),
      }),
    [],
  );

  const form = useZodForm(schema, {
    defaultValues: { value: initialValue },
  });

  const {
    reset,
    setError,
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    if (open) {
      reset({ value: initialValue });
    }
  }, [open, initialValue, reset]);

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
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  const handleValidSubmit = async ({ value }: InputPopupFormValues) => {
    try {
      await onSubmit(value);
      onClose();
    } catch (e) {
      setError("value", {
        type: "server",
        message: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

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
              if (!isSubmitting) onClose();
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
            <Form form={form} onSubmit={handleValidSubmit}>
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
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="shrink-0 text-white/40 hover:text-white disabled:opacity-40"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="relative px-6 py-5">
                <FormField<InputPopupFormValues>
                  name="value"
                  label={label}
                  required
                >
                  {multiline ? (
                    <FormTextarea
                      placeholder={placeholder}
                      rows={rows}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  ) : (
                    <FormInput
                      type="text"
                      placeholder={placeholder}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  )}
                </FormField>
              </div>
              <div className="relative flex justify-end gap-3 border-t border-white/[0.06] bg-black/20 px-6 py-4">
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                >
                  {cancelLabel}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {submitLabel}
                </Button>
              </div>
            </Form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
