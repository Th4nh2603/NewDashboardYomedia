# AGENT.md — NewDashboardYomedia

Guidance for AI agents and contributors working in this monorepo.

## Project layout

| Path | Role |
|------|------|
| `apps/web` | React 19 + Vite admin UI (Clerk, tRPC client, TanStack Query) |
| `apps/server` | Express + tRPC API, SFTP, RAG/AI orchestration, SMTP |
| `apps/mobile` | Expo app (parallel development) |
| `packages/*` | Shared workspace packages (e.g. `@yomedia/api`) |

Dev: `pnpm dev` from repo root. Web proxies `/api` to the server port written in `apps/web/.dev-api-port`.

## Error handling (required)

Follow **throw at boundaries, catch at edges**. Do not scatter `try/catch` without a clear reason.

### Server (`apps/server`)

| Layer | Rule |
|-------|------|
| **Services / lib** | Throw `HttpError` from `src/lib/http/errors.ts`. Use factories: `badRequest()`, `forbidden()`, `serviceUnavailable()`, etc. Set `code` via `ErrorCode` (`VALIDATION`, `SFTP`, `EXTERNAL_API`, …). |
| **tRPC routers** | Prefer thin handlers. Errors are normalized by `httpErrorMiddleware` on every procedure (`src/trpc/trpc.ts`). `runHandler()` is optional but still valid. |
| **Express REST** | Use `asyncHandler()`; never swallow errors. Global `errorHandler` maps unknown errors with `errToHttpError()`. |
| **Best-effort** (logging, JSON parse, LLM fallback) | Use `logBestEffort(context, err)` from `src/lib/logBestEffort.ts`. Never empty `catch {}` without logging. |
| **Chat / tools** | Business outcomes may return `{ ok: false, answer }` or user-facing strings (e.g. Build Demo). Do not throw for expected validation inside chat tools when the UX is a reply message. |

```ts
import { badRequest, HttpError, ErrorCode } from "./lib/http/errors.js";

throw badRequest("Missing field");
throw new HttpError(403, "Admin only", { code: ErrorCode.FORBIDDEN });
```

### Web (`apps/web`)

| Layer | Rule |
|-------|------|
| **API calls** | Use `api.*` from `lib/trpc/api.ts` (wraps tRPC → `BackendRequestError`) or `fetchJsonOrThrow()` for REST (`/api/sftp`, upload, …). |
| **UI errors** | Use `useError().handleApiError(err, "Context")` for toasts. Use `getApiErrorMessage(err, "Context")` for inline text (chat bubbles, labels). |
| **Async handlers** | Prefer `useAsyncAction().run("Context", () => api....)` — one try/catch, optional toast. Pattern: `try { ... } catch (e) { handleApiError(e, ctx); } finally { setLoading(false); }`. |
| **Normalization** | `normalizeApiError(err)` in `lib/normalizeApiError.ts` converts tRPC / fetch / `Error` → `BackendRequestError`. Presentation: `getApiErrorPresentation()` in `lib/apiErrorPresentation.ts`. |
| **Codes** | Mirror server codes in `lib/errorCodes.ts`. |
| **Local validation** | `notify(message, 'warning')` — no try/catch. |
| **Client-only AI** (Gemini in browser, AI Studio) | Still use `handleApiError`; special-case messages like "Requested entity was not found" in `ErrorContext` when needed. |

```ts
import { useError } from "../contexts/ErrorContext";
import { useAsyncAction } from "../hooks/useAsyncAction";

const { handleApiError } = useError();
// or
const { run } = useAsyncAction();
await run("Save settings", () => api.admin.updateAccount(id, patch));
```

### Do not

- Add `try/catch` around every `await` in services (server) or components (web).
- Use `catch (e: any)` — use `unknown` and normalize.
- Duplicate HTTP status → title mapping outside `apiErrorPresentation.ts` / `ErrorContext`.
- Commit secrets (`.env`, API keys).

### Maps (server → client)

| Server | Client |
|--------|--------|
| `HttpError` + `errorFormatter` (`httpStatus`, `code`) | `trpcErrorToBackend()` → `BackendRequestError` |
| Express `{ ok: false, error, code? }` | `backendErrorFromResponse()` |
| `ErrorCode.*` | `lib/errorCodes.ts` (same string values) |

## Conventions

- TypeScript strict; match existing import style (`.js` extensions on server ESM).
- Minimize diff scope; reuse existing helpers.
- Commits only when the user asks.
- UI copy: Vietnamese is common for internal tools; API/error titles in English in toasts is acceptable.

## Key files

- Server errors: `apps/server/src/lib/http/errors.ts`, `apps/server/src/trpc/trpc.ts`
- Web errors: `apps/web/lib/apiError.ts`, `apps/web/lib/trpc/errors.ts`, `apps/web/contexts/ErrorContext.tsx`
- AI chat: `apps/server/src/lib/ai/orchestration/answerWithRag.ts`, `apps/web/components/Chat.tsx`
