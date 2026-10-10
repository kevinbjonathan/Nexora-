import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleDashed,
  Clock,
  FolderOpen,
  GitPullRequest,
  Layers,
  ListChecks,
  Loader2,
  LogOut,
  MessageSquare,
  PenLine,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Logo } from '@/components/Logo';
import { Dialog } from '@/components/Dialog';
import { Avatar, Badge, Button, EmptyState, IconButton, ProgressBar, SearchInput, Skeleton, TextField } from '@/components/ui';
import { useToast } from '@/components/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { http } from '@/lib/api';
import { cx, formatDate, isDueSoon, isOverdue, pluralize, timeAgo, titleCase } from '@/lib/format';
import { onRealtimeEvent } from '@/lib/socket';
import { ApiError } from '@/lib/types';
import type {
  ActivityItem,
  AppNotification,
  DashboardStats,
  Paginated,
  Project,
  ProjectDetail,
  PublicUser,
  Task,
  TaskStatus,
  Workspace,
} from '@/lib/types';

const TASK_STATUS: Record<TaskStatus, { label: string; icon: LucideIcon; badge: string }> = {
  TODO: { label: 'To do', icon: CircleDashed, badge: 'bg-ink-50 text-ink-500' },
  IN_PROGRESS: { label: 'In progress', icon: Loader2, badge: 'bg-forest/10 text-forest' },
  BLOCKED: { label: 'Blocked', icon: Ban, badge: 'bg-danger/10 text-danger' },
  IN_REVIEW: { label: 'In review', icon: GitPullRequest, badge: 'bg-forest-light/10 text-forest-light' },
  DONE: { label: 'Done', icon: CheckCircle2, badge: 'bg-lime/25 text-forest-700' },
};

const PROJECT_STATUS: Record<string, { label: string; dot: string; cls: string }> = {
  PLANNING: { label: 'Planning', dot: 'bg-ink-300', cls: 'text-ink-500' },
  ACTIVE: { label: 'Active', dot: 'bg-forest', cls: 'text-forest' },
  ON_HOLD: { label: 'On hold', dot: 'bg-warning', cls: 'text-warning' },
  COMPLETED: { label: 'Completed', dot: 'bg-lime', cls: 'text-forest-light' },
  ARCHIVED: { label: 'Archived', dot: 'bg-ink-200', cls: 'text-ink-400' },
};

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  task_created: PenLine,
  task_updated: PenLine,
  task_archived: Archive,
  comment_created: MessageSquare,
  comment_updated: MessageSquare,
  comment_deleted: MessageSquare,
  project_created: Layers,
  project_updated: Layers,
  project_archived: Archive,
  member_added: UserPlus,
  member_removed: Users,
  member_role_changed: Users,
  workspace_created: Layers,
};

/** Renders each record once even if a realtime event and a later refetch overlap. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Prepends `item` if its id is not already present, then trims to `limit`. */
function prependUnique<T extends { id: string }>(list: T[] | null, item: T, limit: number): T[] {
  const current = list ?? [];
  if (current.some((x) => x.id === item.id)) return current;
  return [item, ...current].slice(0, limit);
}

export function WorkspacePage({
  user,
  onLogout,
  onHome,
}: {
  user: PublicUser;
  onLogout: () => void;
  onHome: () => void;
}) {
  const toast = useToast();
  const { refresh } = useAuth();

  // Workspaces + selection
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);

  // Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  // UI
  const [search, setSearch] = useState('');
  const deferredSearch = useDebouncedValue(search, 160);
  const [notifOpen, setNotifOpen] = useState(false);
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await http.get<Paginated<Workspace>>('/api/workspaces', { page: 1, pageSize: 100 });
      const items = res.items;
      setWorkspaces(items);
      setWorkspacesError(null);
      const active = items.find((w) => !w.archivedAt) ?? items[0] ?? null;
      setWorkspace((prev) => (prev && items.some((w) => w.id === prev.id) ? prev : active));
    } catch (err) {
      setWorkspaces([]);
      setWorkspacesError(err instanceof ApiError ? err.message : 'Could not load workspaces.');
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces, refresh]);

  const loadWorkspaceData = useCallback(
    async (ws: Workspace) => {
      try {
        const [dash, proj, notifs, unreadRes] = await Promise.all([
          http.get<DashboardStats>(`/api/workspaces/${ws.id}/dashboard`),
          http.get<Paginated<Project>>(`/api/workspaces/${ws.id}/projects`, { page: 1, pageSize: 100 }),
          http.get<Paginated<AppNotification>>('/api/notifications', { page: 1, pageSize: 50 }),
          http.get<{ count: number }>('/api/notifications/unread-count'),
        ]);
        setStats(dash);
        setProjects(proj.items);
        setNotifications(notifs.items);
        setActivity(dedupeById(dash.recentActivity ?? []));
        setUnread(unreadRes.count);
      } catch (err) {
        toast.error('Could not load workspace', err instanceof ApiError ? err.message : 'Unknown error');
      }
    },
    [toast],
  );

  useEffect(() => {
    if (workspace) loadWorkspaceData(workspace);
  }, [workspace, loadWorkspaceData]);

  // Realtime
  useEffect(() => {
    if (!workspace) return;
    const offActivity = onRealtimeEvent('activity:created', (item) => setActivity((l) => prependUnique(l, item, 40)));
    const offNotif = onRealtimeEvent('notification:new', (n) => {
      setNotifications((l) => prependUnique(l, n, 50));
      setUnread((u) => u + 1);
    });
    const offCreated = onRealtimeEvent('project:created', (p) => setProjects((l) => (l ? [p, ...l] : [p])));
    const offUpdated = onRealtimeEvent('project:updated', (p) => setProjects((l) => (l ? l.map((x) => (x.id === p.id ? p : x)) : l)));
    const offRole = onRealtimeEvent('workspace:member_role_changed', ({ workspaceId, role }) => {
      if (workspaceId === workspace.id) setWorkspace((w) => (w ? { ...w, role } : w));
    });
    return () => {
      offActivity();
      offNotif();
      offCreated();
      offUpdated();
      offRole();
    };
  }, [workspace]);

  const markRead = useCallback(
    async (id: string, readAt: string | null) => {
      setNotifications((l) => l.map((n) => (n.id === id ? { ...n, readAt: readAt ?? n.readAt } : n)));
      try {
        if (readAt == null) {
          const res = await http.patch<{ notification: AppNotification }>(`/api/notifications/${id}/read`);
          setNotifications((l) => l.map((n) => (n.id === id ? res.notification : n)));
          setUnread((u) => Math.max(0, u - 1));
        } else {
          setUnread((u) => Math.max(0, u - 1));
        }
      } catch (err) {
        toast.error('Could not update notification', err instanceof ApiError ? err.message : undefined);
      }
    },
    [toast],
  );

  const readAll = useCallback(async () => {
    try {
      await http.post<{ count: number }>('/api/notifications/read-all');
      setUnread(0);
      setNotifications((l) => l.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch (err) {
      toast.error('Could not update notifications', err instanceof ApiError ? err.message : undefined);
    }
  }, [toast]);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        await http.delete<void>(`/api/notifications/${id}`);
        setNotifications((l) => l.filter((n) => n.id !== id));
      } catch (err) {
        toast.error('Could not delete notification', err instanceof ApiError ? err.message : undefined);
      }
    },
    [toast],
  );

  const [drawerProject, setDrawerProject] = useState<{ detail: ProjectDetail; tasks: Task[] } | null>(null);

  const openProject = useCallback(
    async (project: Project) => {
      setDrawerProject(null);
      try {
        const [detail, tasks] = await Promise.all([
          http.get<ProjectDetail>(`/api/projects/${project.id}`),
          http.get<Paginated<Task>>(`/api/projects/${project.id}/tasks`, { page: 1, pageSize: 100 }),
        ]);
        setDrawerProject({ detail, tasks: tasks.items });
      } catch (err) {
        toast.error('Could not open project', err instanceof ApiError ? err.message : undefined);
      }
    },
    [toast],
  );

  const closeDrawer = useCallback(() => setDrawerProject(null), []);

  const canManage = workspace?.role === 'ADMIN' || workspace?.role === 'PROJECT_MANAGER';

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader
        workspaces={workspaces ?? []}
        workspace={workspace}
        onSelect={setWorkspace}
        onNewWorkspace={() => setNewWsOpen(true)}
        onHome={onHome}
        search={search}
        onSearch={setSearch}
        user={user}
        onLogout={onLogout}
        unread={unread}
        notifications={notifications}
        notifOpen={notifOpen}
        setNotifOpen={setNotifOpen}
        onRead={markRead}
        onReadAll={readAll}
        onDelete={deleteNotification}
      />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {workspaces === null ? (
          <LoadingGrid />
        ) : workspacesError ? (
          <EmptyState
            icon={FolderOpen}
            title="Could not load workspaces"
            message={workspacesError}
            action={
              <Button variant="secondary" size="sm" onClick={loadWorkspaces}>
                Try again
              </Button>
            }
          />
        ) : workspaces.length === 0 ? (
          <OnboardingView user={user} onStart={() => setNewWsOpen(true)} />
        ) : (
          <>
            {!workspace ? (
              <EmptyState icon={FolderOpen} title="Select a workspace" message="Choose a workspace to continue." />
            ) : (
              <DashboardView
                key={workspace.id}
                workspace={workspace}
                stats={stats}
                projects={projects}
                activity={activity}
                search={deferredSearch}
                canManage={canManage}
                onNewProject={() => setNewProjectOpen(true)}
                onOpenProject={openProject}
              />
            )}
          </>
        )}

        <p className="mt-12 text-center text-xs text-ink-400">Nexora by Neostats — real data, live updates.</p>
      </main>

      {drawerProject && (
        <ProjectDrawer
          detail={drawerProject.detail}
          initialTasks={drawerProject.tasks}
          onClose={closeDrawer}
          onChanged={(p) => setProjects((l) => (l ? l.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : l))}
          canManage={canManage}
        />
      )}

      <NewWorkspaceDialog
        open={newWsOpen}
        onClose={() => setNewWsOpen(false)}
        onCreated={(ws) => {
          setNewWsOpen(false);
          toast.success('Workspace created', `${ws.name} is ready.`);
          loadWorkspaces();
        }}
      />

      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        workspaceId={workspace?.id}
        onCreated={(p) => {
          setNewProjectOpen(false);
          setProjects((l) => (l ? [p, ...l] : [p]));
          toast.success('Project created', p.name);
        }}
      />
    </div>
  );
}

/* ============================== HEADER ============================== */

function AppHeader(props: {
  workspaces: Workspace[];
  workspace: Workspace | null;
  onSelect: (w: Workspace) => void;
  onNewWorkspace: () => void;
  onHome: () => void;
  search: string;
  onSearch: (s: string) => void;
  user: PublicUser;
  onLogout: () => void;
  unread: number;
  notifications: AppNotification[];
  notifOpen: boolean;
  setNotifOpen: (b: boolean) => void;
  onRead: (id: string, readAt: string | null) => void;
  onReadAll: () => void;
  onDelete: (id: string) => void;
}) {
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={props.onHome}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Back to homepage"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="hidden sm:block">
              <Logo />
            </div>

            {/* Workspace switcher */}
            <div className="relative ml-1 sm:ml-3">
              <button
                onClick={() => setWsMenuOpen((v) => !v)}
                className="flex h-9 max-w-[16rem] items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
                aria-expanded={wsMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate">{props.workspace?.name ?? 'Workspaces'}</span>
                <ChevronDown size={14} className="shrink-0 text-ink-400" />
              </button>
              {wsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setWsMenuOpen(false)} />
                  <div className="absolute left-0 top-10 z-40 w-72 rounded-xl border border-border bg-white p-1.5 shadow-xl menu-pop" role="listbox" aria-label="Switch workspace">
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Workspaces</div>
                    {props.workspaces.map((w) => (
                      <button
                        key={w.id}
                        role="option"
                        aria-selected={w.id === props.workspace?.id}
                        onClick={() => {
                          props.onSelect(w);
                          setWsMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-ink/5"
                      >
                        <span className="truncate font-medium">{w.name}</span>
                        <Badge tone={w.role === 'ADMIN' ? 'forest' : w.role === 'PROJECT_MANAGER' ? 'sky' : 'neutral'}>{titleCase(w.role ?? '')}</Badge>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setWsMenuOpen(false);
                        props.onNewWorkspace();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest/5"
                    >
                      <Plus size={14} /> New workspace
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <SearchInput value={props.search} onChange={props.onSearch} placeholder="Search projects…" className="w-52 lg:w-64" />
            </div>

            {/* Notifications */}
            <div className="relative">
              <IconButton
                label="Notifications"
                icon={Bell}
                onClick={() => props.setNotifOpen(!props.notifOpen)}
                aria-expanded={props.notifOpen}
                className={cx(props.notifOpen ? 'bg-ink/5 text-ink' : '')}
              />
              {props.unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {props.unread > 99 ? '99+' : props.unread}
                </span>
              )}
              {props.notifOpen && (
                <NotificationPanel
                  notifications={props.notifications}
                  onClose={() => props.setNotifOpen(false)}
                  onRead={props.onRead}
                  onReadAll={props.onReadAll}
                  onDelete={props.onDelete}
                />
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex h-9 items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-ink/5"
                aria-expanded={userMenuOpen}
              >
                <Avatar name={props.user.name} src={props.user.avatarUrl} size="sm" />
                <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink lg:inline">{props.user.name}</span>
                <ChevronDown size={14} className="hidden text-ink-400 lg:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-border bg-white p-1.5 shadow-xl menu-pop">
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-ink">{props.user.name}</p>
                      <p className="truncate text-xs text-ink-400">{props.user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        props.onLogout();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Mobile search */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <SearchInput value={props.search} onChange={props.onSearch} placeholder="Search projects…" className="w-full" />
      </div>
    </header>
  );
}

function NotificationPanel(props: {
  notifications: AppNotification[];
  onClose: () => void;
  onRead: (id: string, readAt: string | null) => void;
  onReadAll: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={props.onClose} />
      <div className="absolute right-0 top-11 z-40 flex max-h-[70vh] w-[22rem] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl menu-pop sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-ink">Notifications</span>
          <div className="flex items-center gap-1">
            <button onClick={props.onReadAll} className="rounded-md px-2 py-1 text-xs font-medium text-forest transition-colors hover:bg-forest/5">
              Mark all read
            </button>
            <IconButton label="Close notifications" icon={X} size={15} onClick={props.onClose} className="h-7 w-7" />
          </div>
        </div>
        <div className="panel-scroll flex-1 overflow-y-auto">
          {props.notifications.length === 0 ? (
            <EmptyState icon={Bell} title="All quiet here" message="Notifications will appear when your team acts." className="m-3 border-0 bg-ivory/60 py-10" />
          ) : (
            props.notifications.map((n) => {
              const Icon = NOTIFY_ICON[n.type]?.icon ?? Bell;
              const unreadN = !n.readAt;
              return (
                <div
                  key={n.id}
                  className={cx('flex items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-ink/3', !unreadN && 'opacity-75')}
                >
                  <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', unreadN ? 'bg-forest/10' : 'bg-ink-50')}>
                    <Icon size={15} className={unreadN ? 'text-forest' : 'text-ink-400'} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-sm leading-snug text-ink', unreadN ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{n.body}</p>
                    <p className="mt-1 text-[11px] text-ink-300">{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {unreadN && (
                      <button
                        onClick={() => props.onRead(n.id, null)}
                        className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-forest transition-colors hover:bg-forest/5"
                      >
                        Mark read
                      </button>
                    )}
                    <IconButton label="Delete notification" icon={Trash2} size={14} className="h-7 w-7 text-ink-300 hover:text-danger" onClick={() => props.onDelete(n.id)} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

const NOTIFY_ICON: Record<string, { icon: LucideIcon }> = {
  TASK_ASSIGNED: { icon: UserPlus },
  TASK_REASSIGNED: { icon: GitPullRequest },
  TASK_COMMENTED: { icon: MessageSquare },
  PROJECT_MEMBER_ADDED: { icon: Users },
};

/* ============================== DASHBOARD ============================== */

function DashboardView(props: {
  workspace: Workspace;
  stats: DashboardStats | null;
  projects: Project[] | null;
  activity: ActivityItem[] | null;
  search: string;
  canManage: boolean;
  onNewProject: () => void;
  onOpenProject: (p: Project) => void;
}) {
  const filteredProjects = useMemo(() => {
    const q = props.search.trim().toLowerCase();
    if (!q) return props.projects ?? [];
    return (props.projects ?? []).filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
  }, [props.projects, props.search]);

  const filteredActivity = useMemo(() => {
    const q = props.search.trim().toLowerCase();
    if (!q) return props.activity ?? [];
    return (props.activity ?? []).filter(
      (a) =>
        (a.actor?.name ?? '').toLowerCase().includes(q) ||
        (a.task?.title ?? '').toLowerCase().includes(q) ||
        (a.project?.name ?? '').toLowerCase().includes(q) ||
        (a.summary ?? '').toLowerCase().includes(q),
    );
  }, [props.activity, props.search]);

  const searching = props.search.trim().length > 0;

  return (
    <div>
      {/* Page title */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-display-md font-medium text-ink">Command Center</h1>
            <Badge tone="sky">{titleCase(props.workspace.role ?? '')}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-400">
            {titleCase(props.workspace.name)} — {props.workspace.description ?? 'one clear picture of every moving part.'}
          </p>
        </div>
        {props.canManage && (
          <Button icon={Plus} onClick={props.onNewProject} className="self-start sm:self-auto">
            New project
          </Button>
        )}
      </div>

      {props.stats ? (
        <KpiGrid stats={props.stats} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        {/* Projects */}
        <section aria-label="Projects">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium text-ink">Projects</h2>
            <span className="text-xs text-ink-400">
              {searching
                ? `${filteredProjects.length} match${filteredProjects.length === 1 ? '' : 'es'}`
                : `${filteredProjects.length} ${pluralize(filteredProjects.length, 'project')}`}
            </span>
          </div>
          {props.projects === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={searching ? 'No matching projects' : 'No projects yet'}
              message={searching ? 'Try a different search.' : 'Create your first project to start tracking work.'}
              action={searching ? undefined : props.canManage ? <Button size="sm" icon={Plus} onClick={props.onNewProject}>New project</Button> : undefined}
            />
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((p) => (
                <ProjectRow key={p.id} project={p} onClick={() => props.onOpenProject(p)} />
              ))}
            </div>
          )}
        </section>

        {/* Change Radar */}
        <section aria-label="Change Radar">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium text-ink">Change Radar</h2>
            <span className="text-xs text-ink-400">Recent activity</span>
          </div>
          {props.activity === null ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : filteredActivity.length === 0 ? (
            <EmptyState icon={Activity} title={searching ? 'No matching changes' : 'No activity yet'} message={searching ? 'Try a different search.' : 'Changes will appear here as your team works.'} />
          ) : (
            <div className="card p-5">
              <ActivityTimeline items={filteredActivity} />
            </div>
          )}
        </section>
      </div>

      {/* Recent tasks */}
      {props.stats && props.stats.recentTasks.length > 0 && (
        <section className="mt-10" aria-label="Recently updated tasks">
          <h2 className="mb-4 font-display text-xl font-medium text-ink">Recently updated tasks</h2>
          <div className="card divide-y divide-border overflow-hidden">
            {props.stats.recentTasks.map((t) => {
              const sc = TASK_STATUS[t.status];
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink/3">
                  <sc.icon size={15} className="shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                    <p className="truncate text-xs text-ink-400">{t.project.name}</p>
                  </div>
                  <Badge tone={sc.badge.includes('danger') ? 'danger' : sc.badge.includes('lime') ? 'lime' : sc.badge.includes('forest') ? 'forest' : 'neutral'}>{sc.label}</Badge>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-ink-400 sm:block">{timeAgo(t.updatedAt)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiGrid({ stats }: { stats: DashboardStats }) {
  const s = stats.summary;
  const cards = [
    { icon: FolderOpen, label: 'Active projects', value: s.projects, hint: `${s.members} ${pluralize(s.members, 'member')}`, tone: 'bg-forest/8 text-forest' },
    { icon: ListChecks, label: 'Open tasks', value: s.totalTasks, hint: `${s.totalDone} done · ${s.completionRate}% complete`, tone: 'bg-forest-light/10 text-forest-light' },
    { icon: AlertCircle, label: 'Overdue', value: s.overdueTasks, hint: 'Needs attention', tone: 'bg-danger/10 text-danger' },
    {
      icon: Clock,
      label: 'Due soon',
      value: s.dueSoonTasks + s.dueSoonProjects,
      hint: `Next 7 days · ${s.dueSoonTasks} ${pluralize(s.dueSoonTasks, 'task')} · ${s.dueSoonProjects} ${pluralize(s.dueSoonProjects, 'project')}`,
      tone: 'bg-warning/10 text-warning',
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, hint, tone }, i) => (
        <div key={label} className="group card relative overflow-hidden p-5 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className={cx('flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105', tone)}>
              <Icon size={18} strokeWidth={1.8} />
            </div>
            {i === 1 && s.tasksCompletedThisWeek > 0 && (
              <span className="rounded-md bg-lime/25 px-1.5 py-0.5 text-[10px] font-semibold text-forest-700">
                +{s.tasksCompletedThisWeek} this week
              </span>
            )}
          </div>
          <p className="ticker-value mt-4 font-display text-3xl font-medium text-ink">{value}</p>
          <p className="mt-1 text-sm font-medium text-ink">{label}</p>
          {i === 1 ? (
            <div className="mt-2">
              <ProgressBar value={s.completionRate} tone="forest" />
              <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-ink-400">{hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
  const sc = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.PLANNING;
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-white p-4 text-left transition-all duration-200 ease-smooth hover:border-ink-200 hover:shadow-lg sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', sc.dot)} />
          <h3 className="truncate font-medium text-ink">{project.name}</h3>
          {project.dueDate && (
            <span className={cx('inline-flex items-center gap-1 text-xs font-medium', isOverdue(project.dueDate, project.status === 'COMPLETED' ? 'DONE' : project.status) ? 'text-danger' : 'text-ink-400')}>
              <Calendar size={12} /> {formatDate(project.dueDate)}
            </span>
          )}
        </div>
        {project.description && <p className="mt-1 truncate text-xs text-ink-400 sm:pl-[18px]">{project.description}</p>}
      </div>

      <div className="hidden shrink-0 sm:block sm:w-36 md:w-40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-400">
            {project.tasksCount != null ? `${project.tasksCount} ${pluralize(project.tasksCount, 'task')}` : '—'}
          </span>
          <span className="font-medium text-ink">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} tone={project.status === 'ON_HOLD' ? 'warning' : 'forest'} className="mt-1.5" />
      </div>

      <Badge tone={sc.cls.includes('warning') ? 'warning' : sc.cls.includes('forest') ? 'forest' : 'neutral'} className="hidden sm:inline-flex">
        {sc.label}
      </Badge>

      <ArrowRight size={16} className="shrink-0 text-ink-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );
}

/** Human-readable detail for an activity record (e.g. the status change). */
function activityDetail(a: ActivityItem): string | null {
  const md = a.metadata as Record<string, unknown> | null;
  if (!md) return null;
  const changes = md.changes as Record<string, { from?: unknown; to?: unknown }> | undefined;
  if (changes && typeof changes === 'object') {
    const parts: string[] = [];
    for (const [field, delta] of Object.entries(changes)) {
      if (!delta || typeof delta !== 'object') continue;
      const from = typeof delta.from === 'string' ? titleCase(delta.from) : delta.from == null ? 'None' : null;
      const to = typeof delta.to === 'string' ? titleCase(delta.to) : delta.to == null ? 'None' : null;
      parts.push(`${titleCase(field)}: ${from ?? '—'} → ${to ?? '—'}`);
    }
    if (parts.length) return parts.join(' · ');
  }
  if (typeof md.status === 'string') return `Status: ${titleCase(md.status)}`;
  return null;
}

function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol>
      {items.map((a, idx) => {
        const Icon = ACTIVITY_ICON[a.action] ?? CircleDashed;
        const isLast = idx === items.length - 1;
        const detail = activityDetail(a);
        const subject = a.task?.title ?? a.project?.name ?? titleCase(a.entityType);
        return (
          <li key={a.id} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white">
                <Icon size={15} className="text-forest" />
                {a.actor && (
                  <span className="absolute -bottom-1 -right-1 ring-2 ring-white">
                    <Avatar name={a.actor.name} src={a.actor.avatarUrl} size="xs" />
                  </span>
                )}
              </span>
              {!isLast && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className={cx('min-w-0 flex-1', isLast ? '' : 'pb-5')}>
              <p className="text-sm leading-snug text-ink">
                <span className="font-semibold">{a.actor?.name ?? 'Unknown user'}</span>{' '}
                <span className="text-ink-400">{titleCase(a.action)}</span>{' '}
                <span className="font-medium">{subject}</span>
              </p>
              {detail && (
                <p className="mt-1.5 inline-flex rounded-md bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink-500">
                  {detail}
                </p>
              )}
              <p className="mt-1 text-xs text-ink-400">
                <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>
                  {timeAgo(a.createdAt)}
                </time>
                {a.project?.name && a.task && <span> · {a.project.name}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}

/* ============================== ONBOARDING ============================== */

function OnboardingView({ user, onStart }: { user: PublicUser; onStart: () => void }) {
  const firstName = user.name.trim().split(/\s+/)[0] || 'there';
  const steps = [
    { icon: FolderOpen, title: 'Create a workspace', body: 'One home for every project, task and teammate.' },
    { icon: ListChecks, title: 'Add projects & tasks', body: 'Track work through To do, In progress, Review and Done.' },
    { icon: UserPlus, title: 'Invite your team', body: 'Assign roles — you start as the workspace admin.' },
  ];
  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-8">
      <div className="card overflow-hidden p-7 sm:p-11">
        <p className="eyebrow text-forest">First-time setup</p>
        <h1 className="mt-2 font-display text-display-md font-medium text-ink">Welcome, {firstName}.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-400 sm:text-base">
          You are one step from your command center. Create your first workspace — you will be its administrator,
          and you can invite the rest of your team afterwards.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl border border-border bg-ivory/50 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest/8 text-forest">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">Step {i + 1}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" icon={Plus} onClick={onStart}>
            Create your workspace
          </Button>
          <span className="text-xs text-ink-400">Takes less than a minute.</span>
        </div>
      </div>
    </div>
  );
}

/* ============================== PROJECT DRAWER ============================== */

function ProjectDrawer(props: {
  detail: ProjectDetail;
  initialTasks: Task[];
  onClose: () => void;
  onChanged: (p: Project) => void;
  canManage: boolean;
}) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>(props.initialTasks);
  const [project, setProject] = useState(props.detail.project);
  const [taskTitle, setTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(props.initialTasks);
    setProject(props.detail.project);
  }, [props.detail, props.initialTasks]);

  const sc = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.PLANNING;

  const patchStatus = useCallback(
    async (task: Task, status: TaskStatus) => {
      if (!props.canManage || task.status === status || updatingId) return;
      setUpdatingId(task.id);
      // Optimistic
      const prev = tasks;
      setTasks((l) => l.map((t) => (t.id === task.id ? { ...t, status } : t)));
      try {
        const res = await http.patch<{ task: Task }>(`/api/tasks/${task.id}`, { version: task.version, status });
        setTasks((l) => l.map((t) => (t.id === task.id ? { ...res.task, assignee: task.assignee } : t)));
        props.onChanged(project);
      } catch (err) {
        setTasks(prev);
        if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
          toast.error('This task changed elsewhere', `Current version is ${err.currentVersion ?? 'unknown'}. Reloading…`);
          http.get<{ task: Task }>(`/api/tasks/${task.id}`).then((r) => {
            setTasks((l) => l.map((t) => (t.id === task.id ? { ...r.task, assignee: task.assignee } : t)));
            toast.info('Task refreshed', 'Your view now matches the latest changes.');
          });
        } else if (err instanceof ApiError) {
          toast.error('Update failed', err.message);
        }
      } finally {
        setUpdatingId(null);
      }
    },
    [props.canManage, updatingId, tasks, project, toast],
  );

  const createTask = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!taskTitle.trim() || creating) return;
      setCreating(true);
      try {
        const res = await http.post<{ task: Task }>(`/api/projects/${project.id}/tasks`, { title: taskTitle.trim() });
        setTasks((l) => [res.task, ...l]);
        setTaskTitle('');
        props.onChanged(project);
        toast.success('Task created', res.task.title);
      } catch (err) {
        toast.error('Could not create task', err instanceof ApiError ? err.message : undefined);
      } finally {
        setCreating(false);
      }
    },
    [taskTitle, creating, project, props, toast],
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Project: ${project.name}`}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm fade-overlay" onClick={props.onClose} />
      <div className="panel-scroll absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-ivory shadow-2xl drawer-in">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-ivory/90 px-6 py-4 backdrop-blur">
          <Logo />
          <IconButton label="Close project details" icon={X} onClick={props.onClose} />
        </div>

        <div className="flex-1 px-6 py-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={cx('h-2.5 w-2.5 rounded-full', sc.dot)} />
            <span className={cx('text-xs font-medium', sc.cls)}>{sc.label}</span>
            <Badge tone="neutral">{(project.priority ?? 'MEDIUM').replace('_', ' ')} priority</Badge>
          </div>
          <h2 className="mt-3 font-display text-2xl font-medium text-ink">{project.name}</h2>
          {project.description && <p className="mt-2 text-sm leading-relaxed text-ink-400">{project.description}</p>}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs text-ink-400">Progress</p>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} className="mt-2" />
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs text-ink-400">Target date</p>
              <p className="mt-1.5 text-sm font-medium text-ink">{formatDate(project.dueDate)}</p>
            </div>
          </div>

          {props.detail.members.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Team</h3>
              <div className="flex flex-wrap gap-2">
                {props.detail.members.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3 text-xs font-medium text-ink">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
                    {m.user.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                Tasks <span className="text-ink-400">({tasks.length})</span>
              </h3>
            </div>

            {props.canManage && (
              <form onSubmit={createTask} className="mb-4 flex items-center gap-2">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Add a task…"
                  aria-label="New task title"
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink placeholder:text-ink-300 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/10"
                />
                <Button type="submit" size="sm" loading={creating} icon={Plus} disabled={!taskTitle.trim()}>
                  Add
                </Button>
              </form>
            )}

            {tasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="No tasks yet" message={props.canManage ? 'Add the first task above.' : 'Nothing here yet.'} className="bg-white py-10" />
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task) => {
                  const tsc = TASK_STATUS[task.status];
                  const overdue = isOverdue(task.dueDate, task.status);
                  const dueSoon = isDueSoon(task.dueDate, task.status);
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 transition-colors hover:bg-white">
                      <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tsc.badge)}>
                        <tsc.icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                          {task.assignee?.name && <span className="flex items-center gap-1"><Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="xs" />{task.assignee.name}</span>}
                          {task.dueDate && (
                            <span className={cx('inline-flex items-center gap-1', overdue ? 'font-medium text-danger' : dueSoon ? 'font-medium text-warning' : '')}>
                              <Calendar size={11} /> {formatDate(task.dueDate)}
                              {overdue && '(overdue)'}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge tone={tsc.badge.includes('danger') ? 'danger' : tsc.badge.includes('lime') ? 'lime' : tsc.badge.includes('forest') ? 'forest' : 'neutral'}>{tsc.label}</Badge>
                      {props.canManage && (
                        <button
                          onClick={() => patchStatus(task, nextStatus(task.status))}
                          disabled={updatingId === task.id}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-forest transition-colors hover:bg-forest/5 disabled:opacity-40"
                          aria-label={`Move ${task.title} to ${TASK_STATUS[nextStatus(task.status)].label}`}
                          title={task.status === 'DONE' ? 'Reopen task' : `Move to ${TASK_STATUS[nextStatus(task.status)].label}`}
                        >
                          {task.status === 'DONE' ? 'Reopen' : 'Next →'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function nextStatus(s: TaskStatus): TaskStatus {
  const map: Record<TaskStatus, TaskStatus> = {
    TODO: 'IN_PROGRESS',
    IN_PROGRESS: 'IN_REVIEW',
    IN_REVIEW: 'DONE',
    DONE: 'TODO',
    BLOCKED: 'IN_PROGRESS',
  };
  return map[s];
}

/* ============================== DIALOGS ============================== */

function NewWorkspaceDialog(props: { open: boolean; onClose: () => void; onCreated: (w: Workspace) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await http.post<{ workspace: Workspace }>('/api/workspaces', { name: name.trim(), description: description.trim() || undefined });
      props.onCreated(res.workspace);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create workspace.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} title="Create workspace">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Name" id="ws-name" placeholder="Acme Engineering" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextField label="Description (optional)" id="ws-desc" placeholder="What is this workspace for?" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={props.onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!name.trim()}>Create workspace</Button>
        </div>
      </form>
    </Dialog>
  );
}

function NewProjectDialog(props: { open: boolean; onClose: () => void; workspaceId?: string; onCreated: (p: Project) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!props.workspaceId || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name: name.trim(), description: description.trim() || undefined };
      if (dueDate) body.dueDate = new Date(dueDate).toISOString();
      const res = await http.post<{ project: Project }>(`/api/workspaces/${props.workspaceId}/projects`, body);
      props.onCreated(res.project);
      setName('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create project.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} title="New project">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Name" id="proj-name" placeholder="Platform migration" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextField label="Description (optional)" id="proj-desc" placeholder="A short summary of the goal" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div>
          <label htmlFor="proj-due" className="mb-1.5 block text-xs font-semibold text-ink">Target date (optional)</label>
          <input id="proj-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
        </div>
        {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={props.onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!name.trim()}>Create project</Button>
        </div>
      </form>
    </Dialog>
  );
}