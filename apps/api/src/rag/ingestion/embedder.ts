export interface EmbedTextInput {
  text: string;
  model: string;
}

export interface TextEmbedder {
  embed(input: EmbedTextInput): Promise<number[]>;
}

export const embedder: TextEmbedder = {
  async embed(_input: EmbedTextInput): Promise<number[]> {
    throw new Error("RAG embedding provider is not configured.");
  },
};
