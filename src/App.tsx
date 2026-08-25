import React, { useState } from 'react';
import Landing from './Landing';
import Auth from './Auth';
import PharmacistPortal from './PharmacistPortal';
import AdminPortal from './AdminPortal';

import type { Role } from './data';
type AppView = 'landing' | 'login' | 'signup' | 'pharmacist' | 'admin';

export default function App() {
  const [view, setView] = useState<AppView>('landing');

  const handleLogin = (r: Role) => {
    setView(r === 'Administrator' ? 'admin' : 'pharmacist');
  };
  const handleLogout = () => setView('landing');

  if (view === 'landing') return <Landing onSignIn={() => setView('login')} onGetStarted={() => setView('signup')} />;
  if (view === 'login') return <Auth mode="signin" onLogin={handleLogin} onSwitch={() => setView('signup')} onBack={() => setView('landing')} />;
  if (view === 'signup') return <Auth mode="signup" onLogin={handleLogin} onSwitch={() => setView('login')} onBack={() => setView('landing')} />;
  if (view === 'pharmacist') return <PharmacistPortal onLogout={handleLogout} />;
  if (view === 'admin') return <AdminPortal onLogout={handleLogout} />;
  return null;
}
