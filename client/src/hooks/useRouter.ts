import { useEffect, useState } from 'react';

export type Route = 'home' | 'login' | 'signup' | 'workspace';

const ROUTE_MAP: Record<string, Route> = {
  '/': 'home',
  '/login': 'login',
  '/signup': 'signup',
  '/workspace': 'workspace',
};

const ROUTE_TO_HASH: Record<Route, string> = {
  home: '/',
  login: '/login',
  signup: '/signup',
  workspace: '/workspace',
};

export function useRouter(): { route: Route; navigate: (next: Route) => void; replace: (next: Route) => void } {
  const getRoute = (): Route => {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    return ROUTE_MAP[hash] ?? 'home';
  };

  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    if (!ROUTE_MAP[window.location.hash.replace(/^#/, '') || '/']) {
      window.location.hash = ROUTE_TO_HASH.home;
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next: Route) => {
    if (window.location.hash.replace(/^#/, '') === ROUTE_TO_HASH[next]) return;
    window.location.hash = ROUTE_TO_HASH[next];
    setRoute(next);
  };

  const replace = (next: Route) => {
    window.history.replaceState(null, '', `#${ROUTE_TO_HASH[next]}`);
    setRoute(next);
  };

  return { route, navigate, replace };
}