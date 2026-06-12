import React from "react";
import { formControlClassName, type FormControlVariant } from "./fieldStyles";

export type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  variant?: FormControlVariant;
};

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className = "", invalid, variant = "dashboard", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`${formControlClassName({
        multiline: true,
        invalid,
        variant,
      })} ${className}`.trim()}
      {...props}
    />
  ),
);

FormTextarea.displayName = "FormTextarea";

export default FormTextarea;
