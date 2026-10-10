const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MINUTE))}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: iso.includes('T') ? undefined : 'numeric' as const });
}

/** True when a task due date is in the past and the task is not done. */
export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'DONE' || status === 'ARCHIVED') return false;
  return new Date(dueDate).getTime() < Date.now();
}

/** True when a task is due within `withinDays` (inclusive) and is not done/overdue. */
export function isDueSoon(dueDate: string | null, status: string, withinDays = 3): boolean {
  if (!dueDate || status === 'DONE' || status === 'ARCHIVED') return false;
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  return due >= now && due <= now + withinDays * DAY;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function avatarColor(seed: string): string {
  // Deterministic forest-greens for avatar placeholder backgrounds.
  const palette = ['#183C31', '#285847', '#3A6E54', '#6B9E83', '#122D24'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}