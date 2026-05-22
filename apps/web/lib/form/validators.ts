import { z } from "zod";

/** Non-empty string after trim — default for required text fields. */
export const requiredTrimmedString = (message = "This field is required") =>
  z.string().trim().min(1, message);

export const optionalTrimmedString = z.union([
  z.literal(""),
  z.string().trim(),
]);

export const emailField = (message = "Invalid email address") =>
  z.string().trim().min(1, "Email is required").email(message);

export const selectOption = (values: readonly [string, ...string[]]) =>
  z.enum(values);
