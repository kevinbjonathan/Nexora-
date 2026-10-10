import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ChevronDown,
  Eye,
  GitBranch,
  Layers,
  ListChecks,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useReveal } from '@/hooks/useReveal';
import { usePrefersReducedMotion } from '@/hooks/useHooks';

const HERO_POSTER = '/videos/nexora-hero.mp4';
const VIDEO_SRC = '/videos/nexora-hero.mp4';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export function HomePage({ onEnter }: { onEnter: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [videoOk, setVideoOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleError = () => setVideoOk(false);
    v.addEventListener('error', handleError);
    return () => v.removeEventListener('error', handleError);
  }, []);

  // Mobile menu: lock scroll only while open, always release on unmount.
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-ivory">
      {/* ================= HERO ================= */}
      <section className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-ink">
        {/* Background video / static fallback */}
        {videoOk && !reduced ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_POSTER}
            onError={() => setVideoOk(false)}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center opacity-55"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
        ) : (
          /* Matching static backdrop so the hero never looks broken */
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-45"
            style={{
              backgroundImage: `url(${VIDEO_SRC})`,
              backgroundColor: '#111713',
            }}
            aria-hidden="true"
          />
        )}

        {/* Forest/charcoal overlays keep text readable without muddying the footage */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink/95" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-ink/70 via-transparent to-ink/30" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-b from-transparent to-ink" aria-hidden="true" />

        {/* Nav — above the video */}
        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10" aria-label="Main navigation">
          <Logo theme="dark" />
          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: 'Product', target: 'product' },
              { label: 'How it works', target: 'workflow' },
              { label: 'Collaboration', target: 'roles' },
            ].map((item) => (
              <button
                key={item.target}
                onClick={() => scrollToId(item.target)}
                className="text-sm font-medium text-ivory/80 transition-colors hover:text-lime"
              >
                {item.label}
              </button>
            ))}
            <button onClick={onEnter} className="text-sm font-medium text-ivory/80 transition-colors hover:text-lime">
              Sign in
            </button>
          </div>
          <div className="hidden md:block">
            <button
              onClick={onEnter}
              className="group inline-flex items-center gap-2 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-lime-dark hover:shadow-lg active:scale-[0.98]"
            >
              Open workspace
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
          <button
            className="md:hidden text-ivory"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu size={24} />
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-ink md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="flex items-center justify-between px-6 py-5">
              <Logo theme="dark" />
              <button onClick={closeMenu} aria-label="Close menu" className="text-ivory">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-6 px-6 pt-8">
              {[
                { label: 'Product', target: 'product' },
                { label: 'How it works', target: 'workflow' },
                { label: 'Collaboration', target: 'roles' },
              ].map((item) => (
                <button
                  key={item.target}
                  onClick={() => {
                    closeMenu();
                    scrollToId(item.target);
                  }}
                  className="text-left text-lg font-display text-ivory/90"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  closeMenu();
                  onEnter();
                }}
                className="text-left text-lg font-display text-lime"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  closeMenu();
                  onEnter();
                }}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-ink"
              >
                Open workspace <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Hero content — above the video */}
        <div className="relative z-10 mx-auto flex h-[calc(100%-76px)] max-w-7xl flex-col justify-center px-6 lg:px-10">
          <div className="max-w-3xl">
            <p className="animate-fade-in-down text-xs font-semibold uppercase tracking-eyebrow text-lime">
              Nexora by Neostats
            </p>
            <h1 className="mt-6 animate-fade-in-up font-display text-display-2xl text-ivory text-balance">
              Every moving part.
              <br />
              <span className="text-ivory/85 italic">One clear picture.</span>
            </h1>
            <p className="mt-7 max-w-xl animate-fade-in-up text-lg text-ivory/75 leading-relaxed animate-delay-200 text-pretty">
              See what is moving, what is blocked, and what changed — live, from a single command center, without chasing updates across your team.
            </p>
            <div className="mt-10 flex animate-fade-in-up animate-delay-300 flex-col gap-3 sm:flex-row">
              <button
                onClick={onEnter}
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-lime-dark hover:shadow-xl active:scale-[0.98]"
              >
                Open the workspace
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => scrollToId('workflow')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ivory/25 px-7 py-3.5 text-sm font-semibold text-ivory transition-all duration-300 ease-smooth hover:bg-ivory/10 active:scale-[0.98]"
              >
                See how it works
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <button
          onClick={() => scrollToId('product')}
          className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-ivory/50 transition-colors hover:text-lime md:flex"
          aria-label="Scroll to product overview"
        >
          <span className="text-[10px] font-medium uppercase tracking-eyebrow">Scroll</span>
          <ArrowDown size={16} className="animate-scroll-cue" />
        </button>
      </section>

      {/* ================= PRODUCT OVERVIEW ================= */}
      <section id="product" className="relative bg-ivory py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <RevealBlock>
            <p className="eyebrow text-forest">What Nexora does</p>
            <h2 className="mt-4 max-w-2xl font-display text-display-lg text-ink text-balance">
              Three layers, one connected view.
            </h2>
            <p className="mt-6 max-w-prose-editorial text-lg text-ink-400 leading-relaxed text-pretty">
              Projects contain tasks. Tasks produce changes. Changes tell the story of where your work actually is. Nexora connects those layers so you never assemble the picture yourself.
            </p>
          </RevealBlock>

          <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
            {[
              { icon: Layers, label: 'Projects', desc: 'Track every initiative with status, ownership, live progress, and the milestone that matters next.' },
              { icon: ListChecks, label: 'Tasks', desc: 'See work in motion — in progress, blocked, in review, or done — with ownership and real due dates.' },
              { icon: Activity, label: 'Change Radar', desc: 'A live, honest timeline of who did what, when, and in which project. Momentum, not just deadlines.' },
            ].map((item) => (
              <RevealBlock key={item.label} className="group bg-white p-8 lg:p-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-forest/8 transition-colors duration-300 group-hover:bg-forest/14">
                  <item.icon size={20} className="text-forest" strokeWidth={1.6} />
                </div>
                <h3 className="mt-6 font-display text-2xl font-medium text-ink">{item.label}</h3>
                <p className="mt-3 text-ink-400 leading-relaxed">{item.desc}</p>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CHANGE RADAR STORY ================= */}
      <section className="relative overflow-hidden bg-ink py-24 lg:py-32">
        <div className="absolute inset-0 bg-dots-forest opacity-20" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <RevealBlock>
              <p className="eyebrow text-lime">Change Radar</p>
              <h2 className="mt-4 font-display text-display-lg text-ivory text-balance">
                Know what changed, not just what is due.
              </h2>
              <p className="mt-6 max-w-prose-editorial text-lg text-ivory/70 leading-relaxed text-pretty">
                Most dashboards tell you what is late. Nexora tells you what moved — who touched what, when, and which project it belongs to. Every event is a real, persisted change. Nothing is fabricated.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'A readable activity timeline, not a firehose.',
                  'Every change linked to a project, a task, and a person.',
                  'Realtime updates as your team works — no refresh needed.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-ivory/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </RevealBlock>

            <RevealBlock className="rounded-xl border border-ivory/10 bg-ink-800/70 p-6 lg:p-8">
              <div className="flex items-center justify-between border-b border-ivory/10 pb-4">
                <span className="text-sm font-semibold text-ivory">What the radar surfaces</span>
                <span className="text-xs text-ivory/40">Live data</span>
              </div>
              <div className="mt-5 space-y-2">
                {[
                  { icon: Users, label: 'Who', desc: 'Every change attributed to a real person.' },
                  { icon: GitBranch, label: 'What', desc: 'The exact task or field that moved.' },
                  { icon: Layers, label: 'Where', desc: 'The project the work belongs to.' },
                  { icon: Activity, label: 'When', desc: 'Timestamps you can trust, in your local time.' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-ivory/5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-light">
                      <row.icon size={16} className="text-ivory" strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ivory">{row.label}</p>
                      <p className="text-xs text-ivory/50">{row.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* ================= WORKFLOW ================= */}
      <section id="workflow" className="bg-ivory py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <RevealBlock className="text-center">
            <p className="eyebrow text-forest">How it works</p>
            <h2 className="mt-4 mx-auto max-w-2xl font-display text-display-lg text-ink text-balance">
              Plan deliberately. Execute visibly. Understand quickly.
            </h2>
          </RevealBlock>

          <div className="mt-20 grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: 'Plan', desc: 'Create a workspace, add projects, assign owners, and set the milestones that matter. Every task has a home.' },
              { step: '02', title: 'Execute', desc: 'Work moves across statuses in the open. Blocked items surface immediately — no silent stalls.' },
              { step: '03', title: 'Understand', desc: 'The Change Radar shows what happened, when, and by whom. You see momentum at a glance.' },
            ].map((phase) => (
              <RevealBlock key={phase.step} className="relative">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-5xl font-light text-forest/30">{phase.step}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="mt-6 font-display text-3xl font-medium text-ink">{phase.title}</h3>
                <p className="mt-4 text-ink-400 leading-relaxed">{phase.desc}</p>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ROLES ================= */}
      <section id="roles" className="border-y border-border bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <RevealBlock>
              <p className="eyebrow text-forest">Collaboration</p>
              <h2 className="mt-4 font-display text-display-lg text-ink text-balance">
                Everyone sees the same live picture.
              </h2>
              <p className="mt-6 max-w-prose-editorial text-lg text-ink-400 leading-relaxed text-pretty">
                Nexora maps real roles to real permissions. Frontend controls respect the backend authorization — so the interface adapts honestly, project by project.
              </p>
              <ul className="mt-8 space-y-3">
                {['Secure cookie sessions, hashed passwords.', 'Server-enforced permissions — never just hidden buttons.', 'No fake activity, no fabricated metrics, ever.'].map((line) => (
                  <li key={line} className="flex items-center gap-3 text-sm text-ink-500">
                    <ShieldCheck size={16} className="shrink-0 text-forest" />
                    {line}
                  </li>
                ))}
              </ul>
            </RevealBlock>

            <RevealBlock className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Eye, name: 'Viewer', role: 'Read-only clarity for stakeholders.' },
                { icon: ListChecks, name: 'Team Member', role: 'Commands every permission grants.' },
                { icon: GitBranch, name: 'Project Manager', role: 'Owns projects, tasks, and assignments.' },
                { icon: ShieldCheck, name: 'Admin', role: 'Runs the workspace and its members.' },
              ].map((m) => (
                <div key={m.name} className="card p-5 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-xs text-ivory">
                      <m.icon size={17} strokeWidth={1.6} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{m.name}</p>
                      <p className="text-xs text-ink-400">{m.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-ink-400">Exact permissions</span>
                    <span className="text-sm font-semibold text-forest">Defined by the API</span>
                  </div>
                </div>
              ))}
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden bg-forest py-24 lg:py-32">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: 'radial-gradient(ellipse at 70% 30%, #285847 0%, transparent 60%)' }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <RevealBlock>
            <h2 className="mx-auto max-w-2xl font-display text-display-xl text-ivory text-balance">
              Stop chasing updates.
              <br />
              Start seeing them.
            </h2>
            <p className="mt-8 mx-auto max-w-lg text-lg text-ivory/70 text-pretty">
              Open the workspace and look at a project the way it actually is — right now.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onEnter}
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-lime-dark hover:shadow-xl active:scale-[0.98]"
              >
                Open the workspace
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => scrollToId('product')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ivory/25 px-7 py-3.5 text-sm font-semibold text-ivory transition-all duration-300 ease-smooth hover:bg-ivory/10 active:scale-[0.98]"
              >
                Back to overview
              </button>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-ink py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-ivory/10 pb-8 md:flex-row">
            <Logo theme="dark" />
            <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
              <button onClick={() => scrollToId('product')} className="text-sm text-ivory/60 transition-colors hover:text-lime">
                Product
              </button>
              <button onClick={() => scrollToId('workflow')} className="text-sm text-ivory/60 transition-colors hover:text-lime">
                How it works
              </button>
              <button onClick={() => scrollToId('roles')} className="text-sm text-ivory/60 transition-colors hover:text-lime">
                Collaboration
              </button>
              <button onClick={onEnter} className="text-sm text-ivory/60 transition-colors hover:text-lime">
                Workspace
              </button>
            </nav>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
            <p className="text-xs text-ivory/40">Nexora by Neostats — The Live Project Command Center</p>
            <p className="text-xs text-ivory/40">Live backend. Secure sessions. No fabricated data.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RevealBlock({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [ref, inView] = useReveal();
  return (
    <div ref={ref} className={`reveal ${inView ? 'revealed' : ''} ${className}`}>
      {children}
    </div>
  );
}