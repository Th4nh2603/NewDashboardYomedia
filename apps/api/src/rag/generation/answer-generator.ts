import type { RagCitationDto } from "../rag.types.js";

export interface GenerateRagAnswerInput {
  query: string;
  context: string;
  citations: RagCitationDto[];
}

export interface RagAnswerGenerator {
  generate(input: GenerateRagAnswerInput): Promise<string>;
}

export const answerGenerator: RagAnswerGenerator = {
  async generate(_input: GenerateRagAnswerInput): Promise<string> {
    throw new Error("RAG answer generator is not configured.");
  },
};
