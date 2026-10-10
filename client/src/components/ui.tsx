import {
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '@/lib/format';
import { initials as initialsOf, avatarColor } from '@/lib/format';

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, icon: Icon, children, disabled, ...rest },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-forest text-ivory hover:bg-forest-light shadow-sm hover:shadow-md focus-visible:ring-forest/30',
    lime: 'bg-lime text-ink hover:bg-lime-dark shadow-sm hover:shadow-md',
    secondary:
      'border border-ink/15 bg-white text-ink hover:border-ink-200 hover:bg-ink/2 focus-visible:ring-ink/10',
    ghost: 'text-ink-400 hover:bg-ink/5 hover:text-ink',
    danger: 'bg-danger/10 text-danger hover:bg-danger/15',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-12 px-6 text-sm gap-2 rounded-xl',
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition-all duration-200 ease-smooth',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.8} aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

/* ---------------- IconButton ---------------- */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
  size?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, label, icon: Icon, size = 18, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors duration-200',
        'hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime',
        className,
      )}
      {...rest}
    >
      <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
});

/* ---------------- TextField ---------------- */

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: LucideIcon;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, leadingIcon: Icon, id, className, ...rest },
  ref,
) {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cx(
            'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink transition-all duration-200',
            'placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-offset-0',
            Icon && 'pl-9',
            error
              ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
              : 'border-border focus:border-forest focus:ring-forest/15',
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger" role="alert">
          <AlertTriangle size={12} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/* ---------------- PasswordField ---------------- */

interface PasswordFieldProps extends Omit<TextFieldProps, 'type'> {
  autoComplete?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, hint, error, id, className, autoComplete = 'current-password', ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={inputId} className="text-xs font-semibold text-ink">
          {label}
        </label>
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cx(
            'h-11 w-full rounded-xl border bg-white pr-11 pl-3.5 text-sm text-ink transition-all duration-200',
            'placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
              : 'border-border focus:border-forest focus:ring-forest/15',
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-300 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger" role="alert">
          <AlertTriangle size={12} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/* ---------------- Avatar / AvatarStack ---------------- */

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  title?: string;
}

export function Avatar({ name, src, size = 'md', title }: AvatarProps) {
  const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' } as const;
  if (src) {
    return (
      <img
        src={src}
        alt={title ?? name}
        className={cx('shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size])}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      title={title ?? name}
      role="img"
      aria-label={title ?? name}
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-ivory',
        sizes[size],
      )}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: Array<{ name: string; avatarUrl?: string | null }>; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex -space-x-2" aria-label={people.map((p) => p.name).join(', ')}>
      {shown.map((p, i) => (
        <span key={`${p.name}-${i}`} className="rounded-full ring-2 ring-white">
          <Avatar name={p.name} src={p.avatarUrl} size="sm" title={p.name} />
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-400 ring-2 ring-white">
          +{extra}
        </span>
      )}
    </span>
  );
}

/* ---------------- Badges ---------------- */

export interface BadgeProps {
  children: ReactNode;
  tone?: 'forest' | 'lime' | 'danger' | 'warning' | 'neutral' | 'sky';
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  const tones = {
    forest: 'bg-forest/10 text-forest',
    lime: 'bg-lime/20 text-forest-700',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    neutral: 'bg-ink-50 text-ink-500',
    sky: 'bg-forest-light/10 text-forest-light',
  };
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Dot({ color = 'bg-forest' }: { color?: string }) {
  return <span className={cx('inline-block h-2 w-2 shrink-0 rounded-full', color)} aria-hidden="true" />;
}

/* ---------------- ProgressBar ---------------- */

export function ProgressBar({ value, tone = 'forest', className }: { value: number; tone?: 'forest' | 'warning' | 'danger' | 'neutral'; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tones = {
    forest: 'bg-forest-light',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-ink-300',
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}% complete`}
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-ink-100', className)}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500 ease-smooth-out', tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ---------------- Spinner / Skeletons ---------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-forest/20 border-t-forest', className)}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-ink-100', className)} />;
}

/* ---------------- Empty / Error states ---------------- */

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
        <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/5 px-6 py-10 text-center" role="alert">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <Info size={20} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-ink-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ---------------- SearchInput ---------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  clearable = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
}) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-xl border border-border bg-white pl-9 pr-9 text-sm text-ink transition-all duration-200 placeholder:text-ink-300 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/10"
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export { initialsOf };