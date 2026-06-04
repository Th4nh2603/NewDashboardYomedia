import { MAX_QUESTION_LENGTH } from "../core/config.js";

export function runInputGuardrails(input: string): string | null {
  const text = String(input || "").trim();
  if (!text) return "Tin nhắn trống. Vui lòng nhập câu hỏi.";
  if (text.length > MAX_QUESTION_LENGTH) {
    return `Tin nhắn quá dài (>${MAX_QUESTION_LENGTH} ký tự). Vui lòng rút gọn.`;
  }
  const banned = /(password|token|api key|private key|credit card|cvv)/i;
  if (banned.test(text)) {
    return "Yêu cầu chứa nội dung nhạy cảm. Vui lòng bỏ thông tin bí mật trước khi gửi.";
  }
  return null;
}
