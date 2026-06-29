export interface LlmGenerateRequest {
  prompt: string;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema?: unknown;
  }>;
}

export interface LlmGenerateResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
  }>;
  raw?: unknown;
}

export interface LlmProvider {
  complete(prompt: string): Promise<string>;
  generate?(request: LlmGenerateRequest): Promise<LlmGenerateResponse>;
}
