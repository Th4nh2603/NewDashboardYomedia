import { router } from "./trpc.js";
import { healthRouter } from "../controllers/infra/health.js";
import { authRouter } from "../controllers/auth/auth.js";
import { userRouter } from "../controllers/auth/user.js";
import { permissionsRouter } from "../controllers/auth/permissions.js";
import { adminRouter } from "../controllers/admin/admin.js";
import { creativeRouter } from "../controllers/creative/creative.js";
import { activityLogRouter } from "../controllers/activity/activityLog.js";
import { testDataRouter } from "../controllers/platform/testData.js";
import { toolTestRouter } from "../controllers/platform/toolTest.js";
import { ragRouter } from "../controllers/chat/rag.js";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  permissions: permissionsRouter,
  admin: adminRouter,
  creative: creativeRouter,
  activityLog: activityLogRouter,
  testData: testDataRouter,
  toolTest: toolTestRouter,
  rag: ragRouter,
});

export type AppRouter = typeof appRouter;
