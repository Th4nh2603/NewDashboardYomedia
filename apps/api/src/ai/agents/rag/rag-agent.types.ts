export interface RagAgentSource {
  documentId: string;
  chunkId: string;
  title: string;
  source?: string;
  page?: number;
  section?: string;
  score: number;
}
