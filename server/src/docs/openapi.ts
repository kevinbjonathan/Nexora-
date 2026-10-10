import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";

const serverInfo = {
  title: "Nexora API",
  version: "1.0.0",
  description:
    "REST API for Nexora — The Live Project Command Center. Provides workspaces, projects, tasks with optimistic concurrency, comments, activity log, notifications, and a realtime feed via Socket.IO.",
  license: { name: "MIT" },
};

const authSchemes = {
  sessionCookie: {
    type: "apiKey",
    in: "cookie",
    name: env.COOKIE_NAME,
    description: `Session cookie named "${env.COOKIE_NAME}" set on login/register.`,
  },
};

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    email: { type: "string", format: "email" },
    avatarUrl: { type: ["string", "null"] },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] },
  },
};

const errorSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object", nullable: true },
      },
      required: ["code", "message"],
    },
  },
  required: ["error"],
};

const paginationSchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100 },
    total: { type: "integer" },
    totalPages: { type: "integer" },
    hasNextPage: { type: "boolean" },
  },
};

const workspaceSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: ["string", "null"] },
    archivedAt: { type: ["string", "null"], format: "date-time" },
    role: { type: "string", enum: ["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const projectSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    workspaceId: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    status: { type: "string", enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] },
    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    ownerId: { type: "string", format: "uuid" },
    startDate: { type: ["string", "null"], format: "date-time" },
    dueDate: { type: ["string", "null"], format: "date-time" },
    archivedAt: { type: ["string", "null"], format: "date-time" },
    progress: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description:
        "Percentage of active (non-archived) tasks whose status is DONE, rounded to the nearest integer. 0 when the project has no active tasks. Computed server-side; client-submitted values are ignored.",
    },
    tasksCount: { type: "integer", description: "Number of tasks in the project." },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const taskSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    status: { type: "string", enum: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"] },
    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    assigneeId: { type: ["string", "null"], format: "uuid" },
    reporterId: { type: "string", format: "uuid" },
    version: { type: "integer", description: "Optimistic concurrency guard. Required for updates." },
  },
};

export const openapiSpec = {
  openapi: "3.0.3",
  info: serverInfo,
  servers: [{ url: `/api`, description: "Nexora API" }],
  security: [{ sessionCookie: [] }],
  components: {
    securitySchemes: authSchemes,
    schemas: {
      User: userSchema,
      Error: errorSchema,
      Pagination: paginationSchema,
      Workspace: workspaceSchema,
      Project: projectSchema,
      Task: taskSchema,
    },
    responses: {
      Unauthorized: {
        description: "Authentication required or session expired",
        content: { "application/json": { schema: errorSchema } },
      },
      Forbidden: {
        description: "Authenticated but not permitted",
        content: { "application/json": { schema: errorSchema } },
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: errorSchema } },
      },
      ValidationError: {
        description: "Request failed validation",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  },
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Workspaces" },
    { name: "Projects" },
    { name: "Tasks" },
    { name: "Comments" },
    { name: "Activity" },
    { name: "Notifications" },
    { name: "Dashboard" },
  ],
  paths: {
    "/health": { $ref: "#/x-paths-defs/health" },
    "/health/db": { $ref: "#/x-paths-defs/healthDb" },
    "/auth/register": { $ref: "#/x-paths-defs/authRegister" },
    "/auth/login": { $ref: "#/x-paths-defs/authLogin" },
    "/auth/logout": { $ref: "#/x-paths-defs/authLogout" },
    "/auth/me": { $ref: "#/x-paths-defs/authMe" },
    "/auth/password/forgot": { $ref: "#/x-paths-defs/authForgot" },
    "/auth/password/reset": { $ref: "#/x-paths-defs/authReset" },
    "/users/me": { $ref: "#/x-paths-defs/usersMe" },
    "/workspaces": { $ref: "#/x-paths-defs/workspacesListCreate" },
    "/workspaces/{workspaceId}": { $ref: "#/x-paths-defs/workspaceById" },
    "/workspaces/{workspaceId}/members": { $ref: "#/x-paths-defs/workspaceMembers" },
    "/workspaces/{workspaceId}/projects": { $ref: "#/x-paths-defs/projectListCreate" },
    "/projects/{projectId}": { $ref: "#/x-paths-defs/projectById" },
    "/projects/{projectId}/tasks": { $ref: "#/x-paths-defs/taskListCreate" },
    "/projects/{projectId}/tasks/reorder": { $ref: "#/x-paths-defs/taskReorder" },
    "/tasks/{taskId}": { $ref: "#/x-paths-defs/taskById" },
    "/tasks/{taskId}/comments": { $ref: "#/x-paths-defs/commentListCreate" },
    "/notifications": { $ref: "#/x-paths-defs/notificationList" },
    "/workspaces/{workspaceId}/activity": { $ref: "#/x-paths-defs/activityList" },
    "/workspaces/{workspaceId}/dashboard": { $ref: "#/x-paths-defs/dashboard" },
  },
  "x-paths-defs": {
    health: {
      get: {
        tags: ["Health"],
        summary: "Service health",
        security: [],
        responses: { "200": { description: "Service is healthy" } },
      },
    },
    healthDb: {
      get: {
        tags: ["Health"],
        summary: "Database connectivity",
        security: [],
        responses: {
          "200": { description: "Database reachable" },
          "503": { description: "Database unreachable" },
        },
      },
    },
    authRegister: {
      post: {
        tags: ["Auth"],
        summary: "Register and sign in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created; sets the session cookie" },
          "409": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    authLogin: {
      post: {
        tags: ["Auth"],
        summary: "Sign in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sets the session cookie" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    authLogout: {
      post: {
        tags: ["Auth"],
        summary: "Sign out and clear the session cookie",
        security: [],
        responses: { "204": { description: "Signed out" } },
      },
    },
    authMe: {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        responses: { "200": { description: "Profile of the signed-in user" } },
      },
    },
    authForgot: {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset token",
        security: [],
        responses: { "200": { description: "Always returns 200 to avoid enumeration" } },
      },
    },
    authReset: {
      post: {
        tags: ["Auth"],
        summary: "Reset the password with a token",
        security: [],
        responses: { "204": { description: "Password changed" } },
      },
    },
    usersMe: {
      patch: {
        tags: ["Users"],
        summary: "Update own profile",
        responses: { "200": { description: "Updated user" } },
      },
    },
    workspacesListCreate: {
      get: {
        tags: ["Workspaces"],
        summary: "List workspaces I belong to",
        description:
          "Paginated workspaces the authenticated user is a member of. Search filters by an authorized user's own workspaces only — it never reveals workspaces the caller cannot access.",
        parameters: [
          { name: "search", in: "query", required: false, schema: { type: "string", maxLength: 120 }, description: "Case-insensitive match against workspace name or description." },
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "includeArchived", in: "query", required: false, schema: { type: "boolean" } },
        ],
        responses: { "200": { description: "Paginated workspaces" } },
      },
      post: {
        tags: ["Workspaces"],
        summary: "Create a workspace (creator becomes ADMIN)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" }, description: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Created workspace" } },
      },
    },
    workspaceById: {
      get: {
        tags: ["Workspaces"],
        summary: "Get a workspace",
        responses: { "200": { description: "Workspace" } },
      },
      patch: {
        tags: ["Workspaces"],
        summary: "Update workspace details",
        responses: { "200": { description: "Updated workspace" } },
      },
    },
    workspaceMembers: {
      get: {
        tags: ["Workspaces"],
        summary: "List workspace members",
        responses: { "200": { description: "Paginated members" } },
      },
    },
    projectListCreate: {
      get: {
        tags: ["Projects"],
        summary: "List projects in a workspace",
        responses: { "200": { description: "Paginated projects" } },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string" },
                  priority: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created project" } },
      },
    },
    projectById: {
      get: {
        tags: ["Projects"],
        summary: "Get a project",
        responses: { "200": { description: "Project with members" } },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update project",
        responses: { "200": { description: "Updated project" } },
      },
    },
    taskListCreate: {
      get: {
        tags: ["Tasks"],
        summary: "List tasks in a project",
        responses: { "200": { description: "Paginated tasks" } },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: { title: { type: "string" }, assigneeId: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Created task" } },
      },
    },
    taskReorder: {
      post: {
        tags: ["Tasks"],
        summary: "Reorder tasks using optimistic concurrency",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orders"],
                properties: {
                  orders: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "position", "version"],
                      properties: {
                        id: { type: "string" },
                        position: { type: "number" },
                        version: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Tasks reordered" },
          "409": { description: "Version conflict — task changed elsewhere" },
        },
      },
    },
    taskById: {
      get: {
        tags: ["Tasks"],
        summary: "Get a task with its comments",
        responses: { "200": { description: "Task" } },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update a task. `version` is required and enforced optimistically.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["version"],
                properties: {
                  version: { type: "integer" },
                  title: { type: "string" },
                  status: { type: "string" },
                  assigneeId: { type: ["string", "null"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated task" },
          "409": { description: "VERSION_CONFLICT — supply the latest version" },
        },
      },
    },
    commentListCreate: {
      get: {
        tags: ["Comments"],
        summary: "List comments on a task",
        responses: { "200": { description: "Paginated comments" } },
      },
      post: {
        tags: ["Comments"],
        summary: "Add a comment",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: { body: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Created comment" } },
      },
    },
    notificationList: {
      get: {
        tags: ["Notifications"],
        summary: "List my notifications",
        responses: { "200": { description: "Paginated notifications" } },
      },
    },
    activityList: {
      get: {
        tags: ["Activity"],
        summary: "Feed of workspace activity (Change Radar)",
        responses: { "200": { description: "Paginated activity entries" } },
      },
    },
    dashboard: {
      get: {
        tags: ["Dashboard"],
        summary: "Workspace dashboard aggregates",
        responses: { "200": { description: "Dashboard metrics" } },
      },
    },
  },
} as const;

export const docsRouter = Router();

docsRouter.get("/swagger.json", (_req, res) => {
  res.json(openapiSpec);
});
docsRouter.use("/", swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: false }));