import { useEffect, useRef, type RefObject } from 'react';
import { cx } from '@/lib/format';
import { usePrefersReducedMotion } from '@/hooks/useHooks';

export type RobotGaze = 'center' | 'email' | 'password';
export type RobotEmotion = 'idle' | 'typing' | 'submitting' | 'success' | 'error';

interface RobotMascotProps {
  /** Element that defines the pointer-tracking space (typically the auth card / root). */
  containerRef?: RefObject<HTMLElement | null>;
  /** Field the user currently focuses — the robot responds to it, never to typed values. */
  gaze?: RobotGaze;
  emotion?: RobotEmotion;
  className?: string;
}

interface TransformTargets {
  headRot: number;
  headTx: number;
  bodyRot: number;
  bodyTx: number;
  gazeX: number;
  gazeY: number;
  browL: number;
  browR: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
/** Damped spring interpolation factor per animation frame. */
const SPRING = 0.085;

/**
 * Nexora's signature character — a compact forest-green robot that leans over the
 * auth card and responds to where the visitor looks and types.
 *
 * Only reacts to pointer *position*, field focus, typing activity, and form state.
 * It never reads, inspects, or logs any password value.
 */
export function RobotMascot({ containerRef, gaze = 'center', emotion = 'idle', className }: RobotMascotProps) {
  const reduced = usePrefersReducedMotion();

  const headRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const pupilLRef = useRef<SVGGElement>(null);
  const pupilRRef = useRef<SVGGElement>(null);
  const browLRef = useRef<SVGGElement>(null);
  const browRRef = useRef<SVGGElement>(null);

  const target = useRef<TransformTargets>({
    headRot: -4,
    headTx: 0,
    bodyRot: 0,
    bodyTx: 0,
    gazeX: 0,
    gazeY: 0,
    browL: 0,
    browR: 0,
  });
  const current = useRef<TransformTargets>({ ...target.current, headRot: -8 });

  const pointer = useRef({ x: 0, y: 0 });
  const introT = useRef(1); // intro settle animation progress

  // -------- Pointer tracking (single listener, ref-based, zero re-renders) --------
  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      const el = containerRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.current.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      pointer.current.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    };
    const onEnter = () => {
      introT.current = 1; // re-settle when the visitor returns
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    containerRef?.current?.addEventListener('pointerenter', onEnter);
    return () => {
      window.removeEventListener('pointermove', onMove);
      containerRef?.current?.removeEventListener('pointerenter', onEnter);
    };
  }, [containerRef, reduced]);

  // -------- Animation loop --------
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = () => {
      const t = target.current;
      const cur = current.current;

      // Gaze = pointer, biased by focused field, damped by intro settle.
      const intro = 1 - introT.current * introT.current; // 0 -> 1
      introT.current = Math.max(0, introT.current - 0.03);

      const pointerX = pointer.current.x * intro;
      const pointerY = pointer.current.y * intro * 0.5;

      let gx = pointerX;
      let gy = pointerY;
      if (gaze === 'email') {
        gx = lerp(pointerX, -0.55, 0.7);
        gy = lerp(pointerY, -0.35, 0.7);
      } else if (gaze === 'password') {
        // Politely avert the gaze — never toward the secret.
        gx = lerp(pointerX, 0.25, 0.6);
        gy = clamp(pointerY, 0.15, 1);
      }

      t.headRot = -(gaze === 'email' ? -10 : gaze === 'password' ? 5 : clamp(pointerX * 10, -11, 11));
      t.headTx = clamp(pointerX * 7, -8, 8);
      t.bodyRot = clamp(pointerX * 4, -5, 5) * -1;
      t.bodyTx = clamp(pointerX * 4, -5, 5);
      t.gazeX = gx;
      t.gazeY = gy;
      t.browL = emotion === 'error' || emotion === 'typing' ? 8 : 0;
      t.browR = emotion === 'error' ? -8 : emotion === 'typing' ? -4 : 0;

      cur.headRot = lerp(cur.headRot, t.headRot, SPRING);
      cur.headTx = lerp(cur.headTx, t.headTx, SPRING);
      cur.bodyRot = lerp(cur.bodyRot, t.bodyRot, SPRING);
      cur.bodyTx = lerp(cur.bodyTx, t.bodyTx, SPRING);
      cur.gazeX = lerp(cur.gazeX, t.gazeX, SPRING);
      cur.gazeY = lerp(cur.gazeY, t.gazeY, SPRING);
      cur.browL = lerp(cur.browL, t.browL, SPRING);
      cur.browR = lerp(cur.browR, t.browR, SPRING);

      if (headRef.current) {
        headRef.current.style.transform = `rotate(${cur.headRot}deg) translate(${cur.headTx}px, 0px)`;
      }
      if (bodyRef.current) {
        bodyRef.current.style.transform = `rotate(${cur.bodyRot}deg) translate(${cur.bodyTx}px, 0px)`;
      }
      if (pupilLRef.current) {
        pupilLRef.current.style.transform = `translate(${cur.gazeX * 4}px, ${cur.gazeY * 2.4}px)`;
      }
      if (pupilRRef.current) {
        pupilRRef.current.style.transform = `translate(${cur.gazeX * 4}px, ${cur.gazeY * 2.4}px)`;
      }
      if (browLRef.current) {
        browLRef.current.style.transform = `rotate(${cur.browL}deg) translateY(${-Math.abs(cur.browL) * 0.25}px)`;
      }
      if (browRRef.current) {
        browRRef.current.style.transform = `rotate(${cur.browR}deg) translateY(${-Math.abs(cur.browR) * 0.25}px)`;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, gaze, emotion]);

  const averted = gaze === 'password';
  const focused = gaze === 'email' || gaze === 'password';

  return (
    <svg
      viewBox="0 0 240 186"
      className={cx('pointer-events-none h-auto w-full select-none', className)}
      aria-hidden="true"
      style={{ maxWidth: 260 }}
      role="presentation"
    >
      <defs>
        <linearGradient id="nhHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#234f40" />
          <stop offset="100%" stopColor="#183c31" />
        </linearGradient>
        <linearGradient id="nhBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#285847" />
          <stop offset="100%" stopColor="#122d24" />
        </linearGradient>
        <linearGradient id="nhFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1eee4" />
        </linearGradient>
        <radialGradient id="nhGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#c8e46a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c8e46a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g
        ref={bodyRef}
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
      >
        {/* Shoulders / chest */}
        <path
          d="M50 190 C50 156 74 142 100 138 L140 138 C166 142 190 156 190 190 Z"
          fill="url(#nhBody)"
        />
        <path
          d="M50 190 C54 162 82 148 110 143"
          stroke="#2e5f4a"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Collar */}
        <rect x="102" y="130" width="36" height="12" rx="6" fill="#0d1f19" />
        <rect x="114" y="133" width="12" height="6" rx="3" fill="#c8e46a" opacity="0.85" />
        {/* Neck */}
        <rect x="110" y="106" width="20" height="26" rx="7" fill="#122d24" />
      </g>

      <g
        ref={headRef}
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
      >
        {/* Antenna */}
        <g>
          <rect x="117.5" y="18" width="5" height="18" rx="2.5" fill="#285847" />
          <circle cx="120" cy="13" r="11" fill="url(#nhGlow)" className="robot-antenna-tip" />
          <circle cx="120" cy="13" r="6.5" fill="#c8e46a" stroke="#122d24" strokeWidth="1.2" className="robot-antenna-tip" />
          <circle cx="120" cy="34" r="3.5" fill="#3a6e54" />
        </g>

        {/* Ears */}
        <rect x="42" y="58" width="22" height="46" rx="11" fill="#234f40" />
        <rect x="47" y="66" width="10" height="30" rx="5" fill="#3a6e54" opacity="0.8" />
        <rect x="176" y="58" width="22" height="46" rx="11" fill="#234f40" />
        <rect x="183" y="66" width="10" height="30" rx="5" fill="#3a6e54" opacity="0.8" />

        {/* Head shell */}
        <rect x="62" y="30" width="116" height="88" rx="37" fill="url(#nhHead)" />
        <ellipse cx="120" cy="44" rx="42" ry="15" fill="#ffffff" opacity="0.07" />

        {/* Face panel */}
        <rect x="78" y="52" width="84" height="52" rx="22" fill="url(#nhFace)" stroke="#e2e5dc" strokeWidth="1" />

        {/* Focus glow behind eyes (lime) */}
        <circle cx="94" cy="84" r="13" fill="#c8e46a" opacity={0} className="robot-eyes-glow" />
        <circle cx="146" cy="84" r="13" fill="#c8e46a" opacity={0} className="robot-eyes-glow" />

        {/* Brows */}
        <g ref={browLRef} style={{ transformBox: 'fill-box', transformOrigin: 'right center' }}>
          <rect x="86" y="60" width="17" height="4.5" rx="2.25" fill="#183c31" />
        </g>
        <g ref={browRRef} style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}>
          <rect x="137" y="60" width="17" height="4.5" rx="2.25" fill="#183c31" />
        </g>

        {/* Eyes */}
        <g>
          {/* Left */}
          <rect x="82" y="70" width="24" height="17" rx="8.5" fill="#ffffff" stroke="#e2e5dc" strokeWidth="1" />
          <g ref={pupilLRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <circle cx="94" cy="79" r="5.6" fill="#285847" />
            <circle cx="94" cy="79" r="2.6" fill="#111713" />
            <circle cx="96" cy="77.4" r="1.2" fill="#ffffff" />
          </g>
          <g className={cx('robot-eyelid robot-blink-critical', averted && 'is-averted')}>
            <rect x="82" y="70" width="24" height="17" rx="8.5" fill="#f1eee4" stroke="none" />
          </g>

          {/* Right */}
          <rect x="134" y="70" width="24" height="17" rx="8.5" fill="#ffffff" stroke="#e2e5dc" strokeWidth="1" />
          <g ref={pupilRRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <circle cx="146" cy="79" r="5.6" fill="#285847" />
            <circle cx="146" cy="79" r="2.6" fill="#111713" />
            <circle cx="148" cy="77.4" r="1.2" fill="#ffffff" />
          </g>
          <g className={cx('robot-eyelid robot-blink-critical', averted && 'is-averted')}>
            <rect x="134" y="70" width="24" height="17" rx="8.5" fill="#f1eee4" stroke="none" />
          </g>
        </g>

        {/* Cheeks */}
        <ellipse cx="90" cy="92" rx="6" ry="3.2" fill="#c8e46a" opacity="0.3" />
        <ellipse cx="150" cy="92" rx="6" ry="3.2" fill="#c8e46a" opacity="0.3" />

        {/* Mouth expressions */}
        <g>
          <path d="M110 95 Q120 104 130 95" stroke="#183c31" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g className="robot-emote" data-emote="typing">
            <ellipse cx="120" cy="96" rx="4.6" ry="5.2" fill="#183c31" />
          </g>
          <g className="robot-emote" data-emote="submitting">
            <rect x="110" y="93" width="20" height="5" rx="2.5" fill="#183c31" />
          </g>
          <g className="robot-emote" data-emote="success">
            <path d="M106 92 Q120 108 134 92 Q120 104 106 92 Z" fill="#183c31" />
          </g>
          <g className="robot-emote" data-emote="error">
            <path d="M110 100 Q120 92 130 100" stroke="#183c31" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </g>

      {/* Re-apply focus-glow visibility via emotion on eyes */}
      <g className={focused ? 'robot-eyes-glow' : ''} opacity={focused ? 1 : 0}>
        <circle cx="94" cy="84" r="13" fill="#c8e46a" opacity={focused ? 0.35 : 0} />
        <circle cx="146" cy="84" r="13" fill="#c8e46a" opacity={focused ? 0.35 : 0} />
      </g>
    </svg>
  );
}