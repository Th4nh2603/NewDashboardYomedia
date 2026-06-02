import {
  buildDeleteDemoPlan,
  buildUploadDemoPlan,
  shouldHandleDeleteDemo,
  shouldHandleUploadDemo,
} from "../actions/actionPlanner.js";
import type {
  ChatAiProvider,
  ChatAttachmentMeta,
  RagAnswerResult,
} from "../core/types.js";
import { guardActionPlan, guardQuestionInput } from "../guardrails/index.js";
import { classifyUserIntent } from "../intent/classifyUserIntent.js";
import { logAiEvent } from "../logging/aiLogger.js";
import {
  answerFromInternalDocs,
  answerWithWebSearch,
  generateAnswer,
  requireApiKey,
} from "../retrieval/retrievalEngine.js";
import { parseWebSearchQuestion } from "../tavily.js";

export async function answerWithRag(params: {
  question: string;
  provider?: ChatAiProvider;
  attachments?: ChatAttachmentMeta[];
}): Promise<RagAnswerResult> {
  const question = params.question.trim();
  const questionGuard = guardQuestionInput(question);
  if (!questionGuard.allowed) {
    logAiEvent("guardrail.blocked", {
      stage: "input",
      reason: questionGuard.reason,
      questionLength: question.length,
    }, "warn");
    return {
      answer: questionGuard.userMessage,
      provider: params.provider === "openai" ? "openai" : "gemini",
      mode: "clarification",
      sources: [],
      rag: null,
    };
  }
  const attachments = params.attachments ?? [];

  const provider: ChatAiProvider =
    params.provider === "openai" ? "openai" : "gemini";
  const apiKey = requireApiKey(provider);
  const intent = await classifyUserIntent({
    question,
    provider,
    apiKey,
    generateText: generateAnswer,
  });
  logAiEvent("intent.classified", {
    provider,
    label: intent.label,
    confidence: intent.confidence,
  });

  if (intent.label === "clarification_needed" && intent.confidence >= 0.8) {
    return {
      answer:
        "Mình cần thêm thông tin để xử lý chính xác. Bạn có thể cung cấp mục tiêu cụ thể, dữ liệu đầu vào, hoặc tham số cần thực hiện không?",
      provider,
      mode: "clarification",
      intent,
      sources: [],
      rag: null,
    };
  }

  if (intent.label === "unsupported" && intent.confidence >= 0.8) {
    return {
      answer:
        "Yêu cầu này hiện nằm ngoài phạm vi hỗ trợ của hệ thống. Bạn có thể diễn đạt lại theo hướng tra cứu tài liệu nội bộ hoặc thao tác các tool được hỗ trợ (ví dụ upload/delete demo).",
      provider,
      mode: "unsupported",
      intent,
      sources: [],
      rag: null,
    };
  }

  if (shouldHandleDeleteDemo(question)) {
    const plan = buildDeleteDemoPlan(question);
    const actionGuard = guardActionPlan(plan);
    if (!actionGuard.allowed) {
      logAiEvent(
        "guardrail.blocked",
        { stage: "delete_demo", reason: actionGuard.reason, tool: plan.tool },
        "warn",
      );
      return {
        answer: actionGuard.userMessage,
        provider,
        mode: "unsupported",
        intent,
        sources: [],
        rag: null,
      };
    }
    const answer = plan.remotePath
      ? [
          "Delete demo intent detected.",
          `Target folder: ${plan.remotePath}`,
          "Ready to remove this demo folder from demo SFTP.",
        ].join("\n")
      : [
          "Delete demo intent detected.",
          "Will remove the last demo folder uploaded in this chat session.",
        ].join("\n");
    return {
      answer,
      provider,
      mode: "delete_demo",
      intent,
      action: plan,
      sources: [],
      rag: null,
    };
  }

  if (shouldHandleUploadDemo(question)) {
    const plan = buildUploadDemoPlan(question, attachments);
    const actionGuard = guardActionPlan(plan);
    if (!actionGuard.allowed) {
      logAiEvent(
        "guardrail.blocked",
        { stage: "upload_demo", reason: actionGuard.reason, tool: plan.tool },
        "warn",
      );
      return {
        answer: actionGuard.userMessage,
        provider,
        mode: "unsupported",
        intent,
        sources: [],
        rag: null,
      };
    }
    const missing = plan.requiredInputs;
    const pipelineLabel =
      plan.uploadKind === "video"
        ? "video demo (1 MP4/WebM/MOV → tvc.mp4 + make-vast.xml)"
        : "HTML demo (convert base64 + upload)";
    const answer =
      missing.length > 0
        ? [
            "Upload demo intent detected.",
            `Pipeline: ${pipelineLabel}`,
            `Tool selected: ${plan.tool}`,
            `Attachments: ${plan.attachmentsSummary.fileCount} file(s), ${plan.attachmentsSummary.textCount} text, ${plan.attachmentsSummary.binaryCount} video.`,
            `Missing inputs: ${missing.join(", ")}`,
            plan.uploadKind === "video"
              ? "Video flow: attach exactly one video (previews: outstream + instream are generated automatically)."
              : "Please provide missing inputs so execution can continue.",
          ].join("\n")
        : [
            "Upload demo intent detected.",
            `Pipeline: ${pipelineLabel}`,
            `Tool selected: ${plan.tool}`,
            `Remote path: ${plan.remotePath || "(auto from brand)"}`,
            `Brand: ${plan.brand || "(not provided)"}`,
            `DemoId: ${plan.demoId || "(not provided)"}`,
            `DemoValue: ${plan.demoValue || "(not provided)"}`,
            `Attachments: ${plan.attachmentsSummary.fileCount} file(s).`,
            "Preflight passed. Ready to run convert + upload pipeline.",
          ].join("\n");
    return {
      answer,
      provider,
      mode: "upload_demo",
      intent,
      action: plan,
      sources: [],
      rag: null,
    };
  }

  const { isWebSearch, query: webQuery } = parseWebSearchQuestion(question);
  if (isWebSearch) {
    logAiEvent("flow.web_search", { provider });
    const webResult = await answerWithWebSearch({
      query: webQuery,
      provider,
      apiKey,
    });
    return { ...webResult, intent };
  }

  logAiEvent("flow.rag", { provider });
  const ragResult = await answerFromInternalDocs({ question, provider, apiKey });
  return {
    answer: ragResult.answer,
    provider,
    mode: ragResult.mode,
    intent,
    sources: ragResult.sources,
    rag: ragResult.rag,
  };
}
