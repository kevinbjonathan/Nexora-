import { useEffect } from 'react';

type Route = 'home' | 'workspace';

interface RouterState {
  route: Route;
  navigate: (route: Route) => void;
}

const ROUTE_MAP: Record<string, Route> = {
  '/': 'home',
  '/workspace': 'workspace',
};

const ROUTE_TO_HASH: Record<Route, string> = {
  home: '/',
  workspace: '/workspace',
};

export function useRouter(): RouterState {
  const currentHash = window.location.hash.replace(/^#/, '') || '/';
  const route = ROUTE_MAP[currentHash] ?? 'home';

  const navigate = (next: Route) => {
    window.location.hash = ROUTE_TO_HASH[next];
  };

  useEffect(() => {
    if (!ROUTE_MAP[window.location.hash.replace(/^#/, '') || '/']) {
      window.location.hash = '/';
    }
  }, []);

  return { route, navigate };
}
