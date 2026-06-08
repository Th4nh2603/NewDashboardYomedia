import OpenAI from "openai";

import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
} from "@google/generative-ai";

import {
  extractUploadDemoBrandFromText,
  resolveCanonicalBuildDemoBrand,
} from "../../../../repositories/brand.repository.js";

import { getModel } from "../../core/config.js";
import { serviceUnavailable } from "../../../http/errors.js";
import { logBestEffort } from "../../../logBestEffort.js";

import type {
  ChatAttachmentMeta,
  ChatProvider,
  MemoryMessage,
} from "../../core/types.js";

import {
  filterAllowedBrandIds,
  listAllowedBrandOptions,
} from "../../../../services/buildDemo/config.js";

import type {
  BuildDemoFormat,
  BuildDemoInput as BuildDemoToolInput,
} from "../../../../shared/schemas/buildDemo.schema.js";

export type BuildDemoAgentResult =
  | { kind: "tool_call"; input: BuildDemoToolInput }
  | { kind: "message"; text: string };

const BUILD_DEMO_OPENAI_TOOL = {
  type: "function" as const,

  function: {
    name: "build_demo",

    description:
      "Build and upload one YoMedia creative demo to SFTP using user-provided metadata and attached files.",

    parameters: {
      type: "object",

      properties: {
        brandId: {
          type: "string",

          description: "Canonical brand id (e.g. Romano, Yomedia).",
        },

        demoFormat: {
          type: "string",

          enum: ["HTML", "Video"],
        },

        folderName: {
          type: "string",

          description:
            "Optional override only. Omit for HTML: server uses uploaded .html basename without extension (e.g. 480x270.html → 480x270). Never use chat words like yes/no as folderName.",
        },

        formatValue: {
          type: "string",

          description:
            "Optional creative-demos.json value for preview f= (e.g. mobile-interstitial-firstview). Omit to infer from banner size.",
        },
      },

      required: ["brandId", "demoFormat"],

      additionalProperties: false,
    },
  },
};

const BUILD_DEMO_GEMINI_DECLARATION: FunctionDeclaration = {
  name: "build_demo",

  description: BUILD_DEMO_OPENAI_TOOL.function.description,

  parameters: {
    type: SchemaType.OBJECT,

    properties: {
      brandId: { type: SchemaType.STRING },

      demoFormat: {
        type: SchemaType.STRING,

        description: "HTML or Video",
      },

      folderName: { type: SchemaType.STRING },

      formatValue: { type: SchemaType.STRING },
    },

    required: ["brandId", "demoFormat"],
  },
};

function collectConversationText(
  question: string,

  history: MemoryMessage[],
): string {
  return [...history.map((m) => m.content), question].join("\n");
}

function resolveBrandHint(
  text: string,

  allowedBrands: string[] | null,
): string | null {
  const raw =
    extractUploadDemoBrandFromText(text) ||
    text.match(/\bbrand\s+([a-z0-9][a-z0-9 _-]*)/i)?.[1]?.trim();

  if (raw) {
    const canonical = resolveCanonicalBuildDemoBrand(raw);

    if (canonical && filterAllowedBrandIds(canonical, allowedBrands)) {
      return canonical;
    }
  }

  for (const { id, label } of listAllowedBrandOptions(allowedBrands)) {
    const token = String(label || id).trim();

    if (!token) continue;

    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
      const canonical = resolveCanonicalBuildDemoBrand(id);

      if (canonical && filterAllowedBrandIds(canonical, allowedBrands)) {
        return canonical;
      }
    }
  }

  return null;
}

function extractFormatHint(text: string): BuildDemoFormat | null {
  const explicit = text.match(/\bformat\s*[:=]?\s*(video|html)\b/i);

  if (explicit) {
    return explicit[1].toLowerCase() === "video" ? "Video" : "HTML";
  }

  if (/\b(video|mp4|webm|mov)\b/i.test(text) && !/\bhtml\b/i.test(text)) {
    return "Video";
  }

  if (/\bhtml\b/i.test(text) && !/\b(video|mp4)\b/i.test(text)) {
    return "HTML";
  }

  return null;
}

function attachmentsHavePayload(attachments: ChatAttachmentMeta[]): boolean {
  return attachments.some((att) => Boolean(att.contentBase64?.trim()));
}

/** When brand + format + files are known, run build without waiting for LLM tool call. */

export function resolveBuildDemoToolInput(input: {
  question: string;

  history: MemoryMessage[];

  allowedBrands: string[] | null;

  attachments: ChatAttachmentMeta[];
}): BuildDemoToolInput | null {
  if (!attachmentsHavePayload(input.attachments)) return null;

  const conversation = collectConversationText(
    input.question,

    input.history,
  );

  const brandId = resolveBrandHint(conversation, input.allowedBrands);

  const demoFormat = extractFormatHint(conversation);

  if (!brandId || !demoFormat) return null;

  const formatValue = conversation
    .match(
      /\b(?:formatValue|demoValue|creative)\s*[:=]?\s*([a-z0-9][a-z0-9_-]*)/i,
    )?.[1]
    ?.trim();

  return {
    brandId,

    demoFormat,

    ...(formatValue ? { formatValue } : {}),
  };
}

function summarizeAttachments(attachments: ChatAttachmentMeta[]): string {
  if (!attachments.length) {
    return "Không có file trong session (user cần đính kèm HTML hoặc video).";
  }

  return attachments

    .map((att) => {
      const ext = att.name.includes(".") ? att.name.split(".").pop() : "";

      return `${att.name} (${att.mimeType || ext || "unknown"}, ${att.size} bytes)`;
    })

    .join("; ");
}

function buildAgentPrompt(input: {
  question: string;

  history: MemoryMessage[];

  allowedBrands: string[] | null;

  attachments: ChatAttachmentMeta[];
}): string {
  const conversation = collectConversationText(input.question, input.history);

  const brandHint = resolveBrandHint(conversation, input.allowedBrands);

  const formatHint = extractFormatHint(conversation);

  const brandOptions = listAllowedBrandOptions(input.allowedBrands)
    .map((b) => b.label)

    .join(", ");

  const knownSlots = [
    brandHint ? `brand=${brandHint}` : null,
    formatHint ? `demoFormat=${formatHint}` : null,
    input.attachments.length ? `files=${input.attachments.length}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    "You route Build Demo requests for YoMedia dashboard.",
    "Merge metadata across the full conversation (history + latest message).",
    "Ask only for brand, format, or files if missing.",
    "If brand, format HTML|Video, and session files are all satisfied, call tool `build_demo` once.",
    "If Session attachments lists one or more files with size > 0, treat files as already uploaded — never ask the user to attach or re-upload them; only ask for missing brand or format.",
    "HTML demos: user should attach HTML/JS plus image assets in the same session; server inlines images as base64 into manifest before SFTP (images are not uploaded as separate files).",
    "HTML folder on SFTP: derived from the uploaded .html filename (480x270.html → folder 480x270). Do not pass folderName unless user explicitly names a folder; never map yes/ok/confirm to folderName.",
    "If metadata is missing, reply in Vietnamese listing exactly what is still needed (no tool call).",
    "",
    `Allowed brands: ${brandOptions || "(none — contact admin)"}`,
    "",
    `Session attachments: ${summarizeAttachments(input.attachments)}`,
    knownSlots
      ? `Known slots from conversation: ${knownSlots}.`
      : "Known slots: none yet.",
    "",
    `User message: ${JSON.stringify(input.question)}`,
  ].join("\n");
}

function parseToolArgs(raw: unknown): BuildDemoToolInput | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const demoFormat = String(obj.demoFormat ?? "").trim();

  if (demoFormat !== "HTML" && demoFormat !== "Video") return null;

  const brandId = String(obj.brandId ?? "").trim();

  if (!brandId) return null;

  const folderName = String(obj.folderName ?? "").trim();
  const folderSegment = folderName.replace(/\s+/g, "-").replace(/\/+/g, "-");
  const formatValue = String(obj.formatValue ?? "").trim();

  return {
    brandId,

    demoFormat: demoFormat as BuildDemoFormat,

    ...(folderSegment.length > 5 ? { folderName: folderSegment } : {}),

    ...(formatValue ? { formatValue } : {}),
  };
}

async function callOpenAiBuildDemoAgent(
  question: string,

  history: MemoryMessage[],

  allowedBrands: string[] | null,

  attachments: ChatAttachmentMeta[],
): Promise<BuildDemoAgentResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) throw serviceUnavailable("OPENAI_API_KEY is missing");

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: getModel("openai"),

    messages: [
      {
        role: "system",

        content: buildAgentPrompt({
          question,

          history,

          allowedBrands,

          attachments,
        }),
      },

      ...history.map((m) => ({ role: m.role, content: m.content })),

      { role: "user", content: question },
    ],

    tools: [BUILD_DEMO_OPENAI_TOOL],

    tool_choice: "auto",

    temperature: 0.1,
  });

  const message = completion.choices[0]?.message;

  const toolCall = message?.tool_calls?.[0];

  if (
    toolCall?.type === "function" &&
    toolCall.function.name === "build_demo"
  ) {
    try {
      const parsed = parseToolArgs(
        JSON.parse(toolCall.function.arguments || "{}"),
      );

      if (parsed) return { kind: "tool_call", input: parsed };
    } catch (err) {
      logBestEffort("ai.buildDemoAgent.openaiToolArgs", err);
    }
  }

  const text = message?.content?.trim();

  return {
    kind: "message",

    text:
      text ||
      "Chưa đủ thông tin Build Demo. Cần: brand, format (HTML hoặc Video), file đính kèm.",
  };
}

async function callGeminiBuildDemoAgent(
  question: string,

  history: MemoryMessage[],

  allowedBrands: string[] | null,

  attachments: ChatAttachmentMeta[],
): Promise<BuildDemoAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) throw serviceUnavailable("GEMINI_API_KEY is missing");

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: getModel("gemini"),

    tools: [{ functionDeclarations: [BUILD_DEMO_GEMINI_DECLARATION] }],
  });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",

        parts: [
          {
            text: buildAgentPrompt({
              question,

              history,

              allowedBrands,

              attachments,
            }),
          },
        ],
      },

      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",

        parts: [{ text: m.content }],
      })),

      { role: "user", parts: [{ text: question }] },
    ],
  });

  const parts = response.response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const call = (part as { functionCall?: { name?: string; args?: unknown } })
      .functionCall;

    if (call?.name === "build_demo") {
      const parsed = parseToolArgs(call.args);

      if (parsed) return { kind: "tool_call", input: parsed };
    }
  }

  const text = response.response.text().trim();

  return {
    kind: "message",

    text:
      text ||
      "Chưa đủ thông tin Build Demo. Cần: brand, format (HTML hoặc Video), file đính kèm.",
  };
}

export async function invokeBuildDemoAgent(input: {
  provider: ChatProvider;

  question: string;

  history: MemoryMessage[];

  allowedBrands: string[] | null;

  attachments: ChatAttachmentMeta[];
}): Promise<BuildDemoAgentResult> {
  const ready = resolveBuildDemoToolInput({
    question: input.question,

    history: input.history,

    allowedBrands: input.allowedBrands,

    attachments: input.attachments,
  });

  if (ready) {
    return { kind: "tool_call", input: ready };
  }

  return input.provider === "openai"
    ? callOpenAiBuildDemoAgent(
        input.question,

        input.history,

        input.allowedBrands,

        input.attachments,
      )
    : callGeminiBuildDemoAgent(
        input.question,

        input.history,

        input.allowedBrands,

        input.attachments,
      );
}
