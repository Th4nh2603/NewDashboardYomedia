import { readFile, writeFile } from "fs/promises";
import { z } from "zod";
import { HttpError } from "../../lib/http/errors.js";
import { getUserRole } from "../../lib/auth/role.js";
import { creativeDemosPath } from "../../services/infra/paths.js";
import {
  readStoredPlatformSnapshot,
  writePlatformSnapshot,
} from "../../services/platform/platformSnapshot.js";
import {
  fetchPlacementEmbedCode,
  fetchPlatformTestSnapshot,
} from "../../services/platform/yomediaPlatform.js";
import { protectedProcedure, router, runHandler } from "../../trpc/trpc.js";

const WRITE_ROLES = new Set(["admin", "design"]);

export const testDataRouter = router({
  platform: protectedProcedure.query(({ ctx }) =>
    runHandler(async () => {
      const role = getUserRole(ctx.req);
      if (!role) {
        throw new HttpError(403, "Missing or invalid role", { code: "FORBIDDEN" });
      }
      const snapshot = await fetchPlatformTestSnapshot();
      const stored = await writePlatformSnapshot(snapshot);
      return {
        ok: true as const,
        ...snapshot,
        savedAt: stored.savedAt,
        savedTo: "apps/server/src/data/platform-snapshot.json",
      };
    }),
  ),

  placementCode: protectedProcedure
    .input(
      z.object({
        placementId: z.string().min(1),
        variant: z.enum(["standard", "rtb"]).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      runHandler(async () => {
        const role = getUserRole(ctx.req);
        if (!role) {
          throw new HttpError(403, "Missing or invalid role", { code: "FORBIDDEN" });
        }
        const data = await fetchPlacementEmbedCode(
          input.placementId,
          input.variant ?? "standard",
        );
        return { ok: true as const, ...data };
      }),
    ),

  platformFile: protectedProcedure.query(({ ctx }) =>
    runHandler(async () => {
      const role = getUserRole(ctx.req);
      if (!role) {
        throw new HttpError(403, "Missing or invalid role", { code: "FORBIDDEN" });
      }
      const stored = await readStoredPlatformSnapshot();
      if (!stored) {
        return {
          ok: true as const,
          exists: false as const,
          savedTo: "apps/server/src/data/platform-snapshot.json",
        };
      }
      const { savedAt, source, ...snapshot } = stored;
      return {
        ok: true as const,
        exists: true as const,
        savedAt,
        source,
        savedTo: "apps/server/src/data/platform-snapshot.json",
        ...snapshot,
      };
    }),
  ),

  get: protectedProcedure.query(({ ctx }) =>
    runHandler(async () => {
      const role = getUserRole(ctx.req);
      if (!role) {
        throw new HttpError(403, "Missing or invalid role", { code: "FORBIDDEN" });
      }
      let raw = await readFile(creativeDemosPath, "utf8").catch(
        (err: NodeJS.ErrnoException) => {
          if (err.code === "ENOENT") return "";
          throw err;
        },
      );
      const trimmed = raw.trim();
      if (trimmed === "") {
        return { ok: true as const, content: '{"demos":[]}\n' };
      }
      try {
        JSON.parse(trimmed);
      } catch {
        throw new HttpError(500, "Stored creative-demos.json is not valid JSON", {
          code: "INVALID_STORED_JSON",
        });
      }
      return { ok: true as const, content: raw };
    }),
  ),

  update: protectedProcedure
    .input(
      z.object({
        content: z.union([z.string(), z.record(z.unknown())]).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        const role = getUserRole(ctx.req);
        if (!WRITE_ROLES.has(role)) {
          throw new HttpError(
            403,
            "Forbidden: only admin/design can update creative-demos.json",
            { code: "FORBIDDEN" },
          );
        }
        const raw = input.content;
        let text: string;
        if (typeof raw === "string") {
          text = raw;
        } else if (raw !== undefined && raw !== null && typeof raw === "object") {
          text = JSON.stringify(raw);
        } else {
          throw new HttpError(
            400,
            "Body must include content as a JSON string (or JSON object to store).",
            { code: "BAD_REQUEST" },
          );
        }
        const trimmedForParse = text.trim() === "" ? "{}" : text;
        try {
          JSON.parse(trimmedForParse);
        } catch {
          throw new HttpError(400, "content is not valid JSON", {
            code: "BAD_REQUEST",
          });
        }
        const toWrite = text.trim() === "" ? "{}" : text;
        await writeFile(
          creativeDemosPath,
          toWrite.endsWith("\n") ? toWrite : `${toWrite}\n`,
          "utf8",
        );
        return { ok: true as const };
      }),
    ),
});
