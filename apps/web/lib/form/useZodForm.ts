import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

type InferSchema<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * React Hook Form + Zod resolver with inferred values type.
 *
 * @example
 * const form = useZodForm(loginSchema, { defaultValues: { email: "", password: "" } });
 */
export function useZodForm<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  options?: Omit<UseFormProps<InferSchema<TSchema>>, "resolver"> & {
    defaultValues?: DefaultValues<InferSchema<TSchema>>;
  },
): UseFormReturn<InferSchema<TSchema>> {
  return useForm<InferSchema<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}

export type { FieldValues, UseFormReturn };
