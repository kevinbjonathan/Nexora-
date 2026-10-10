import type { WorkspaceRole } from "../../generated/prisma/client.js";

export type Permission =
  | "workspace:view"
  | "workspace:update"
  | "workspace:archive"
  | "workspace:manage_members"
  | "invitation:manage"
  | "project:view"
  | "project:create"
  | "project:update"
  | "project:archive"
  | "project:manage_members"
  | "task:view"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:assign"
  | "comment:create"
  | "comment:update_any"
  | "comment:delete_any"
  | "activity:view"
  | "dashboard:view"
  | "notification:view";

const VIEWER: Permission[] = [
  "workspace:view",
  "project:view",
  "task:view",
  "activity:view",
  "dashboard:view",
  "notification:view",
];

const TEAM_MEMBER: Permission[] = [...VIEWER, "task:create", "comment:create"];

const PROJECT_MANAGER: Permission[] = [
  ...TEAM_MEMBER,
  "project:create",
  "project:update",
  "project:manage_members",
  "task:update",
  "task:delete",
  "task:assign",
  "comment:update_any",
];

const ADMIN: Permission[] = [
  "workspace:view",
  "workspace:update",
  "workspace:archive",
  "workspace:manage_members",
  "invitation:manage",
  "project:view",
  "project:create",
  "project:update",
  "project:archive",
  "project:manage_members",
  "task:view",
  "task:create",
  "task:update",
  "task:delete",
  "task:assign",
  "comment:create",
  "comment:update_any",
  "comment:delete_any",
  "activity:view",
  "dashboard:view",
  "notification:view",
];

const ROLE_PERMISSIONS: Record<WorkspaceRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(ADMIN),
  PROJECT_MANAGER: new Set(PROJECT_MANAGER),
  TEAM_MEMBER: new Set(TEAM_MEMBER),
  VIEWER: new Set(VIEWER),
};

export function roleHasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
