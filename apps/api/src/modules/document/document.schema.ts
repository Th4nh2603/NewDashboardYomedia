import { z } from "zod";

export const listDocumentsSchema = z.object({
  brandId: z.string().min(1).optional(),
  knowledgeBaseId: z.string().min(1).optional(),
});

export const createDocumentSchema = z.object({
  brandId: z.string().min(1),
  knowledgeBaseId: z.string().min(1),
  title: z.string().min(1).max(500),
  source: z.string().min(1).max(1_000),
  contentType: z.string().min(1).max(200),
  version: z.string().min(1).max(100).optional(),
  content: z.string().min(1),
});
