import type { RegisteredAgent } from "./agent.types.js";

const registeredAgents: RegisteredAgent[] = [
  {
    name: "RagAgent",
    description: "Answers from authorized documents and citations.",
    capabilities: ["rag-retrieval", "citations"],
  },
  {
    name: "SqlAgent",
    description: "Reads and reports structured data through SQL safety checks.",
    capabilities: ["read-only-sql"],
  },
  {
    name: "GeneralAgent",
    description: "Handles normal LLM answers without external tool execution.",
    capabilities: ["llm"],
  },
  {
    name: "DemoAgent",
    description: "Browses demo previews and SFTP workflows through ToolGateway.",
    capabilities: ["demo-sftp", "tool-gateway"],
  },
];

export class AgentRegistry {
  private readonly agents = new Map(
    registeredAgents.map((agent) => [agent.name, agent] as const),
  );

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  get(name: RegisteredAgent["name"]): RegisteredAgent | undefined {
    return this.agents.get(name);
  }

  assertRegistered(name: RegisteredAgent["name"]): RegisteredAgent {
    const agent = this.get(name);
    if (!agent) throw new Error(`Agent ${name} is not registered.`);
    return agent;
  }
}

export const agentRegistry = new AgentRegistry();
