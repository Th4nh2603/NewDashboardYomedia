import type { Intent } from "../core/types.js";

export type IntentClassification = {
  intent: Intent;
  confidence: number;
  reason: string;
};
