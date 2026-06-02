export type UserIntentLabel =
  | "knowledge_qa"
  | "action_request"
  | "hybrid"
  | "clarification_needed"
  | "unsupported";

export type UserIntentClassification = {
  label: UserIntentLabel;
  confidence: number;
  reason: string;
};
