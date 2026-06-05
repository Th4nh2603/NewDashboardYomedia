import type {

  ChatAttachmentMeta,

  ChatProvider,

  MemoryMessage,

} from "../../core/types.js";

import {
  clearBuildDemoAttachments,
  mergeBuildDemoAttachments,
} from "../../memory/shortMemory.js";

import {
  invokeBuildDemoAgent,
  resolveBuildDemoToolInput,
} from "./buildDemoAgent.js";

import { executeBuildDemo } from "./buildDemoExecutor.js";
import type { ActionTool } from "../types.js";



const BUILD_DEMO_SUCCESS_PREFIX = "Build Demo thành công";

export type BuildDemoToolRunResult = {
  answer: string;
  /** True when agent called build_demo and executeBuildDemo ran (SFTP attempt). */
  executed: boolean;
};

/** Single tool-call flow: agent extracts args → build + SFTP upload → result text. */

export async function runBuildDemoTool(input: {

  question: string;

  provider: ChatProvider;

  history: MemoryMessage[];

  attachments: ChatAttachmentMeta[];

  allowedBrands: string[] | null;

  memoryKey: string;

  actionTool: Extract<ActionTool, "upload_sftp_demo" | "compress_demo_assets">;

}): Promise<BuildDemoToolRunResult> {

  const attachments = mergeBuildDemoAttachments(

    input.memoryKey,

    input.attachments,

  );



  let agentResult;

  try {

    agentResult = await invokeBuildDemoAgent({

      provider: input.provider,

      question: input.question,

      history: input.history,

      allowedBrands: input.allowedBrands,

      attachments,

    });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Agent unavailable";

    return { answer: `Không gọi được agent Build Demo: ${message}`, executed: false };

  }



  const toolInput =

    agentResult.kind === "tool_call"

      ? agentResult.input

      : resolveBuildDemoToolInput({

          question: input.question,

          history: input.history,

          allowedBrands: input.allowedBrands,

          attachments,

        });

  if (!toolInput) {

    const text =

      agentResult.kind === "message"

        ? agentResult.text

        : "Chưa đủ thông tin Build Demo. Cần: brand, format (HTML hoặc Video), file đính kèm.";

    return { answer: text, executed: false };

  }



  const result = await executeBuildDemo({

    toolInput,

    attachments,

    allowedBrands: input.allowedBrands,

    intent:
      input.actionTool === "upload_sftp_demo"
        ? "upload_sftp"
        : "compress_demo_assets",

  });



  if (result.startsWith(BUILD_DEMO_SUCCESS_PREFIX)) {

    clearBuildDemoAttachments(input.memoryKey);

  }



  return { answer: result, executed: true };

}

