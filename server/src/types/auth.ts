import type { WorkspaceRole } from "../generated/prisma/client.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  status: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  sessionId: string;
}

export interface WorkspaceAccess {
  workspaceId: string;
  role: WorkspaceRole;
}
