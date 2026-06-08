import { z } from "zod";
import { chatAttachmentSchema } from "./chatAttachment.schema.js";

export const buildDemoFormatSchema = z.enum(["HTML", "Video"]);

export const buildDemoInputSchema = z.object({
  brandId: z.string().min(1),
  demoFormat: buildDemoFormatSchema,
  folderName: z.string().max(120).optional(),
  formatValue: z.string().max(80).optional(),
});

export const buildDemoExecuteSchema = z.object({
  toolInput: buildDemoInputSchema,
  attachments: z.array(chatAttachmentSchema),
  allowedBrands: z.array(z.string()).nullable(),
  intent: z.enum(["upload_sftp", "compress_demo_assets"]),
});

export const buildDemoContextSchema = z.object({
  role: z.string(),
  email: z.string().optional(),
});

export type BuildDemoInput = z.infer<typeof buildDemoInputSchema>;
export type BuildDemoExecuteInput = z.infer<typeof buildDemoExecuteSchema>;
export type BuildDemoContext = z.infer<typeof buildDemoContextSchema>;
export type BuildDemoFormat = z.infer<typeof buildDemoFormatSchema>;
