export type ProjectStatus = 'active' | 'on-track' | 'at-risk' | 'paused' | 'completed';
export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: string;
  ownerInitials: string;
  progress: number;
  nextMilestone: string;
  milestoneDate: string;
  taskCount: number;
  openTasks: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  projectName: string;
}

export interface ChangeEntry {
  id: string;
  actor: string;
  actorInitials: string;
  action: string;
  target: string;
  project: string;
  timestamp: string;
  type: 'created' | 'updated' | 'completed' | 'commented' | 'moved' | 'assigned';
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  activeTasks: number;
}

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Atlas Platform Migration',
    status: 'active',
    owner: 'Maya Chen',
    ownerInitials: 'MC',
    progress: 68,
    nextMilestone: 'Staging deployment',
    milestoneDate: 'Oct 18',
    taskCount: 42,
    openTasks: 13,
  },
  {
    id: 'p2',
    name: 'Quarterly Brand Refresh',
    status: 'on-track',
    owner: 'Jonas Weber',
    ownerInitials: 'JW',
    progress: 45,
    nextMilestone: 'Design system audit',
    milestoneDate: 'Oct 22',
    taskCount: 28,
    openTasks: 15,
  },
  {
    id: 'p3',
    name: 'Customer Onboarding Redesign',
    status: 'at-risk',
    owner: 'Priya Sharma',
    ownerInitials: 'PS',
    progress: 32,
    nextMilestone: 'User research synthesis',
    milestoneDate: 'Oct 15',
    taskCount: 35,
    openTasks: 22,
  },
  {
    id: 'p4',
    name: 'API v2 Documentation',
    status: 'paused',
    owner: 'Tom Calder',
    ownerInitials: 'TC',
    progress: 80,
    nextMilestone: 'Endpoint reference complete',
    milestoneDate: 'Oct 30',
    taskCount: 18,
    openTasks: 4,
  },
  {
    id: 'p5',
    name: 'Mobile App Performance Sprint',
    status: 'completed',
    owner: 'Elena Voss',
    ownerInitials: 'EV',
    progress: 100,
    nextMilestone: 'Shipped to production',
    milestoneDate: 'Oct 8',
    taskCount: 24,
    openTasks: 0,
  },
  {
    id: 'p6',
    name: 'Internal Tooling Upgrade',
    status: 'active',
    owner: 'Sam Okoro',
    ownerInitials: 'SO',
    progress: 55,
    nextMilestone: 'CI pipeline migration',
    milestoneDate: 'Oct 25',
    taskCount: 31,
    openTasks: 14,
  },
];

export const tasks: Task[] = [
  {
    id: 't1',
    title: 'Finalize staging environment variables',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Maya Chen',
    assigneeInitials: 'MC',
    dueDate: 'Oct 12',
    projectName: 'Atlas Platform Migration',
  },
  {
    id: 't2',
    title: 'Review user research interview notes',
    status: 'blocked',
    priority: 'urgent',
    assignee: 'Priya Sharma',
    assigneeInitials: 'PS',
    dueDate: 'Oct 11',
    projectName: 'Customer Onboarding Redesign',
  },
  {
    id: 't3',
    title: 'Audit current design token usage',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Jonas Weber',
    assigneeInitials: 'JW',
    dueDate: 'Oct 19',
    projectName: 'Quarterly Brand Refresh',
  },
  {
    id: 't4',
    title: 'Write endpoint reference for /v2/users',
    status: 'todo',
    priority: 'low',
    assignee: 'Tom Calder',
    assigneeInitials: 'TC',
    dueDate: 'Oct 24',
    projectName: 'API v2 Documentation',
  },
  {
    id: 't5',
    title: 'Migrate CI pipeline to new runner',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Sam Okoro',
    assigneeInitials: 'SO',
    dueDate: 'Oct 14',
    projectName: 'Internal Tooling Upgrade',
  },
  {
    id: 't6',
    title: 'Stakeholder presentation draft',
    status: 'todo',
    priority: 'medium',
    assignee: 'Maya Chen',
    assigneeInitials: 'MC',
    dueDate: 'Oct 20',
    projectName: 'Atlas Platform Migration',
  },
  {
    id: 't7',
    title: 'Onboarding flow wireframes v2',
    status: 'done',
    priority: 'high',
    assignee: 'Priya Sharma',
    assigneeInitials: 'PS',
    dueDate: 'Oct 9',
    projectName: 'Customer Onboarding Redesign',
  },
  {
    id: 't8',
    title: 'Performance benchmark comparison',
    status: 'done',
    priority: 'urgent',
    assignee: 'Elena Voss',
    assigneeInitials: 'EV',
    dueDate: 'Oct 7',
    projectName: 'Mobile App Performance Sprint',
  },
  {
    id: 't9',
    title: 'Sync component library with Figma',
    status: 'todo',
    priority: 'low',
    assignee: 'Jonas Weber',
    assigneeInitials: 'JW',
    dueDate: 'Oct 28',
    projectName: 'Quarterly Brand Refresh',
  },
  {
    id: 't10',
    title: 'Database migration script review',
    status: 'blocked',
    priority: 'high',
    assignee: 'Sam Okoro',
    assigneeInitials: 'SO',
    dueDate: 'Oct 13',
    projectName: 'Atlas Platform Migration',
  },
  {
    id: 't11',
    title: 'Set up analytics tracking for onboarding',
    status: 'todo',
    priority: 'medium',
    assignee: 'Elena Voss',
    assigneeInitials: 'EV',
    dueDate: 'Oct 26',
    projectName: 'Customer Onboarding Redesign',
  },
  {
    id: 't12',
    title: 'Component prop table documentation',
    status: 'in-progress',
    priority: 'low',
    assignee: 'Tom Calder',
    assigneeInitials: 'TC',
    dueDate: 'Oct 21',
    projectName: 'API v2 Documentation',
  },
];

export const changes: ChangeEntry[] = [
  {
    id: 'c1',
    actor: 'Maya Chen',
    actorInitials: 'MC',
    action: 'moved',
    target: 'Finalize staging environment variables',
    project: 'Atlas Platform Migration',
    timestamp: '12 min ago',
    type: 'moved',
  },
  {
    id: 'c2',
    actor: 'Priya Sharma',
    actorInitials: 'PS',
    action: 'commented on',
    target: 'Onboarding flow wireframes v2',
    project: 'Customer Onboarding Redesign',
    timestamp: '38 min ago',
    type: 'commented',
  },
  {
    id: 'c3',
    actor: 'Elena Voss',
    actorInitials: 'EV',
    action: 'completed',
    target: 'Performance benchmark comparison',
    project: 'Mobile App Performance Sprint',
    timestamp: '1 hr ago',
    type: 'completed',
  },
  {
    id: 'c4',
    actor: 'Sam Okoro',
    actorInitials: 'SO',
    action: 'created',
    target: 'Database migration script review',
    project: 'Atlas Platform Migration',
    timestamp: '2 hr ago',
    type: 'created',
  },
  {
    id: 'c5',
    actor: 'Jonas Weber',
    actorInitials: 'JW',
    action: 'updated',
    target: 'Audit current design token usage',
    project: 'Quarterly Brand Refresh',
    timestamp: '3 hr ago',
    type: 'updated',
  },
  {
    id: 'c6',
    actor: 'Tom Calder',
    actorInitials: 'TC',
    action: 'assigned',
    target: 'Write endpoint reference for /v2/users',
    project: 'API v2 Documentation',
    timestamp: '4 hr ago',
    type: 'assigned',
  },
  {
    id: 'c7',
    actor: 'Maya Chen',
    actorInitials: 'MC',
    action: 'updated',
    target: 'Stakeholder presentation draft',
    project: 'Atlas Platform Migration',
    timestamp: '5 hr ago',
    type: 'updated',
  },
  {
    id: 'c8',
    actor: 'Priya Sharma',
    actorInitials: 'PS',
    action: 'created',
    target: 'Set up analytics tracking for onboarding',
    project: 'Customer Onboarding Redesign',
    timestamp: '6 hr ago',
    type: 'created',
  },
];

export const teamMembers: TeamMember[] = [
  { id: 'u1', name: 'Maya Chen', initials: 'MC', role: 'Tech Lead', activeTasks: 3 },
  { id: 'u2', name: 'Jonas Weber', initials: 'JW', role: 'Brand Designer', activeTasks: 2 },
  { id: 'u3', name: 'Priya Sharma', initials: 'PS', role: 'Product Designer', activeTasks: 3 },
  { id: 'u4', name: 'Tom Calder', initials: 'TC', role: 'Tech Writer', activeTasks: 2 },
  { id: 'u5', name: 'Elena Voss', initials: 'EV', role: 'Mobile Engineer', activeTasks: 1 },
  { id: 'u6', name: 'Sam Okoro', initials: 'SO', role: 'DevOps Engineer', activeTasks: 2 },
];

export const workspaceStats = {
  activeProjects: 3,
  totalProjects: 6,
  overdueTasks: 2,
  dueSoonTasks: 4,
  completedThisWeek: 8,
  openTasks: 13,
};
