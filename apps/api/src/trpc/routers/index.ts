import { router } from "../trpc.js";
import { authRouter } from "./auth.router.js";
import { userRouter } from "./user.router.js";
import { roleRouter } from "./role.router.js";
import { permissionRouter } from "./permission.router.js";
import { brandRouter } from "./brand.router.js";
import { campaignRouter } from "./campaign.router.js";
import { reportRouter } from "./report.router.js";
import { chatRouter } from "./chat.router.js";
import { documentRouter } from "./document.router.js";
import { knowledgeRouter } from "./knowledge.router.js";
import { agentRouter } from "./agent.router.js";
import { mcpRouter } from "./mcp.router.js";
import { healthRouter } from "./health.router.js";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  role: roleRouter,
  permission: permissionRouter,
  brand: brandRouter,
  campaign: campaignRouter,
  report: reportRouter,
  chat: chatRouter,
  document: documentRouter,
  knowledge: knowledgeRouter,
  agent: agentRouter,
  mcp: mcpRouter,
});

export type AppRouter = typeof appRouter;
