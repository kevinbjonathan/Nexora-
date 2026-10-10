import { useMemo, useState } from 'react';
import {
  Search,
  Bell,
  ChevronLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  FolderOpen,
  TrendingUp,
  X,
  ArrowRight,
  CircleDot,
  Loader,
  Ban,
  Plus,
  GitBranch,
  MessageSquare,
  UserPlus,
  Edit3,
  Check,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import {
  projects as allProjects,
  tasks as allTasks,
  changes as allChanges,
  teamMembers,
  workspaceStats,
  type Project,
  type Task,
  type TaskStatus,
  type ProjectStatus,
  type ChangeEntry,
} from '@/data/dashboardData';

const statusConfig: Record<TaskStatus, { label: string; icon: typeof CircleDot; color: string; bg: string }> = {
  'todo': { label: 'To do', icon: CircleDot, color: 'text-ink-400', bg: 'bg-ink-100' },
  'in-progress': { label: 'In progress', icon: Loader, color: 'text-forest', bg: 'bg-forest-50' },
  'blocked': { label: 'Blocked', icon: Ban, color: 'text-danger', bg: 'bg-danger/8' },
  'done': { label: 'Done', icon: CheckCircle2, color: 'text-forest-light', bg: 'bg-forest-50' },
};

const projectStatusConfig: Record<ProjectStatus, { label: string; color: string; dot: string }> = {
  'active': { label: 'Active', color: 'text-forest', dot: 'bg-forest' },
  'on-track': { label: 'On track', color: 'text-forest-light', dot: 'bg-forest-light' },
  'at-risk': { label: 'At risk', color: 'text-warning', dot: 'bg-warning' },
  'paused': { label: 'Paused', color: 'text-ink-400', dot: 'bg-ink-300' },
  'completed': { label: 'Completed', color: 'text-ink-400', dot: 'bg-ink-200' },
};

const changeIcon: Record<ChangeEntry['type'], typeof GitBranch> = {
  'created': Plus,
  'updated': Edit3,
  'completed': Check,
  'commented': MessageSquare,
  'moved': GitBranch,
  'assigned': UserPlus,
};

function isOverdue(task: Task): boolean {
  const today = new Date('2026-10-10');
  const due = new Date(`2026-${task.dueDate.replace('Oct', '10').replace('0', '')} 2026`);
  const [month, day] = task.dueDate.replace('Oct ', '10 ').split(' ');
  const dueDate = new Date(2026, parseInt(month) - 1, parseInt(day));
  void today; void due;
  return task.status !== 'done' && dueDate < new Date(2026, 9, 10);
}

function isDueSoon(task: Task): boolean {
  const [month, day] = task.dueDate.replace('Oct ', '10 ').split(' ');
  const dueDate = new Date(2026, parseInt(month) - 1, parseInt(day));
  const today = new Date(2026, 9, 10);
  const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return task.status !== 'done' && diff >= 0 && diff <= 3;
}

export function WorkspacePage({ onExit }: { onExit: () => void }) {
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.projectName.toLowerCase().includes(search.toLowerCase()) ||
        t.assignee.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = taskFilter === 'all' || t.status === taskFilter;
      return matchesSearch && matchesFilter;
    });
  }, [search, taskFilter]);

  const filteredProjects = useMemo(() => {
    if (!search) return allProjects;
    return allProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.owner.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const filteredChanges = useMemo(() => {
    if (!search) return allChanges;
    return allChanges.filter(
      (c) =>
        c.actor.toLowerCase().includes(search.toLowerCase()) ||
        c.target.toLowerCase().includes(search.toLowerCase()) ||
        c.project.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const overdueCount = allTasks.filter(isOverdue).length;
  const dueSoonCount = allTasks.filter(isDueSoon).length;

  return (
    <div className="min-h-screen bg-ivory">
      {/* === WORKSPACE HEADER === */}
      <header className="sticky top-0 z-30 border-b border-border bg-ivory/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onExit} className="flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink" aria-label="Back to homepage">
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Home</span>
              </button>
              <div className="h-5 w-px bg-border" />
              <Logo />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects, tasks, people..."
                  className="w-56 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-400 transition-all duration-200 focus:w-72 focus:border-forest focus:ring-2 focus:ring-forest/10 focus:outline-none lg:w-64 lg:focus:w-80"
                  aria-label="Search workspace"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink/5 hover:text-ink"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell size={18} />
                  {overdueCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-border bg-white shadow-xl animate-scale-in origin-top-right">
                      <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <span className="text-sm font-semibold text-ink">Notifications</span>
                        <button onClick={() => setNotifOpen(false)} className="text-ink-400 hover:text-ink" aria-label="Close notifications">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {overdueCount > 0 && (
                          <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-ink/3">
                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                            <div>
                              <p className="text-sm text-ink">{overdueCount} task{overdueCount > 1 ? 's' : ''} overdue</p>
                              <p className="text-xs text-ink-400">Review and reassign or adjust dates</p>
                            </div>
                          </div>
                        )}
                        {dueSoonCount > 0 && (
                          <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-ink/3">
                            <Clock size={16} className="mt-0.5 shrink-0 text-warning" />
                            <div>
                              <p className="text-sm text-ink">{dueSoonCount} task{dueSoonCount > 1 ? 's' : ''} due soon</p>
                              <p className="text-xs text-ink-400">Within the next 3 days</p>
                            </div>
                          </div>
                        )}
                        {allChanges.slice(0, 3).map((c) => (
                          <div key={c.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-ink/3">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-[10px] font-semibold text-forest">
                              {c.actorInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-ink">
                                <span className="font-medium">{c.actor}</span> {c.action} {c.target}
                              </p>
                              <p className="text-xs text-ink-400">{c.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-semibold text-ivory" title="Demo user">
                DU
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search */}
      <div className="border-b border-border bg-white px-4 py-3 sm:hidden">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-border bg-ivory py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-400 focus:border-forest focus:outline-none"
            aria-label="Search workspace"
          />
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* === PAGE TITLE === */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-display-md font-medium text-ink">Command Center</h1>
              <span className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning" title="This workspace is using demonstration data">
                Demo data
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-400">Nexora Workspace — overview of all projects, tasks, and recent activity</p>
          </div>
        </div>

        {/* === COMMAND OVERVIEW — STATS === */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={FolderOpen}
            label="Active projects"
            value={workspaceStats.activeProjects}
            subtext={`${workspaceStats.totalProjects} total`}
            tone="forest"
          />
          <StatCard
            icon={AlertCircle}
            label="Overdue"
            value={workspaceStats.overdueTasks}
            subtext="Needs attention"
            tone="danger"
          />
          <StatCard
            icon={Clock}
            label="Due soon"
            value={workspaceStats.dueSoonTasks}
            subtext="Within 3 days"
            tone="warning"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed this week"
            value={workspaceStats.completedThisWeek}
            subtext={`${workspaceStats.openTasks} still open`}
            tone="forest-light"
          />
        </div>

        {/* === PROJECT PORTFOLIO === */}
        <section className="mt-12" aria-label="Project portfolio">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl font-medium text-ink">Projects</h2>
            <span className="text-sm text-ink-400">{filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}</span>
          </div>

          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects found"
              message={search ? `No projects match "${search}".` : 'There are no projects to display.'}
            />
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onClick={() => setSelectedProject(project)}
                />
              ))}
            </div>
          )}
        </section>

        {/* === TASK COMMAND CENTER === */}
        <section className="mt-12" aria-label="Task command center">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-2xl font-medium text-ink">Tasks</h2>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'todo', 'in-progress', 'blocked', 'done'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    taskFilter === f
                      ? 'bg-forest text-ivory'
                      : 'bg-white text-ink-400 border border-border hover:border-ink-200 hover:text-ink'
                  }`}
                >
                  {f === 'all' ? 'All' : statusConfig[f].label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No tasks found"
              message={search ? `No tasks match "${search}".` : 'There are no tasks in this view.'}
            />
          ) : (
            <div className="hidden overflow-hidden rounded-xl border border-border lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-ink-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Task</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Priority</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Assignee</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Due</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Project</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const sc = statusConfig[task.status];
                    const overdue = isOverdue(task);
                    const dueSoon = isDueSoon(task);
                    return (
                      <tr key={task.id} className="border-b border-border last:border-0 transition-colors hover:bg-ink-50/50">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <sc.icon size={15} className={`shrink-0 ${sc.color}`} />
                            <span className="font-medium text-ink">{task.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest/10 text-[10px] font-semibold text-forest">
                              {task.assigneeInitials}
                            </div>
                            <span className="text-ink-400">{task.assignee}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm ${overdue ? 'font-medium text-danger' : dueSoon ? 'font-medium text-warning' : 'text-ink-400'}`}>
                            {task.dueDate}
                            {overdue && ' (overdue)'}
                            {dueSoon && !overdue && ' (soon)'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-ink-400">{task.projectName}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile task cards */}
          {filteredTasks.length > 0 && (
            <div className="space-y-3 lg:hidden">
              {filteredTasks.map((task) => {
                const sc = statusConfig[task.status];
                const overdue = isOverdue(task);
                const dueSoon = isDueSoon(task);
                return (
                  <div key={task.id} className="card-editorial p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <sc.icon size={15} className={`mt-0.5 shrink-0 ${sc.color}`} />
                        <div>
                          <p className="font-medium text-ink">{task.title}</p>
                          <p className="mt-0.5 text-xs text-ink-400">{task.projectName}</p>
                        </div>
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest/10 text-[10px] font-semibold text-forest">
                          {task.assigneeInitials}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                      <span className={`text-xs ${overdue ? 'font-medium text-danger' : dueSoon ? 'font-medium text-warning' : 'text-ink-400'}`}>
                        {task.dueDate}{overdue ? ' (overdue)' : dueSoon ? ' (soon)' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* === CHANGE RADAR + TEAM === */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Change Radar */}
          <section aria-label="Change Radar">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-medium text-ink">Change Radar</h2>
              <span className="text-xs text-ink-400">Recent activity</span>
            </div>
            {filteredChanges.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No recent changes"
                message={search ? `No changes match "${search}".` : 'There is no recent activity to display.'}
              />
            ) : (
              <div className="card-editorial p-6">
                <div className="relative space-y-0">
                  {filteredChanges.map((change, idx) => {
                    const Icon = changeIcon[change.type];
                    const isLast = idx === filteredChanges.length - 1;
                    return (
                      <div key={change.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white">
                            <Icon size={14} className="text-forest" />
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-ink">
                              <span className="font-medium">{change.actor}</span>{' '}
                              <span className="text-ink-400">{change.action}</span>{' '}
                              <span className="font-medium">{change.target}</span>
                            </p>
                            <span className="shrink-0 text-xs text-ink-400">{change.timestamp}</span>
                          </div>
                          <p className="mt-1 text-xs text-ink-400">{change.project}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Team */}
          <section aria-label="Team">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-medium text-ink">Team</h2>
              <span className="text-xs text-ink-400">{teamMembers.length} members</span>
            </div>
            <div className="card-editorial divide-y divide-border">
              {teamMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 transition-colors hover:bg-ink-50/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-xs font-semibold text-ivory">
                      {m.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-ink-400">{m.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-forest">{m.activeTasks}</p>
                    <p className="text-[10px] text-ink-400">active</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="text-xs text-ink-400">
            This workspace uses demonstration data. No live backend or real-time connection is active.
          </p>
        </div>
      </main>

      {/* === PROJECT DETAIL DRAWER === */}
      {selectedProject && (
        <ProjectDrawer project={selectedProject} tasks={allTasks} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: number;
  subtext: string;
  tone: 'forest' | 'danger' | 'warning' | 'forest-light';
}) {
  const tones = {
    'forest': 'bg-forest/8 text-forest',
    'danger': 'bg-danger/8 text-danger',
    'warning': 'bg-warning/8 text-warning',
    'forest-light': 'bg-forest-light/8 text-forest-light',
  };
  return (
    <div className="card-editorial p-5 transition-all duration-300 hover:shadow-md">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-3xl font-display font-medium text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-ink-400">{subtext}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const config = {
    'low': { label: 'Low', color: 'text-ink-400', bg: 'bg-ink-100' },
    'medium': { label: 'Medium', color: 'text-ink-500', bg: 'bg-ink-100' },
    'high': { label: 'High', color: 'text-forest', bg: 'bg-forest-50' },
    'urgent': { label: 'Urgent', color: 'text-danger', bg: 'bg-danger/8' },
  };
  const c = config[priority];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
}

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
  const sc = projectStatusConfig[project.status];
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all duration-300 hover:shadow-md hover:border-ink-200 sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} />
          <h3 className="truncate font-medium text-ink">{project.name}</h3>
        </div>
        <p className="mt-1 truncate text-xs text-ink-400 sm:ml-[18px]">
          Next: {project.nextMilestone} — {project.milestoneDate}
        </p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-forest/10 text-[10px] font-semibold text-forest">
          {project.ownerInitials}
        </div>
        <span className="text-xs text-ink-400">{project.owner}</span>
      </div>

      <div className="hidden w-32 md:block">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-400">{project.openTasks} open</span>
          <span className="font-medium text-ink">{project.progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${project.progress}%`,
              backgroundColor: project.status === 'at-risk' ? '#B87924' : project.status === 'completed' ? '#A7B0A0' : '#285847',
            }}
          />
        </div>
      </div>

      <span className={`hidden shrink-0 rounded-md px-2.5 py-1 text-xs font-medium sm:inline-flex ${sc.color} bg-ink-50`}>
        {sc.label}
      </span>

      <ArrowRight size={16} className="shrink-0 text-ink-300 transition-colors group-hover:text-ink" />
    </button>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: typeof FolderOpen; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
        <Icon size={20} className="text-ink-300" />
      </div>
      <p className="mt-4 font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-400">{message}</p>
    </div>
  );
}

function ProjectDrawer({ project, tasks, onClose }: { project: Project; tasks: Task[]; onClose: () => void }) {
  const projectTasks = tasks.filter((t) => t.projectName === project.name);
  const sc = projectStatusConfig[project.status];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Project: ${project.name}`}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-ivory shadow-2xl animate-slide-in-right">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-ivory/95 px-6 py-4 backdrop-blur">
          <Logo />
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink/5 hover:text-ink" aria-label="Close project details">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${sc.dot}`} />
            <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-medium text-ink">{project.name}</h2>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-semibold text-ivory">
              {project.ownerInitials}
            </div>
            <span className="text-sm text-ink-400">Led by {project.owner}</span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-400">Progress</span>
              <span className="font-medium text-ink">{project.progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${project.progress}%`,
                  backgroundColor: project.status === 'at-risk' ? '#B87924' : '#285847',
                }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-xs text-ink-400">Total tasks</p>
              <p className="mt-1 text-2xl font-display font-medium text-ink">{project.taskCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-xs text-ink-400">Open tasks</p>
              <p className="mt-1 text-2xl font-display font-medium text-ink">{project.openTasks}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-white p-4">
            <p className="text-xs text-ink-400">Next milestone</p>
            <p className="mt-1 font-medium text-ink">{project.nextMilestone}</p>
            <p className="mt-0.5 text-sm text-ink-400">{project.milestoneDate}</p>
          </div>

          {projectTasks.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">Tasks in this project</h3>
              <div className="space-y-2">
                {projectTasks.map((task) => {
                  const tsc = statusConfig[task.status];
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                      <tsc.icon size={14} className={`shrink-0 ${tsc.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                        <p className="text-xs text-ink-400">{task.dueDate}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${tsc.bg} ${tsc.color}`}>
                        {tsc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
