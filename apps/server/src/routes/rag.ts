import { Router, Request, Response } from "express";
import { answerWithRag } from "../lib/rag.js";

export const ragRouter = Router();

ragRouter.post("/query", async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as { question?: string };
    const result = await answerWithRag({ question: body.question || "" });
    res.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown RAG error";
    res.status(400).json({ ok: false, error: message });
  }
});
