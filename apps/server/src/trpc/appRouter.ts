import { router } from "./trpc.js";
import { healthRouter } from "../modules/infra/controllers/health.js";
import { authRouter } from "../modules/auth/controllers/auth.js";
import { userRouter } from "../modules/auth/controllers/user.js";
import { permissionsRouter } from "../modules/auth/controllers/permissions.js";
import { adminRouter } from "../modules/admin/controllers/admin.js";
import { creativeRouter } from "../modules/creative/controllers/creative.js";
import { activityLogRouter } from "../modules/activity/controllers/activityLog.js";
import { testDataRouter } from "../modules/platform/controllers/testData.js";
import { toolTestRouter } from "../modules/platform/controllers/toolTest.js";
import { platformPagesRouter } from "../modules/platform/controllers/platformPages.js";
import { ragRouter } from "../modules/chat/controllers/rag.js";

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
  platformPages: platformPagesRouter,
  rag: ragRouter,
});

export type AppRouter = typeof appRouter;
