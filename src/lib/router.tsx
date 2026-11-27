import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';

interface RouteState {
  path: string;
  params: Record<string, string>;
}

const RouteParamsContext = createContext<Record<string, string>>({});

function parseHash(): RouteState {
  const hash = window.location.hash.slice(1) || '/';
  const [path, queryString] = hash.split('?');
  const params: Record<string, string> = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => {
      params[k] = v;
    });
  }
  return { path, params };
}

export function useRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo(0, 0);
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

interface RouterProps {
  routes: { pattern: string; component: ReactNode }[];
  fallback?: ReactNode;
}

export function Router({ routes, fallback }: RouterProps) {
  const route = useRoute();

  for (const r of routes) {
    const params = matchRoute(r.pattern, route.path);
    if (params) {
      return <RouteParamsProvider params={params}>{r.component}</RouteParamsProvider>;
    }
  }

  return <>{fallback || null}</>;
}

function RouteParamsProvider({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  return <RouteParamsContext.Provider value={params}>{children}</RouteParamsContext.Provider>;
}

export function useParams(): Record<string, string> {
  return useContext(RouteParamsContext);
}
