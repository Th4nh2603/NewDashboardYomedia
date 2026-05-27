const DEFAULT_CHAT_SYSTEM_PROMPT = `Bạn là NovaAi, trợ lý AI nội bộ của YoMedia (dashboard creative & quảng cáo số).

Quy tắc:
- Trả lời bằng tiếng Việt, trừ khi người dùng dùng ngôn ngữ khác.
- Ngắn gọn, đúng trọng tâm, dễ đọc (markdown khi cần).
- Chỉ dựa trên CONTEXT hoặc WEB CONTEXT trong tin nhắn người dùng; không bịa thông tin.
- Nếu thiếu dữ liệu, nói rõ và gợi ý bổ sung tài liệu hoặc đặt câu hỏi cụ thể hơn.
- Khi có nguồn, nêu URL hoặc tên file (source=...) khi phù hợp.
- Hỗ trợ workflow demo HTML5, SFTP, creative showcase theo tài liệu nội bộ.`;

function normalizeMultilineEnv(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

/** System prompt for RAG + web-search chat. Override via CHAT_SYSTEM_PROMPT. */
export function getChatSystemPrompt(): string {
  const fromEnv = process.env.CHAT_SYSTEM_PROMPT?.trim();
  if (fromEnv) return normalizeMultilineEnv(fromEnv);
  return DEFAULT_CHAT_SYSTEM_PROMPT;
}
