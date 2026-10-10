import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';
import type {
  ActivityItem,
  AppNotification,
  Comment,
  Project,
  Task,
  WorkspaceRole,
  Workspace,
} from './types';

let socket: Socket | null = null;
let stable = false;
let subscribers = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export interface RealtimeEvents {
  'workspace:updated': (workspace: Workspace) => void;
  'workspace:archived': (workspace: Workspace) => void;
  'workspace:member_added': (payload: { workspaceId: string }) => void;
  'workspace:member_role_changed': (payload: { workspaceId: string; role: WorkspaceRole }) => void;
  'workspace:member_removed': (payload: { workspaceId: string }) => void;
  'project:created': (project: Project) => void;
  'project:updated': (project: Project) => void;
  'project:archived': (project: Project) => void;
  'project:member_added': (payload: { projectId: string; member: unknown }) => void;
  'project:member_role_changed': (payload: { projectId: string; member: unknown }) => void;
  'project:member_removed': (payload: { projectId: string; member: unknown }) => void;
  'task:created': (task: Task) => void;
  'task:updated': (task: Task) => void;
  'task:archived': (task: Task) => void;
  'task:reordered': (payload: { projectId: string; taskIds: string[] }) => void;
  'comment:created': (payload: { taskId: string; comment: Comment }) => void;
  'comment:updated': (payload: { taskId: string; comment: Comment }) => void;
  'comment:deleted': (payload: { taskId: string; commentId: string }) => void;
  'activity:created': (activity: ActivityItem) => void;
  'notification:new': (notification: AppNotification) => void;
}

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1200,
    reconnectionDelayMax: 8000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

/** Backpressure-safe retry: only reconnect once per process per flush. */
export function scheduleSocketReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (subscribers > 0 && stable) {
      // A page navigation happened after a failed connect; try again.
      if (socket && socket.connected === false) socket.connect();
    }
  }, 1500);
}

export function onRealtimeEvent<K extends keyof RealtimeEvents>(event: K, handler: RealtimeEvents[K]): () => void {
  const s = connectSocket();
  s.on(event, handler as never);
  subscribers++;
  return () => {
    s.off(event, handler as never);
    subscribers = Math.max(0, subscribers - 1);
  };
}

export function setSocketStable(value: boolean): void {
  stable = value;
}