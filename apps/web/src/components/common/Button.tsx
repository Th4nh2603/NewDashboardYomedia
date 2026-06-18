import React from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "success"
  | "violet"
  | "danger"
  | "iconSuccess"
  | "iconDanger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#4cceac]/20 text-[#4cceac] hover:bg-[#4cceac]/30 disabled:opacity-40",
  secondary:
    "bg-white/5 text-[#e5e7eb] hover:bg-white/10 disabled:opacity-40",
  ghost: "bg-transparent text-[#e5e7eb] hover:bg-white/10 disabled:opacity-40",
  success:
    "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40",
  violet:
    "bg-violet-500/20 text-violet-300 hover:bg-violet-500/35 disabled:opacity-40",
  danger:
    "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 disabled:opacity-40",
  iconSuccess: "bg-[#4cceac]/10 text-[#4cceac] hover:bg-[#4cceac]/20",
  iconDanger: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-widest",
  md: "rounded-2xl px-4 py-2 text-[10px] uppercase tracking-widest",
  lg: "rounded-2xl px-5 py-2.5 text-sm",
  icon: "rounded-md p-1",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "secondary", size = "md", type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={`font-semibold transition-colors disabled:cursor-not-allowed ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`.trim()}
      {...props}
    />
  ),
);

Button.displayName = "Button";

export default Button;
