import React from "react";
import { formErrorClassName } from "./fieldStyles";

export type FormErrorProps = {
  message?: string;
  id?: string;
  className?: string;
};

const FormError: React.FC<FormErrorProps> = ({ message, id, className = "" }) => {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={`${formErrorClassName()} ${className}`.trim()}
    >
      {message}
    </p>
  );
};

export default FormError;
