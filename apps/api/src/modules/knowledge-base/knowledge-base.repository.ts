import type { KnowledgeBase, ScopedKnowledgeBaseQuery } from "./knowledge-base.types.js";

function notImplemented(operation: string): never {
  throw new Error(`Knowledge-base repository ${operation} is not implemented yet.`);
}

export const knowledgeBaseRepository = {
  async list(_query: ScopedKnowledgeBaseQuery): Promise<KnowledgeBase[]> {
    return notImplemented("list");
  },
};
