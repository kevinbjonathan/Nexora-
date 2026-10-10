import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Logo } from '@/components/Logo';
import { RobotMascot, type RobotEmotion, type RobotGaze } from '@/components/RobotMascot';
import { Button, PasswordField, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/hooks/useRouter';
import { useToast } from '@/components/Toaster';
import { ApiError } from '@/lib/types';

type Mode = 'login' | 'signup';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Password rule enforced by the API: 8-128 chars, at least one letter and one digit. */
function passwordIssues(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[a-zA-Z]/.test(password)) return 'Include at least one letter.';
  if (!/\d/.test(password)) return 'Include at least one number.';
  return null;
}

/** Message that never leaks any password content as a machine-readable token. */
function friendlyApiError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}

export function AuthPage({
  mode,
  onSwitch,
  onBack,
}: {
  mode: Mode;
  onSwitch: () => void;
  onBack: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { login, register } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ---- Robot state ----
  const [gaze, setGaze] = useState<RobotGaze>('center');
  const [emotion, setEmotion] = useState<RobotEmotion>('idle');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update robot BEFORE any page switch happens.
  const enqueueGaze = (next: RobotGaze) => setGaze(next);
  const onFieldBlur = () => {
    setGaze('center');
    setEmotion('idle');
  };
  const onTyping = () => {
    setEmotion('typing');
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setEmotion('idle'), 900);
  };

  const resetForm = () => {
    setFieldErrors({});
    setFormError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    resetForm();

    const errors: typeof fieldErrors = {};
    if (mode === 'signup' && !name.trim()) errors.name = 'Please enter your name.';
    else if (mode === 'signup' && name.trim().length > 120) errors.name = 'Name must be 120 characters or fewer.';
    if (!email.trim()) errors.email = 'Please enter your email.';
    else if (!isEmail(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Please enter your password.';
    else if (mode === 'signup' && passwordIssues(password)) errors.password = passwordIssues(password) ?? undefined;

    if (errors.name || errors.email || errors.password) {
      setFieldErrors(errors);
      setEmotion('error');
      setTimeout(() => setEmotion('idle'), 1200);
      return;
    }

    setSubmitting(true);
    setEmotion('submitting');
    try {
      const nextUser = mode === 'login' ? await login(email.trim(), password) : await register(name.trim(), email.trim(), password);
      setEmotion('success');
      toast.success(mode === 'login' ? `Welcome back, ${nextUser.name.split(' ')[0]}.` : `Account created. Welcome, ${nextUser.name.split(' ')[0]}.`);
      navigate('workspace');
    } catch (err) {
      setEmotion('error');
      setFormError(friendlyApiError(err));
      setTimeout(() => setEmotion('idle'), 1400);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex min-h-screen flex-col overflow-hidden bg-ivory">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-ivory" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full opacity-70"
        style={{ background: 'radial-gradient(ellipse at center, rgba(200,228,106,0.18) 0%, transparent 62%)' }}
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo theme="light" />
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to home
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full flex-1 flex-col items-center px-6 pb-12 pt-2">
        <div className="w-full max-w-[420px]">
          {/* Robot peeking zone */}
          <div className="relative flex h-36 items-end justify-center" aria-hidden="true">
            <span className="absolute bottom-2 left-1/2 h-4 w-56 -translate-x-1/2 rounded-[100%] bg-ink/10 blur-md" />
            <div
              className={`robot--${emotion} ${gaze !== 'center' ? 'robot--focused' : ''} relative w-56`}
            >
              <RobotMascot containerRef={rootRef} gaze={gaze} emotion={emotion} />
            </div>
          </div>

          {/* Auth card (robot hides behind its top edge) */}
          <div className="relative -mt-4 rounded-3xl border border-border bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
            <div className="mb-6 text-center">
              <p className="eyebrow text-forest">{mode === 'login' ? 'Welcome back' : 'Join the command center'}</p>
              <h1 className="mt-2 font-display text-3xl font-medium text-ink">
                {mode === 'login' ? 'Sign in to Nexora' : 'Create your account'}
              </h1>
              <p className="mt-1.5 text-sm text-ink-400">
                {mode === 'login'
                  ? 'The Live Project Command Center, ready for you.'
                  : 'One workspace to see every moving part.'}
              </p>
            </div>

            {formError && (
              <div
                className="mb-5 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-3 text-sm text-danger"
                role="alert"
              >
                <span aria-hidden="true">⚠</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={submit} noValidate>
              <div className="space-y-4">
                {mode === 'signup' && (
                  <TextField
                    label="Full name"
                    id="auth-name"
                    placeholder="Jordan Park"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => enqueueGaze('email')}
                    onBlur={onFieldBlur}
                    onInput={onTyping}
                    error={fieldErrors.name}
                  />
                )}

                <TextField
                  label="Email"
                  id="auth-email"
                  type="email"
                  placeholder="you@neostats.dev"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => enqueueGaze('email')}
                  onBlur={onFieldBlur}
                  onInput={onTyping}
                  error={fieldErrors.email}
                />

                <PasswordField
                  label="Password"
                  id="auth-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => enqueueGaze('password')}
                  onBlur={onFieldBlur}
                  onInput={onTyping}
                  error={fieldErrors.password}
                  hint={
                    mode === 'signup'
                      ? '8+ characters, with at least one letter and one number.'
                      : undefined
                  }
                />

                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                  icon={ArrowRight}
                >
                  {submitting ? 'Working on it…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-ink-400">
              {mode === 'login' ? (
                <>
                  New to Nexora?{' '}
                  <button type="button" onClick={onSwitch} className="font-semibold text-forest underline-offset-2 hover:underline">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={onSwitch} className="font-semibold text-forest underline-offset-2 hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-ink-400">
            Nexora by Neostats — every moving part, one clear picture.
          </p>
        </div>
      </main>
    </div>
  );
}