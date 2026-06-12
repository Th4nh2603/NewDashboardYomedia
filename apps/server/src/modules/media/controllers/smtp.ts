import {
  Router,
  Request,
  Response,
  type RequestHandler,
} from "express";
import nodemailer from "nodemailer";
import { asyncHandler, HttpError } from "../../../lib/http/errors.js";
import { getUserRole } from "../../auth/lib/role.js";
import { requireClerkAuth } from "../../auth/lib/clerkAuth.js";

export const smtpRouter = Router();
smtpRouter.use(requireClerkAuth);

type MailTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
};

function parseSecure(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return undefined;
}

function envPartial(): Partial<MailTransportConfig> & {
  defaultFrom?: string;
} {
  const emailUser = process.env.EMAIL_USER?.trim();
  const hostExplicit = process.env.SMTP_HOST?.trim();
  let host = hostExplicit || undefined;

  const portRaw = process.env.SMTP_PORT?.trim();
  let port = portRaw ? parseInt(portRaw, 10) : undefined;
  let secure = parseSecure(process.env.SMTP_SECURE);

  const user =
    process.env.SMTP_USER?.trim() || emailUser || undefined;
  const pass = String(
    process.env.SMTP_PASS ??
      process.env.SMTP_PASSWORD ??
      process.env.EMAIL_PASS ??
      "",
  );

  const defaultFrom =
    process.env.SMTP_FROM?.trim() || emailUser || undefined;

  const out: Partial<MailTransportConfig> & { defaultFrom?: string } = {};

  if (!host && emailUser) {
    host = process.env.GMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
    if (port === undefined || !Number.isFinite(port)) port = 465;
    if (secure === undefined) secure = true;
  }

  if (host) out.host = host;
  if (port !== undefined && Number.isFinite(port)) out.port = port;
  if (secure !== undefined) out.secure = secure;
  if (user)
    out.auth = {
      user,
      pass,
    };
  if (defaultFrom) out.defaultFrom = defaultFrom;
  return out;
}

function mergeTransport(body: Record<string, unknown>): MailTransportConfig {
  const env = envPartial();

  const host =
    typeof body.host === "string" && body.host.trim()
      ? body.host.trim()
      : env.host;

  let portFinal = typeof env.port === "number" ? env.port : 587;
  if (typeof body.port === "number" && Number.isFinite(body.port)) {
    portFinal = body.port;
  } else if (typeof body.port === "string" && body.port.trim()) {
    const p = parseInt(body.port.trim(), 10);
    if (Number.isFinite(p)) portFinal = p;
  }

  const secure =
    parseSecure(body.secure) ?? env.secure ?? portFinal === 465;

  const authRaw = body.auth as { user?: unknown; pass?: unknown } | undefined;
  let auth: { user: string; pass: string } | undefined;
  if (
    typeof authRaw?.user === "string" &&
    authRaw.user.trim() &&
    typeof authRaw.pass === "string"
  ) {
    auth = { user: authRaw.user.trim(), pass: authRaw.pass };
  }
  if (!auth && env.auth?.user) {
    auth = { user: env.auth.user, pass: env.auth.pass };
  }
  if (
    !auth &&
    typeof body.username === "string" &&
    body.username.trim()
  ) {
    auth = {
      user: body.username.trim(),
      pass: typeof body.password === "string" ? body.password : "",
    };
  }

  if (!host) {
    throw new HttpError(
      400,
      "Missing SMTP host (body.host or SMTP_HOST, or set EMAIL_USER for Gmail defaults).",
      {
        code: "BAD_REQUEST",
      },
    );
  }

  return {
    host,
    port: portFinal,
    secure,
    ...(auth ? { auth } : {}),
  };
}

function requireAdminRole(req: Request): void {
  const role = getUserRole(req);
  if (role !== "admin") {
    throw new HttpError(403, "Forbidden: only admin can send SMTP mail", {
      code: "FORBIDDEN_SMTP_SEND",
    });
  }
}

async function verifyTransport(cfg: MailTransportConfig): Promise<void> {
  const transport = nodemailer.createTransport(cfg);
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
}

/** Kiểm tra SMTP: body hoặc biến môi trường SMTP_*. */
smtpRouter.post(
  "/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const cfg = mergeTransport(body);
    await verifyTransport(cfg);
    res.json({ ok: true, host: cfg.host, port: cfg.port });
  }),
);

/** GET chỉ dùng cấu hình env (không truyền mật khẩu trên URL). */
smtpRouter.get(
  "/verify",
  asyncHandler(async (_req: Request, res: Response) => {
    const cfg = mergeTransport({});
    await verifyTransport(cfg);
    res.json({ ok: true, host: cfg.host, port: cfg.port });
  }),
);

smtpRouter.post(
  "/send",
  asyncHandler(async (req: Request, res: Response) => {
    requireAdminRole(req);
    const body = (req.body || {}) as {
      to?: string | string[];
      subject?: string;
      text?: string;
      html?: string;
      from?: string;
      replyTo?: string;
      cc?: string | string[];
      bcc?: string | string[];
      host?: string;
      port?: number | string;
      secure?: boolean;
      auth?: { user?: string; pass?: string };
      username?: string;
      password?: string;
    };

    if (!body.to || !body.subject) {
      throw new HttpError(400, "Missing 'to' or 'subject'", {
        code: "BAD_REQUEST",
      });
    }
    if (!body.text && !body.html) {
      throw new HttpError(400, "Provide at least one of 'text' or 'html'", {
        code: "BAD_REQUEST",
      });
    }

    const env = envPartial();
    const cfg = mergeTransport(body as Record<string, unknown>);
    const fromCandidate =
      typeof body.from === "string" && body.from.trim()
        ? body.from.trim()
        : env.defaultFrom;
    if (!fromCandidate) {
      throw new HttpError(400, "Missing 'from' in body or SMTP_FROM env", {
        code: "BAD_REQUEST",
      });
    }

    const transport = nodemailer.createTransport(cfg);
    try {
      const info = await transport.sendMail({
        from: fromCandidate,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        subject: body.subject,
        text: body.text,
        html: body.html,
        replyTo:
          typeof body.replyTo === "string" ? body.replyTo : undefined,
      });
      res.json({
        ok: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } finally {
      transport.close();
    }
  }),
);

/**
 * Giống ví dụ `POST /api/send-email`: body `{ to, subject, text }`,
 * đọc `EMAIL_USER` / `EMAIL_PASS` (hoặc SMTP_*), vẫn yêu cầu header admin như `/api/smtp/send`.
 */
export const legacySendEmailHandler: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    requireAdminRole(req);
    const body = (req.body ?? {}) as {
      to?: string | string[];
      subject?: string;
      text?: string;
    };
    if (!body.to || !body.subject) {
      throw new HttpError(400, "Missing 'to' or 'subject'", {
        code: "BAD_REQUEST",
      });
    }
    if (!body.text) {
      throw new HttpError(400, "Missing 'text'", { code: "BAD_REQUEST" });
    }

    const env = envPartial();
    const cfg = mergeTransport({});
    const fromCandidate = env.defaultFrom;
    if (!fromCandidate) {
      throw new HttpError(
        400,
        "Missing sender: set EMAIL_USER or SMTP_FROM",
        {
          code: "BAD_REQUEST",
        },
      );
    }

    const transport = nodemailer.createTransport(cfg);
    try {
      const info = await transport.sendMail({
        from: fromCandidate,
        to: body.to,
        subject: body.subject,
        text: body.text,
      });
      res.status(200).json({
        ok: true,
        message: "Email sent successfully!",
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } finally {
      transport.close();
    }
  },
);
