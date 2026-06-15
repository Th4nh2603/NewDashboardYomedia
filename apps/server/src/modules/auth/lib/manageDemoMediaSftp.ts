import type { Request } from "express";
import {
  canSetupBuildDemoMediaSftp,
  canSwitchManageDemoMediaSftp,
} from "../services/permissions.js";
import { getUserRole } from "./role.js";

/** Manage Demo media SFTP host: admin plus canSwitchSftpHost. */
export function isManageDemoMediaSftpAllowed(req: Request): boolean {
  return canSwitchManageDemoMediaSftp(getUserRole(req));
}

/** Build Demo: copy converted upload from demo SFTP to media SFTP. */
export function isBuildDemoMediaSetupAllowed(req: Request): boolean {
  return canSetupBuildDemoMediaSftp(getUserRole(req));
}
