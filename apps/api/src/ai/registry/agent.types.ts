export interface RegisteredAgent {
  name: "RagAgent" | "SqlAgent" | "GeneralAgent" | "DemoAgent";
  description: string;
  capabilities: string[];
}
