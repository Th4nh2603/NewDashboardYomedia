import { router } from "./trpc.js";
import { healthRouter } from "../controllers/trpc/health.js";
import { authRouter } from "../controllers/trpc/auth.js";
import { userRouter } from "../controllers/trpc/user.js";
import { permissionsRouter } from "../controllers/trpc/permissions.js";
import { adminRouter } from "../controllers/trpc/admin.js";
import { creativeRouter } from "../controllers/trpc/creative.js";
import { activityLogRouter } from "../controllers/trpc/activityLog.js";
import { testDataRouter } from "../controllers/trpc/testData.js";
import { toolTestRouter } from "../controllers/trpc/toolTest.js";
import { ragRouter } from "../controllers/trpc/ragRouter.js";

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
