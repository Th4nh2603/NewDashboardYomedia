import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";
import { authRouter } from "./routers/auth.js";
import { userRouter } from "./routers/user.js";
import { permissionsRouter } from "./routers/permissions.js";
import { adminRouter } from "./routers/admin.js";
import { creativeRouter } from "./routers/creative.js";
import { activityLogRouter } from "./routers/activityLog.js";
import { testDataRouter } from "./routers/testData.js";
import { ragRouter } from "./routers/rag.js";
import { toolTestRouter } from "./routers/toolTest.js";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  permissions: permissionsRouter,
  admin: adminRouter,
  creative: creativeRouter,
  activityLog: activityLogRouter,
  testData: testDataRouter,
  rag: ragRouter,
  toolTest: toolTestRouter,
});

export type AppRouter = typeof appRouter;
