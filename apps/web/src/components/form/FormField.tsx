import React, { useId } from "react";
import {
  Controller,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  useFormContext,
} from "react-hook-form";
import FormError from "./FormError";
import { formDescriptionClassName, formLabelClassName } from "./fieldStyles";

export type FormFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
  children:
    | React.ReactElement<{
        id?: string;
        "aria-invalid"?: boolean;
        "aria-describedby"?: string;
        invalid?: boolean;
      }>
    | ((
        field: ControllerRenderProps<T, FieldPath<T>>,
        meta: { invalid: boolean; fieldId: string },
      ) => React.ReactNode);
};

function FormField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className = "space-y-1.5",
  children,
}: FormFieldProps<T>) {
  const { control } = useFormContext<T>();
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const descId = `${fieldId}-desc`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const describedBy = [
          description ? descId : null,
          fieldState.error ? errorId : null,
        ]
          .filter(Boolean)
          .join(" ");

        const control =
          typeof children === "function" ? (
            children(field, {
              invalid: fieldState.invalid,
              fieldId,
            })
          ) : React.isValidElement(children) ? (
            React.cloneElement(children, {
              ...field,
              id: fieldId,
              "aria-invalid": fieldState.invalid || undefined,
              "aria-describedby": describedBy || undefined,
              invalid: fieldState.invalid,
            })
          ) : (
            children
          );

        return (
          <div className={className}>
            {label ? (
              <label htmlFor={fieldId} className={formLabelClassName()}>
                {label}
                {required ? (
                  <span className="ml-1 text-rose-400" aria-hidden>
                    *
                  </span>
                ) : null}
              </label>
            ) : null}
            {description ? (
              <p id={descId} className={formDescriptionClassName()}>
                {description}
              </p>
            ) : null}
            {control}
            <FormError id={errorId} message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}

export default FormField;
