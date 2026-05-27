import { Router, Request, Response } from "express";
import { answerWithRag } from "../lib/ai/rag.js";
import { asyncHandler, HttpError } from "../lib/http/errors.js";
import { requireClerkAuth } from "../lib/auth/clerkAuth.js";

export const ragRouter = Router();
ragRouter.use(requireClerkAuth);

ragRouter.post(
  "/query",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        question?: string;
        provider?: "gemini" | "openai";
      };
      const result = await answerWithRag({
        question: body.question || "",
        provider: body.provider,
      });
      res.json({ ok: true, ...result });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown RAG error";
      throw new HttpError(400, message, { code: "RAG_ERROR" });
    }
  }),
);
