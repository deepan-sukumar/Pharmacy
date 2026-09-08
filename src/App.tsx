import React, { useState } from 'react';
import Landing from './Landing';
import Auth from './Auth';
import PharmacistPortal from './PharmacistPortal';
import { ThemeProvider } from './components/ThemeContext';

type AppView = 'landing' | 'login' | 'signup' | 'pharmacist';

export default function App() {
  const [view, setView] = useState<AppView>('landing');

  const handleLogin = () => {
    setView('pharmacist');
  };
  const handleLogout = () => setView('landing');

  return (
    <ThemeProvider>
      {view === 'landing' && <Landing onSignIn={() => setView('login')} onGetStarted={() => setView('signup')} />}
      {view === 'login' && <Auth mode="signin" onLogin={handleLogin} onSwitch={() => setView('signup')} onBack={() => setView('landing')} />}
      {view === 'signup' && <Auth mode="signup" onLogin={handleLogin} onSwitch={() => setView('login')} onBack={() => setView('landing')} />}
      {view === 'pharmacist' && <PharmacistPortal onLogout={handleLogout} />}
    </ThemeProvider>
  );
}
