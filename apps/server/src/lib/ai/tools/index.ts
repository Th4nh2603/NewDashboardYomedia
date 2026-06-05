export type { ActionTool, BuildDemoFormat, BuildDemoToolInput } from "./types.js";
export {
  detectTool,
  isBuildDemoSessionActive,
  resolveActionTool,
} from "./detectTool.js";
export { runBuildDemoTool, type BuildDemoToolRunResult } from "./buildDemo/buildDemoTool.js";

import type { ActionTool } from "./types.js";

export function executeTool(tool: ActionTool): string {
  if (tool === "time_now") return `Bây giờ là ${new Date().toLocaleString()}.`;
  if (tool === "upload_sftp_demo") {
    return [
      "Intent **Upload SFTP trực tiếp** — upload file user lên SFTP, không nén/inlined base64.",
      "Ví dụ: `upload sftp demo brand Romano format HTML` + file đính kèm.",
    ].join("\n");
  }
  if (tool === "compress_demo_assets") {
    return [
      "Intent **Nén banner/tvc + upload SFTP**.",
      "- HTML/Banner: nén ảnh thành base64 trong file JS/HTML trước khi upload.",
      "- TVC/Video: tự động nén xuống ngưỡng ~4MB trước khi upload.",
    ].join("\n");
  }
  return [
    "Bạn có thể:",
    "- Hỏi tài liệu nội bộ (RAG)",
    "- Chat tự do",
    "- Tool: `bây giờ mấy giờ?`, `upload sftp demo`, `compress demo assets` (+ file + brand/format)",
  ].join("\n");
}
