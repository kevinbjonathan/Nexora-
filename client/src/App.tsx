import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useRouter, type Route } from '@/hooks/useRouter';
import { useToast } from '@/components/Toaster';
import { ToasterProvider } from '@/components/Toaster';
import { AuthPage } from '@/pages/AuthPage';
import { HomePage } from '@/pages/HomePage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { disconnectSocket } from '@/lib/socket';

export function App() {
  return (
    <AuthProvider>
      <ToasterProvider>
        <Shell />
      </ToasterProvider>
    </AuthProvider>
  );
}

function Shell() {
  const { route, navigate, replace } = useRouter();
  const { user, status, logout } = useAuth();
  const toast = useToast();

  // Redirect already-authenticated users away from auth screens.
  useEffect(() => {
    if (status === 'authenticated' && (route === 'login' || route === 'signup')) {
      navigate('workspace');
    }
  }, [status, route, navigate]);

  // Expired session → back to login.
  useEffect(() => {
    if (status === 'unauthenticated') {
      disconnectSocket();
      if (route === 'workspace') replace('login');
      else if (route === 'home' && !window.location.hash) {
        // home is public; keep it.
      }
    }
  }, [status, route, replace]);

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'See you soon. Your session has ended.');
    navigate('login');
  };

  if (status === 'loading' && route !== 'home') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory" role="status" aria-label="Loading">
        <div className="flex flex-col items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-forest/20 border-t-forest" />
          <span className="text-xs font-medium uppercase tracking-eyebrow text-ink-400">Nexora</span>
        </div>
      </div>
    );
  }

  if (route === 'workspace') {
    if (status === 'unauthenticated' || !user)
      return <AuthPage mode="login" onSwitch={() => navigate('signup')} onBack={() => navigate('home')} />;
    return (
      <RouteTransition key="workspace">
        <WorkspacePage onLogout={handleLogout} user={user} onHome={() => navigate('home')} />
      </RouteTransition>
    );
  }

  if (route === 'login') {
    return (
      <RouteTransition key="login">
        <AuthPage mode="login" onSwitch={() => navigate('signup')} onBack={() => navigate('home')} />
      </RouteTransition>
    );
  }

  if (route === 'signup') {
    return (
      <RouteTransition key="signup">
        <AuthPage mode="signup" onSwitch={() => navigate('login')} onBack={() => navigate('home')} />
      </RouteTransition>
    );
  }

  return (
    <RouteTransition key="home">
      <HomePage onEnter={() => navigate(user ? 'workspace' : 'login')} />
    </RouteTransition>
  );
}

function RouteTransition({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

export default App;
export type { Route };