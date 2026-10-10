import type { Server } from "socket.io";

let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function getIo(): Server | null {
  return io;
}

export const workspaceRoom = (workspaceId: string) => `workspace:${workspaceId}`;
export const userRoom = (userId: string) => `user:${userId}`;
export const projectRoom = (projectId: string) => `project:${projectId}`;

export function emitToWorkspace(workspaceId: string, event: string, payload: unknown): void {
  io?.to(workspaceRoom(workspaceId)).emit(event, payload);
}

export function emitToProject(projectId: string, event: string, payload: unknown): void {
  io?.to(projectRoom(projectId)).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}
