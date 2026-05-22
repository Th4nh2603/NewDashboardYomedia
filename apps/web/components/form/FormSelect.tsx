import React from "react";
import { formControlClassName, type FormControlVariant } from "./fieldStyles";

export type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  variant?: FormControlVariant;
  compact?: boolean;
};

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { className = "", invalid, variant = "dashboard", compact, children, ...props },
    ref,
  ) => (
    <select
      ref={ref}
      className={`${formControlClassName({ invalid, variant, compact })} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  ),
);

FormSelect.displayName = "FormSelect";

export default FormSelect;
