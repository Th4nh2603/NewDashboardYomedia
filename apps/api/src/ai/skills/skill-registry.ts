import { readdir, readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { z } from "zod";
import type { AgentContext } from "../runtime/agent-context.js";
import type { RegisteredTool } from "../tools/tool-registry.js";

export interface SkillCatalogEntry {
  name: string;
  description: string;
  path: string;
}

const skillNameSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);

function isInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(target);
  return (
    resolvedTarget === resolvedRoot ||
    resolvedTarget.startsWith(`${resolvedRoot}${sep}`)
  );
}

function sanitizeSkillBody(body: string): string {
  return body
    .split(/\r?\n/)
    .filter(
      (line) => !/^\s*(api[_-]?key|token|secret|password)\s*[:=]/i.test(line),
    )
    .join("\n")
    .slice(0, 50_000);
}

function parseSkillHeader(body: string): {
  name?: string;
  description?: string;
} {
  const lines = body.split(/\r?\n/).slice(0, 40);
  let name: string | undefined;
  let description: string | undefined;
  for (const line of lines) {
    const nameMatch = line.match(/^name:\s*(.+)$/i);
    if (nameMatch?.[1]) name = nameMatch[1].trim();
    const descriptionMatch = line.match(/^description:\s*(.+)$/i);
    if (descriptionMatch?.[1]) description = descriptionMatch[1].trim();
    const headingMatch = line.match(/^#\s+(.+)$/);
    if (!name && headingMatch?.[1]) name = headingMatch[1].trim();
  }
  return { name, description };
}

function fallbackSkillName(directoryName: string): string {
  return directoryName.trim().toLowerCase().replace(/\s+/g, "-");
}

export class SkillRegistry {
  private readonly catalog = new Map<string, SkillCatalogEntry>();

  constructor(private readonly skillRoot: string) {}

  async preloadCatalog(): Promise<SkillCatalogEntry[]> {
    this.catalog.clear();
    let entries: string[];
    try {
      entries = await readdir(this.skillRoot);
    } catch {
      return [];
    }

    for (const entry of entries) {
      const skillPath = join(this.skillRoot, entry, "SKILL.md");
      if (!isInsideRoot(this.skillRoot, skillPath)) continue;
      try {
        const body = await readFile(skillPath, "utf8");
        const header = parseSkillHeader(body);
        const name = header.name ?? fallbackSkillName(entry);
        if (!skillNameSchema.safeParse(name).success) continue;
        this.catalog.set(name, {
          name,
          description: header.description ?? "No description provided.",
          path: skillPath,
        });
      } catch {
        continue;
      }
    }

    return this.getCatalog();
  }

  getCatalog(): SkillCatalogEntry[] {
    return Array.from(this.catalog.values()).map((entry) => ({ ...entry }));
  }

  async loadSkill(name: string): Promise<{
    name: string;
    description: string;
    body: string;
  } | null> {
    if (!skillNameSchema.safeParse(name).success) return null;
    const entry = this.catalog.get(name);
    if (!entry) return null;
    if (!isInsideRoot(this.skillRoot, entry.path)) return null;
    const body = await readFile(entry.path, "utf8");
    return {
      name: entry.name,
      description: entry.description,
      body: sanitizeSkillBody(body),
    };
  }
}

export function createLoadSkillTool(
  skillRegistry: SkillRegistry,
): RegisteredTool<{ name: string }> {
  return {
    name: "load_skill",
    description:
      "Load the full body of a named backend skill after reviewing the preloaded skill catalog.",
    inputSchema: z.object({ name: skillNameSchema }),
    requiresApproval: false,
    execute: async (input, _context: AgentContext) => {
      const skill = await skillRegistry.loadSkill(input.name);
      if (!skill) {
        return {
          status: "failed",
          summary: `Skill ${input.name} was not found in the preloaded catalog.`,
        };
      }
      return {
        status: "success",
        summary: `Loaded skill ${skill.name}.`,
        data: {
          name: skill.name,
          description: skill.description,
          body: skill.body,
        },
      };
    },
  };
}
