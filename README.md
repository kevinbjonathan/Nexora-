# Nexora

**The Live Project Command Center**

A collaborative project-management platform.

Current repository state: **Phase 3 — full backend API (auth, RBAC, workspaces,
projects, tasks, comments, activity, notifications) + tests.**

```
Nexora/
  server/   Node.js + Express + TypeScript API, Prisma ORM, PostgreSQL
  client/   Placeholder (P0). The real frontend is being built separately.
```

## Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, accessed through Prisma ORM 7 (driver adapter `@prisma/adapter-pg`)
- **Validation:** Zod (environment and request input)
- **Auth:** server-managed cookie sessions (Argon2id password hashing, SHA-256 session tokens)
- **Real-time:** Socket.IO (workspace/project/user rooms)
- **Docs:** OpenAPI 3 + Swagger UI under `/api/docs`
- **Testing:** Vitest + Supertest against an isolated `nexora_test` database

## Prerequisites

- **Node.js >= 22.18** (developed against Node 24)
- **npm**
- A running **PostgreSQL** server and a database you own

## Server setup

```bash
npm --prefix server install
cp server/.env.example server/.env   # then edit the placeholders
```

Configure `server/.env` (see `.env.example` for the full list):

- `DATABASE_URL` — PostgreSQL connection string (host, port, database, user, password)
- `CORS_ORIGIN` — comma-separated browser origins allowed to call the API (no wildcard)
- `SESSION_SECRET` — random string, at least 32 chars
- `PORT` — API port (default `4000`)
- `SESSION_TTL_HOURS`, `COOKIE_NAME`, `COOKIE_SECURE`, `LOG_LEVEL` — optional

Never commit `.env` or `.env.test`. Only `.env.example` with placeholders is tracked.

## Database

Prisma 7 keeps the connection URL in `server/prisma7.config.ts` (reading `DATABASE_URL`),
not in the schema. The schema lives in `server/prisma/schema.prisma`.

Commands (run from the repository root):

```bash
npm --prefix server run prisma:validate      # check the schema
npm --prefix server run prisma:generate      # regenerate the client
npm --prefix server run prisma:migrate:deploy # apply existing migrations
npm --prefix server run prisma:migrate:dev    # create + apply a new migration (local dev)
npm --prefix server run prisma:status         # show migration status
```

Migrations are additive-only by default; do **not** run `prisma migrate reset` against a
database that holds data.

## Running the API

```bash
npm run dev:server     # http://localhost:4000
```

Interactive API reference: `http://localhost:4000/api/docs` (Swagger UI).
Machine-readable spec: `GET /api/docs/swagger.json`.

### Main endpoints

| Method & path | Purpose |
| --- | --- |
| `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | Session auth |
| `GET /api/auth/me` · `PATCH /api/auth/password` | Current user / change password |
| `PATCH /api/users/me` · `GET /api/users?search=` | Profile / user search |
| `GET|POST /api/workspaces` | List / create workspace |
| `GET|PATCH /api/workspaces/:id` · `POST .../archive` · `POST .../leave` | Workspace management |
| `.../members` · `.../invitations` · `POST /api/workspaces/invitations/accept` | Members & invites |
| `GET|POST /api/workspaces/:id/projects` · `GET|PATCH /api/projects/:id` | Projects |
| `POST /api/projects/:id/members` | Project team management |
| `GET|POST /api/projects/:id/tasks` · `GET|PATCH /api/tasks/:id` | Tasks |
| `POST /api/projects/:id/tasks/reorder` | Task ordering |
| `GET|POST /api/tasks/:id/comments` · `PATCH|DELETE .../:commentId` | Comments |
| `GET /api/workspaces/:id/activity` | Activity feed (Change Radar) |
| `GET /api/workspaces/:id/dashboard` | Dashboard aggregates |
| `GET /api/notifications` · `PATCH .../read` · `POST /api/notifications/read-all` | Notifications |

Tasks use **optimistic concurrency**: updating a task requires its `version`; a stale
`version` returns `409 VERSION_CONFLICT` with the current version in `error.details`.

Auth is role-based per workspace (`ADMIN` > `PROJECT_MANAGER` > `TEAM_MEMBER` > `VIEWER`);
members can never read or mutate resources they lack permission for.

### Realtime (Socket.IO)

`/api` shares the same HTTP server. Clients authenticate with the session cookie and are
auto-joined to rooms: `user:<id>`, `workspace:<id>`, `project:<id>`.

Events include `task:updated`, `task:created`, `task:reordered`, `project:updated`,
`comment:created`, `activity:created`, and `notification:new`.

## Running the tests

Integration tests run against an isolated `nexora_test` database (never the dev database):

```bash
# one-time: create the test database and apply migrations
createdb nexora_test
DATABASE_URL=...postgresql://.../nexora_test npx --prefix server prisma migrate deploy

npm --prefix server test          # full suite (Vitest + Supertest)
npm --prefix server run test:watch
```

The tests cover auth/session + CSRF, workspaces and invitations, tasks including the
version-conflict (409) flow and RBAC, and an end-to-end collaboration flow
(notifications, comments, dashboard, activity feed).

## Validation commands

```bash
npm run lint           # ESLint for server (and client placeholder)
npm run typecheck      # TypeScript checks
npm run build          # compiler / production build
```

## Environment variables

See `server/.env.example`. Only safe placeholders are committed; never commit real credentials.
