import { ragConfig } from "../rag.config.js";
import { embedder, type TextEmbedder } from "../ingestion/embedder.js";

export async function embedQuery(
  query: string,
  textEmbedder: TextEmbedder = embedder,
): Promise<number[]> {
  return textEmbedder.embed({
    text: query,
    model: ragConfig.defaultEmbeddingModel,
  });
}
