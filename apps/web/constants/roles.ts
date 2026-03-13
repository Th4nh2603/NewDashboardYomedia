export const roles = {
  ADMIN: "admin",
  USER: "user",
  EDITOR: "editor",
} as const;

export type Role = (typeof roles)[keyof typeof roles];
