import { z } from "zod";
import { requiredTrimmedString } from "../validators";

export type InputPopupFormValues = {
  value: string;
};

export function createInputPopupSchema(options?: {
  requiredMessage?: string;
  validate?: (value: string) => string | null | undefined;
}) {
  return z
    .object({
      value: requiredTrimmedString(
        options?.requiredMessage ?? "This field is required",
      ),
    })
    .superRefine((data, ctx) => {
      const custom = options?.validate?.(data.value);
      if (custom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: custom,
          path: ["value"],
        });
      }
    });
}
