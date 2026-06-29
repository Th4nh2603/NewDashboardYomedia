import type { z } from "zod";
import type {
  approvalExecuteSchema,
  approvalListSchema,
} from "./approval.schema.js";

export type ApprovalExecuteInput = z.infer<typeof approvalExecuteSchema>;
export type ApprovalListInput = z.infer<typeof approvalListSchema>;
