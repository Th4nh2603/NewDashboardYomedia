import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import { listSftpEntries, sftpListQuerySchema } from "./sftp.service.js";

export const sftpRouter = Router();

function parseQuery<T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError("Invalid SFTP request.", {
      statusCode: 400,
      code: "INVALID_SFTP_REQUEST",
      expose: true,
      cause: parsed.error,
    });
  }
  return parsed.data;
}

sftpRouter.get("/list", async (req, res, next) => {
  try {
    const input = parseQuery(sftpListQuerySchema, req.query);
    res.json(await listSftpEntries(input));
  } catch (error) {
    next(error);
  }
});
