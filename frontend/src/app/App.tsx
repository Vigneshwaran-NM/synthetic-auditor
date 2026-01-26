import { useState, useEffect } from 'react';
import { HeroLanding } from './components/HeroLanding';
import { Dashboard } from './components/Dashboard';
import { CustomCursor } from './components/CustomCursor';
import { BackendStatus } from './components/BackendStatus';
import { Toaster } from 'sonner';
import { checkBackendAvailability } from '../services/auditorApi';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'hero' | 'dashboard'>('hero');
  const [isBackendReady, setIsBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendAvailability().then(setIsBackendReady);
  }, []);

  return (
    <div className="min-h-screen" style={{ cursor: 'none' }}>
      <CustomCursor />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(26, 31, 46, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#F8FAFC',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
      
      {currentPage === 'hero' ? (
        <HeroLanding onLaunchAuditor={() => setCurrentPage('dashboard')} />
      ) : (
        <>
          <div className="fixed top-4 right-4 z-50 w-96">
            <BackendStatus />
          </div>
          <Dashboard onBack={() => setCurrentPage('hero')} />
        </>
      )}
    </div>
  );
}