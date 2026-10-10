import type { Prisma, TaskStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { assertWorkspacePermission } from "../access/access.service.js";

export async function getWorkspaceDashboard(userId: string, workspaceId: string) {
  await assertWorkspacePermission(userId, workspaceId, "dashboard:view");

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const taskWhere: Prisma.TaskWhereInput = {
    project: { workspaceId },
    archivedAt: null,
  };

  const [byStatus, byPriority, totalTasks, totalDone, overdue, dueSoon, completedThisWeek, projects, members, recentTasks, recentActivity] =
    await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: taskWhere,
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: taskWhere,
        _count: { _all: true },
      }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: "DONE" } }),
      prisma.task.count({
        where: { ...taskWhere, dueDate: { lt: now }, status: { not: "DONE" } },
      }),
      prisma.task.count({
        where: { ...taskWhere, dueDate: { gte: now, lte: sevenDaysFromNow }, status: { not: "DONE" } },
      }),
      prisma.task.count({
        where: { project: { workspaceId }, archivedAt: null, completedAt: { gte: startOfWeek } },
      }),
      prisma.project.count({ where: { workspaceId, archivedAt: null } }),
      prisma.workspaceMembership.count({ where: { workspaceId } }),
      prisma.task.findMany({
        where: taskWhere,
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
      dueSoonTasks: dueSoon,
      projects,
      members,
      tasksCompletedThisWeek: completedThisWeek,
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
    recentActivity,
  };
}