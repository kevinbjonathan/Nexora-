import { useEffect, useState } from 'react';
import { HomePage } from '@/pages/HomePage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { useRouter } from '@/hooks/useRouter';

function App() {
  const { route, navigate } = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const handleNavigate = (next: 'home' | 'workspace') => {
    setTransitioning(true);
    setTimeout(() => {
      navigate(next);
      setTransitioning(false);
    }, 150);
  };

  return (
    <div
      className={`transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
    >
      {route === 'home' ? (
        <HomePage onEnterWorkspace={() => handleNavigate('workspace')} />
      ) : (
        <WorkspacePage onExit={() => handleNavigate('home')} />
      )}
    </div>
  );
}

export default App;
