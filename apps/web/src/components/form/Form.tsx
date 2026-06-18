import React from "react";
import {
  FormProvider,
  type FieldValues,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";

export type FormProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  onInvalid?: SubmitErrorHandler<T>;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

function Form<T extends FieldValues>({
  form,
  onSubmit,
  onInvalid,
  children,
  className,
  id,
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        id={id}
        noValidate
        className={className}
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      >
        {children}
      </form>
    </FormProvider>
  );
}

export default Form;
