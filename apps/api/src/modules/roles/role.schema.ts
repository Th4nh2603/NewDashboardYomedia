import { z } from "zod";

export const roleIdSchema = z.object({
  roleId: z.string().uuid(),
});
