import React from "react";

export type FormCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: React.ReactNode;
  description?: React.ReactNode;
};

const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, description, className = "", id, ...props }, ref) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border border-white/[0.07] bg-[#0d111a]/90 px-3 py-2.5 transition-colors hover:border-white/12 hover:bg-[#0d111a] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${className}`.trim()}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#4cceac]"
        {...props}
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[13px] font-medium leading-snug text-[#e2e8f0]">
          {label}
        </span>
        {description ? (
          <span className="text-[11px] leading-snug text-slate-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  ),
);

FormCheckbox.displayName = "FormCheckbox";

export default FormCheckbox;
