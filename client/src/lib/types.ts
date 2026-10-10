// Domain + API types for the Nexora backend. Field names mirror the server wire format.

export type WorkspaceRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: string | null;
  role?: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface ListMembersItem {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string;
  startDate: string | null;
  dueDate: string | null;
  archivedAt: string | null;
  progress: number;
  tasksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberLite {
  id: string;
  role: 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER' | null;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface ProjectDetail {
  project: Project;
  members: ProjectMemberLite[];
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskBriefUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  position: number;
  version: number;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskBriefUser | null;
  reporter?: TaskBriefUser | null;
}

export interface TaskDetail {
  task: Task & {
    project: { id: string; name: string; workspaceId: string };
    assignee: TaskBriefUser | null;
    reporter: TaskBriefUser | null;
  };
  comments: Comment[];
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; avatarUrl: string | null };
}

export type ActivityEntityType =
  | 'USER'
  | 'WORKSPACE'
  | 'WORKSPACE_MEMBER'
  | 'PROJECT'
  | 'PROJECT_MEMBER'
  | 'TASK'
  | 'COMMENT'
  | 'NOTIFICATION'
  | 'INVITATION';

export interface ActivityItem {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  actorId: string | null;
  action: string;
  entityType: ActivityEntityType;
  entityId: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; avatarUrl: string | null } | null;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
}

export interface DashboardSummary {
  totalTasks: number;
  totalDone: number;
  completionRate: number;
  overdueTasks: number;
  dueSoonTasks: number;
  dueSoonProjects: number;
  projects: number;
  members: number;
  tasksCompletedThisWeek: number;
}

export interface DashboardRecentTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: { id: string; name: string };
  updatedAt: string;
}

export interface DashboardStats {
  summary: DashboardSummary;
  byStatus: Partial<Record<TaskStatus, number>>;
  byPriority: Partial<Record<TaskPriority, number>>;
  recentTasks: DashboardRecentTask[];
  recentActivity: ActivityItem[];
}

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_COMMENTED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_MEMBER_ADDED'
  | 'WORKSPACE_INVITE'
  | 'MENTION'
  | 'DUE_SOON';

export interface AppNotification {
  id: string;
  recipientId: string;
  workspaceId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  targetType: ActivityEntityType | null;
  targetId: string | null;
  readAt: string | null;
  createdAt: string;
  actor?: { id: string; name: string; avatarUrl: string | null } | null;
  workspace?: { id: string; name: string };
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  token?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

// ---- Error envelope ----
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VERSION_CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;
  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
  isVersionConflict(): boolean {
    return this.code === 'VERSION_CONFLICT';
  }
  get validationIssues(): ValidationIssue[] {
    return Array.isArray(this.details) ? (this.details as ValidationIssue[]) : [];
  }
  get currentVersion(): number | null {
    if (this.code === 'VERSION_CONFLICT' && this.details && typeof this.details === 'object') {
      const v = (this.details as { currentVersion?: unknown }).currentVersion;
      return typeof v === 'number' ? v : null;
    }
    return null;
  }
}