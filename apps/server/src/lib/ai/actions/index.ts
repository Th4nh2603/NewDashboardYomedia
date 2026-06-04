export type { ActionTool, BuildDemoFormat, BuildDemoToolInput } from "./types.js";
export {
  detectTool,
  isBuildDemoSessionActive,
  resolveActionTool,
} from "./detectTool.js";
export { runBuildDemoTool, type BuildDemoToolRunResult } from "./buildDemoTool.js";

import type { ActionTool } from "./types.js";

export function executeTool(tool: ActionTool): string {
  if (tool === "time_now") return `Bây giờ là ${new Date().toLocaleString()}.`;
  if (tool === "build_demo") {
    return [
      "Yêu cầu **Build/Upload Demo** — gửi kèm file, brand, format (HTML hoặc Video). Subject tùy chọn (mặc định `all`).",
      "Ví dụ: `build demo brand Romano format Video` hoặc `upload demo` + file.",
    ].join("\n");
  }
  return [
    "Bạn có thể:",
    "- Hỏi tài liệu nội bộ (RAG)",
    "- Chat tự do",
    "- Tool: `bây giờ mấy giờ?`, `build demo` / `upload demo` (+ file + brand/format; subject mặc định all)",
  ].join("\n");
}
