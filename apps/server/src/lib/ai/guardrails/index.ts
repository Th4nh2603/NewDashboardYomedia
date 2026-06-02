type GuardrailAllow = { allowed: true };
type GuardrailBlock = {
  allowed: false;
  reason: string;
  userMessage: string;
};

export type GuardrailDecision = GuardrailAllow | GuardrailBlock;

export function guardQuestionInput(question: string): GuardrailDecision {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      allowed: false,
      reason: "empty_question",
      userMessage: "Câu hỏi đang trống. Vui lòng nhập nội dung.",
    };
  }
  if (trimmed.length > 8000) {
    return {
      allowed: false,
      reason: "question_too_long",
      userMessage:
        "Nội dung quá dài để xử lý an toàn trong một lượt. Vui lòng chia nhỏ câu hỏi.",
    };
  }
  return { allowed: true };
}

export function guardActionPlan(plan: {
  tool?: string;
  remotePath?: string | null;
}): GuardrailDecision {
  const allowedTools = new Set(["build_demo_convert_upload", "delete_uploaded_demo"]);
  if (!plan.tool || !allowedTools.has(plan.tool)) {
    return {
      allowed: false,
      reason: "tool_not_allowed",
      userMessage: "Tool này hiện chưa được phép thực thi.",
    };
  }
  const remotePath = String(plan.remotePath ?? "").trim();
  if (remotePath && /(^|\/)\.\.(\/|$)/.test(remotePath)) {
    return {
      allowed: false,
      reason: "invalid_remote_path",
      userMessage: "Đường dẫn không hợp lệ.",
    };
  }
  return { allowed: true };
}
