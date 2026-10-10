import { type RefObject, useEffect, useState } from 'react';

const PREF = window.matchMedia('(prefers-reduced-motion: reduce)');
const TOUCH = window.matchMedia('(pointer: coarse)');

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(PREF.matches);
  useEffect(() => {
    const onChange = () => setReduced(PREF.matches);
    PREF.addEventListener('change', onChange);
    return () => PREF.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(TOUCH.matches);
  useEffect(() => {
    const onChange = () => setCoarse(TOUCH.matches);
    TOUCH.addEventListener('change', onChange);
    return () => TOUCH.removeEventListener('change', onChange);
  }, []);
  return coarse;
}

/** Run `effect` only when the media query `query` matches. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useOnKeyDown(handler: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function useIsFirstRender(): boolean {
  const [first, setFirst] = useState(true);
  useEffect(() => setFirst(false), []);
  return first;
}

/** Tracks a normalized pointer position (-1..1) relative to an element. */
export function usePointerPosition(ref: RefObject<HTMLElement | null>): { x: number; y: number } {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      setPos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, [ref]);

  return pos;
}