import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";

function normalizeMessage(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractField(message: string, names: string[]): string | null {
  for (const name of names) {
    const match = message.match(
      new RegExp(`${name}\\s*[:=]\\s*([^,;\\n]+)`, "i"),
    );
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function detectUploadKind(context: AgentContext): "html" | "video" {
  const attachments = context.attachments ?? [];
  if (attachments.length === 0) return "html";
  const videoCount = attachments.filter((item) =>
    /^(video\/|.*\.(mp4|webm|mov|m4v)$)/i.test(
      item.mimeType || item.name,
    ),
  ).length;
  return videoCount === attachments.length ? "video" : "html";
}

export class ToolAgent {
  async execute(context: AgentContext): Promise<AgentResult> {
    const normalized = normalizeMessage(context.message);

    if (
      /\b(delete|remove|undo)\s+(?:last\s+)?demo\b/.test(normalized) ||
      /\bxoa\s+demo\b/.test(normalized)
    ) {
      return {
        agent: "tool",
        output: {
          answer: "Đang chuẩn bị thao tác xóa demo đã upload.",
          action: {
            tool: "delete_uploaded_demo",
            remotePath: extractField(context.message, [
              "path",
              "folder",
              "remote",
              "dir",
              "directory",
            ]),
          },
        },
        steps: [
          {
            name: "tool.select",
            status: "success",
            summary: "Selected delete_uploaded_demo action.",
          },
        ],
      };
    }

    if (
      normalized.includes("upload demo") ||
      normalized.includes("build demo") ||
      (context.attachments?.length ?? 0) > 0
    ) {
      return {
        agent: "tool",
        output: {
          answer: "Đang chuẩn bị workflow upload/build demo.",
          action: {
            tool: "build_demo_convert_upload",
            uploadKind: detectUploadKind(context),
            brand: extractField(context.message, ["brand"]),
            demoValue: extractField(context.message, [
              "format",
              "demo",
              "demoValue",
              "creative",
            ]),
          },
        },
        steps: [
          {
            name: "tool.select",
            status: "success",
            summary: "Selected build_demo_convert_upload action.",
          },
        ],
      };
    }

    return {
      agent: "tool",
      output: {
        answer:
          "Yêu cầu này cần workflow tool. Backend đã route sang ToolAgent; các thao tác demo/banner hiện vẫn được ChatView xử lý bằng flow hiện có.",
      },
      steps: [
        {
          name: "tool.select",
          status: "skipped",
          summary: "No authorized backend tool execution was selected.",
        },
      ],
    };
  }
}
