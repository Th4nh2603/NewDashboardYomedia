import { z } from "zod";

export const permissionNameSchema = z.string().min(1);
