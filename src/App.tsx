import React, { useState } from 'react';
import Landing from './Landing';
import Auth from './Auth';
import PharmacistPortal from './PharmacistPortal';

type AppView = 'landing' | 'login' | 'signup' | 'pharmacist';

export default function App() {
  const [view, setView] = useState<AppView>('landing');

  const handleLogin = () => {
    setView('pharmacist');
  };
  const handleLogout = () => setView('landing');

  if (view === 'landing') return <Landing onSignIn={() => setView('login')} onGetStarted={() => setView('signup')} />;
  if (view === 'login') return <Auth mode="signin" onLogin={handleLogin} onSwitch={() => setView('signup')} onBack={() => setView('landing')} />;
  if (view === 'signup') return <Auth mode="signup" onLogin={handleLogin} onSwitch={() => setView('login')} onBack={() => setView('landing')} />;
  if (view === 'pharmacist') return <PharmacistPortal onLogout={handleLogout} />;
  return null;
}
