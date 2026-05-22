export type FormControlVariant = "dashboard" | "admin";

type ControlOptions = {
  multiline?: boolean;
  invalid?: boolean;
  variant?: FormControlVariant;
  compact?: boolean;
};

const VARIANT_BASE: Record<FormControlVariant, string> = {
  dashboard:
    "border-white/10 bg-black/35 text-white placeholder:text-[#64748b] focus:border-[#4cceac]/50 focus:shadow-[0_0_0_3px_rgba(76,206,172,0.12)]",
  admin:
    "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#4cceac]/60 focus:shadow-[0_0_0_3px_rgba(76,206,172,0.15)] dark:border-white/10 dark:bg-[#0d111a] dark:text-white dark:placeholder:text-[#64748b]",
};

export function formControlClassName({
  multiline = false,
  invalid = false,
  variant = "dashboard",
  compact = false,
}: ControlOptions = {}): string {
  const height = multiline
    ? compact
      ? "min-h-[4rem] resize-y py-2"
      : "min-h-[6rem] resize-y py-3"
    : compact
      ? "h-9"
      : "h-12";
  const radius = compact ? "rounded-lg" : "rounded-2xl";
  const text = compact ? "text-xs" : "text-sm";
  const pad = compact ? "px-2" : "px-4";
  const invalidRing = invalid
    ? "border-rose-400/70 focus:border-rose-400/80 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]"
    : "";
  return [
    `w-full border ${radius} ${pad} ${text} outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50`,
    height,
    VARIANT_BASE[variant],
    invalidRing,
  ]
    .filter(Boolean)
    .join(" ");
}

export function formLabelClassName(): string {
  return "block text-xs font-bold uppercase tracking-wider text-[#9ca3af] dark:text-[#9ca3af]";
}

export function formDescriptionClassName(): string {
  return "text-[11px] text-[#64748b] dark:text-slate-500";
}

export function formErrorClassName(): string {
  return "text-xs font-medium text-rose-300";
}
