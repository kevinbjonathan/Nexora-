import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowDown,
  Layers,
  Activity,
  GitBranch,
  ChevronDown,
  X,
  Menu,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useReveal } from '@/hooks/useReveal';

const HERO_POSTER = 'https://images.pexels.com/photos/28589263/pexels-photo-28589263.jpeg?auto=compress&cs=tinysrgb&w=1920';
const HERO_VIDEO = import.meta.env.VITE_NEXORA_HERO_VIDEO || '/videos/nexora-hero.mp4';

const SECTION_POSTER = 'https://images.pexels.com/photos/17187918/pexels-photo-17187918.jpeg?auto=compress&cs=tinysrgb&w=1600';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export function HomePage({ onEnterWorkspace }: { onEnterWorkspace: () => void }) {
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

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-ivory">
      {/* === HERO === */}
      <section className="relative h-screen min-h-[680px] w-full overflow-hidden bg-ink">
        {/* Background video / poster fallback */}
        {videoOk ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_POSTER}
            onError={() => setVideoOk(false)}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-60 motion-reduce:opacity-40"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        ) : (
          <div
            className="absolute inset-0 h-full w-full bg-cover bg-center opacity-50 motion-reduce:opacity-40"
            style={{ backgroundImage: `url(${HERO_POSTER})` }}
            aria-hidden="true"
          />
        )}

        {/* Gradient overlays for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink/90" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-ink" aria-hidden="true" />

        {/* Nav */}
        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10" aria-label="Main navigation">
          <Logo theme="dark" />
          <div className="hidden items-center gap-8 md:flex">
            <button onClick={() => scrollToId('product')} className="text-sm font-medium text-ivory/80 transition-colors hover:text-lime">
              Product
            </button>
            <button onClick={() => scrollToId('workflow')} className="text-sm font-medium text-ivory/80 transition-colors hover:text-lime">
              How it works
            </button>
            <button onClick={() => scrollToId('team')} className="text-sm font-medium text-ivory/80 transition-colors hover:text-lime">
              Collaboration
            </button>
            <button onClick={onEnterWorkspace} className="text-sm font-medium text-ivory/80 transition-colors hover:text-lime">
              Sign in
            </button>
          </div>
          <div className="hidden md:block">
            <button onClick={onEnterWorkspace} className="inline-flex items-center gap-2 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-lime-dark hover:shadow-lg active:scale-[0.98]">
              Open workspace
              <ArrowRight size={15} />
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
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="text-ivory">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-6 px-6 pt-8">
              <button onClick={() => { scrollToId('product'); setMenuOpen(false); }} className="text-left text-lg font-display text-ivory/90">Product</button>
              <button onClick={() => { scrollToId('workflow'); setMenuOpen(false); }} className="text-left text-lg font-display text-ivory/90">How it works</button>
              <button onClick={() => { scrollToId('team'); setMenuOpen(false); }} className="text-left text-lg font-display text-ivory/90">Collaboration</button>
              <button onClick={() => { onEnterWorkspace(); setMenuOpen(false); }} className="text-left text-lg font-display text-lime">Sign in</button>
              <button onClick={() => { onEnterWorkspace(); setMenuOpen(false); }} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-ink">
                Open workspace <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex h-[calc(100%-76px)] max-w-7xl flex-col justify-center px-6 lg:px-10">
          <div className="max-w-3xl">
            <p className="animate-fade-in-down text-xs font-semibold uppercase tracking-eyebrow text-lime">
              The Live Project Command Center
            </p>
            <h1 className="mt-6 animate-fade-in-up font-display text-display-2xl text-ivory text-balance">
              Every moving part.
              <br />
              One clear picture.
            </h1>
            <p className="mt-7 max-w-xl animate-fade-in-up text-lg text-ivory/75 leading-relaxed animate-delay-200 text-pretty">
              See what is moving, what is blocked, and what changed — without chasing updates across your team.
            </p>
            <div className="mt-10 flex animate-fade-in-up animate-delay-300 flex-col gap-3 sm:flex-row">
              <button onClick={onEnterWorkspace} className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-6 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-lime-dark hover:shadow-xl active:scale-[0.98]">
                Open workspace
                <ArrowRight size={16} />
              </button>
              <button onClick={() => scrollToId('workflow')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ivory/25 px-6 py-3.5 text-sm font-semibold text-ivory transition-all duration-300 ease-smooth hover:bg-ivory/10 active:scale-[0.98]">
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

      {/* === PRODUCT OVERVIEW === */}
      <section id="product" className="relative bg-ivory py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <RevealBlock>
            <p className="eyebrow text-forest">What Nexora does</p>
            <h2 className="mt-4 max-w-2xl font-display text-display-lg text-ink text-balance">
              Three layers, one connected view.
            </h2>
            <p className="mt-6 max-w-prose-editorial text-lg text-ink-400 leading-relaxed text-pretty">
              Projects contain tasks. Tasks produce changes. Changes tell the story of where your work actually is. Nexora connects those layers so you never have to assemble the picture yourself.
            </p>
          </RevealBlock>

          <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
            {[
              {
                icon: Layers,
                label: 'Projects',
                desc: 'Track every initiative with status, ownership, and the milestone that matters next.',
              },
              {
                icon: GitBranch,
                label: 'Tasks',
                desc: 'See work in motion — what is in progress, blocked, due soon, or already done.',
              },
              {
                icon: Activity,
                label: 'Changes',
                desc: 'A running timeline of who did what, so nothing slips through without a trace.',
              },
            ].map((item) => (
              <RevealBlock key={item.label} className="bg-white p-8 lg:p-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-forest/8">
                  <item.icon size={20} className="text-forest" strokeWidth={1.6} />
                </div>
                <h3 className="mt-6 font-display text-2xl font-medium text-ink">{item.label}</h3>
                <p className="mt-3 text-ink-400 leading-relaxed">{item.desc}</p>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* === KNOW WHAT CHANGED — CHANGE RADAR PREVIEW === */}
      <section className="relative overflow-hidden bg-ink py-24 lg:py-32">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${SECTION_POSTER})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/80 to-ink" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <RevealBlock>
              <p className="eyebrow text-lime">Change Radar</p>
              <h2 className="mt-4 font-display text-display-lg text-ivory text-balance">
                Know what changed, not just what is due.
            </h2>
              <p className="mt-6 max-w-prose-editorial text-lg text-ivory/70 leading-relaxed text-pretty">
                Most dashboards tell you what is late. Nexora tells you what moved — who touched what, when it happened, and which project it belongs to. You see momentum, not just deadlines.
              </p>
              <ul className="mt-8 space-y-4">
                {['A readable activity timeline, not a firehose.', 'Every change linked to a project and a person.', 'No manufactured activity — only what actually happened.'].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-ivory/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </RevealBlock>

            <RevealBlock className="rounded-xl border border-ivory/10 bg-ink-800/80 p-6 backdrop-blur-sm lg:p-8">
              <div className="flex items-center justify-between border-b border-ivory/10 pb-4">
                <span className="text-sm font-semibold text-ivory">Recent activity</span>
                <span className="text-xs text-ivory/40">Demo data</span>
              </div>
              <div className="mt-4 space-y-1">
                {[
                  { initials: 'MC', actor: 'Maya Chen', action: 'moved', target: 'Finalize staging env vars', project: 'Atlas Platform', time: '12m', color: 'bg-forest-light' },
                  { initials: 'EV', actor: 'Elena Voss', action: 'completed', target: 'Performance benchmark', project: 'Mobile Sprint', time: '1h', color: 'bg-lime' },
                  { initials: 'SO', actor: 'Sam Okoro', action: 'created', target: 'DB migration review', project: 'Atlas Platform', time: '2h', color: 'bg-forest-light' },
                  { initials: 'JW', actor: 'Jonas Weber', action: 'updated', target: 'Design token audit', project: 'Brand Refresh', time: '3h', color: 'bg-forest-light' },
                ].map((c) => (
                  <div key={c.target} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-ivory/5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.color} text-xs font-semibold ${c.color === 'bg-lime' ? 'text-ink' : 'text-ivory'}`}>
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ivory/90">
                        <span className="font-medium text-ivory">{c.actor}</span>{' '}
                        <span className="text-ivory/50">{c.action}</span>{' '}
                        <span className="text-ivory/90">{c.target}</span>
                      </p>
                      <p className="truncate text-xs text-ivory/40">{c.project}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ivory/40">{c.time}</span>
                  </div>
                ))}
              </div>
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* === WORKFLOW: PLAN -> EXECUTE -> UNDERSTAND === */}
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
              { step: '01', title: 'Plan', desc: 'Define projects, assign owners, and set the milestones that matter. Every task has a home.' },
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

      {/* === TEAM COLLABORATION === */}
      <section id="team" className="border-y border-border bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <RevealBlock>
              <p className="eyebrow text-forest">Collaboration</p>
              <h2 className="mt-4 font-display text-display-lg text-ink text-balance">
                Built for teams that work in the open.
              </h2>
              <p className="mt-6 max-w-prose-editorial text-lg text-ink-400 leading-relaxed text-pretty">
                Ownership is visible. Assignees are clear. When someone picks up a task or hits a wall, the whole team can see it without asking for a status update.
              </p>
              <p className="mt-4 max-w-prose-editorial text-ink-400 leading-relaxed">
                No fake live badges, no simulated activity — just an honest, shared view of where the work stands.
              </p>
            </RevealBlock>

            <RevealBlock className="grid gap-4 sm:grid-cols-2">
              {[
                { initials: 'MC', name: 'Maya Chen', role: 'Tech Lead', tasks: 3 },
                { initials: 'PS', name: 'Priya Sharma', role: 'Product Designer', tasks: 3 },
                { initials: 'SO', name: 'Sam Okoro', role: 'DevOps Engineer', tasks: 2 },
                { initials: 'JW', name: 'Jonas Weber', role: 'Brand Designer', tasks: 2 },
              ].map((m) => (
                <div key={m.name} className="card-editorial p-5 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-xs font-semibold text-ivory">
                      {m.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
                      <p className="truncate text-xs text-ink-400">{m.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-ink-400">Active tasks</span>
                    <span className="text-sm font-semibold text-forest">{m.tasks}</span>
                  </div>
                </div>
              ))}
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="relative overflow-hidden bg-forest py-24 lg:py-32">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 70% 30%, #285847 0%, transparent 60%)' }} aria-hidden="true" />
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
                onClick={onEnterWorkspace}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-6 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-lime-dark hover:shadow-xl active:scale-[0.98]"
              >
                Open workspace
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollToId('product')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ivory/25 px-6 py-3.5 text-sm font-semibold text-ivory transition-all duration-300 ease-smooth hover:bg-ivory/10 active:scale-[0.98]"
              >
                Back to overview
              </button>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="bg-ink py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-ivory/10 pb-8 md:flex-row">
            <Logo theme="dark" />
            <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
              <button onClick={() => scrollToId('product')} className="text-sm text-ivory/60 transition-colors hover:text-lime">Product</button>
              <button onClick={() => scrollToId('workflow')} className="text-sm text-ivory/60 transition-colors hover:text-lime">How it works</button>
              <button onClick={() => scrollToId('team')} className="text-sm text-ivory/60 transition-colors hover:text-lime">Collaboration</button>
              <button onClick={onEnterWorkspace} className="text-sm text-ivory/60 transition-colors hover:text-lime">Workspace</button>
            </nav>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
            <p className="text-xs text-ivory/40">Nexora — The Live Project Command Center</p>
            <p className="text-xs text-ivory/40">Built with demo data. No live backend connected.</p>
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
