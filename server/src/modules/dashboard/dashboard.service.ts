import type { Prisma, TaskStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { assertWorkspacePermission } from "../access/access.service.js";
import { serializeActivity } from "../activity/activity.service.js";

export async function getWorkspaceDashboard(userId: string, workspaceId: string) {
  await assertWorkspacePermission(userId, workspaceId, "dashboard:view");

  // Calendar-day boundaries (server local time, matching the rest of the app).
  // Overdue and due-soon are disjoint: overdue is strictly before today, and
  // due-soon spans today through the next seven calendar days (today..+7), so
  // an item due earlier today counts as "today", never as overdue, and
  // tomorrow is always included.
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dueSoonHorizon = new Date(startOfToday);
  dueSoonHorizon.setDate(dueSoonHorizon.getDate() + 8); // exclusive upper bound
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const activeTaskWhere: Prisma.TaskWhereInput = {
    project: { workspaceId },
    archivedAt: null,
  };
  const openTaskDue = (due: Prisma.DateTimeFilter): Prisma.TaskWhereInput => ({
    ...activeTaskWhere,
    status: { not: "DONE" },
    dueDate: due,
  });

  const [
    byStatus,
    byPriority,
    totalTasks,
    totalDone,
    overdue,
    dueSoonTasks,
    dueSoonProjects,
    tasksCompletedThisWeek,
    projects,
    members,
    recentTasks,
    recentActivity,
  ] = await Promise.all([
    prisma.task.groupBy({
      where: activeTaskWhere,
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      where: activeTaskWhere,
      by: ["priority"],
      _count: { _all: true },
    }),
    prisma.task.count({ where: activeTaskWhere }),
    prisma.task.count({ where: { ...activeTaskWhere, status: "DONE" } }),
    // Overdue: open tasks whose deadline passed before today began.
    prisma.task.count({ where: openTaskDue({ lt: startOfToday }) }),
    // Due soon: open tasks due today or within the next seven days.
    prisma.task.count({ where: openTaskDue({ gte: startOfToday, lt: dueSoonHorizon }) }),
    // Due soon: active (non-completed) projects due in the same window.
    prisma.project.count({
      where: {
        workspaceId,
        archivedAt: null,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        dueDate: { gte: startOfToday, lt: dueSoonHorizon },
      },
    }),
    prisma.task.count({
      where: { ...activeTaskWhere, completedAt: { gte: startOfWeek } },
    }),
    prisma.project.count({ where: { workspaceId, archivedAt: null } }),
    prisma.workspaceMembership.count({ where: { workspaceId } }),
    prisma.task.findMany({
      where: activeTaskWhere,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { workspaceId },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<TaskStatus, number>;
  const priorityCounts = Object.fromEntries(byPriority.map((row) => [row.priority, row._count._all])) as Record<string, number>;

  return {
    summary: {
      totalTasks,
      totalDone,
      completionRate: totalTasks > 0 ? Math.round((totalDone / totalTasks) * 1000) / 10 : 0,
      overdueTasks: overdue,
      dueSoonTasks,
      dueSoonProjects,
      projects,
      members,
      tasksCompletedThisWeek,
    },
    byStatus: statusCounts,
    byPriority: priorityCounts,
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      project: task.project,
      updatedAt: task.updatedAt,
    })),
    recentActivity: recentActivity.map((activity) =>
      serializeActivity(activity, {
        actor: activity.actor,
        project: activity.project,
        task: activity.task,
      }),
    ),
  };
}
