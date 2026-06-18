import React from "react";
import { formControlClassName, type FormControlVariant } from "./fieldStyles";

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  variant?: FormControlVariant;
  compact?: boolean;
};

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = "", invalid, variant = "dashboard", compact, ...props }, ref) => (
    <input
      ref={ref}
      className={`${formControlClassName({ invalid, variant, compact })} ${className}`.trim()}
      {...props}
    />
  ),
);

FormInput.displayName = "FormInput";

export default FormInput;
