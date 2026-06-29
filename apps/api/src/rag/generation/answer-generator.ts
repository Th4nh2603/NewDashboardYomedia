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
  async generate(input: GenerateRagAnswerInput): Promise<string> {
    const excerpt = input.context
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1_200);
    const citationList = input.citations
      .slice(0, 3)
      .map((citation) => citation.chunkId)
      .join(", ");
    return [
      "Em tìm thấy nội dung liên quan trong tài liệu đã index.",
      "",
      excerpt,
      "",
      citationList ? `Nguồn: ${citationList}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  },
};
