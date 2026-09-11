import React, { useState } from 'react';
import Landing from './Landing';
import Auth from './Auth';
import PharmacistPortal from './PharmacistPortal';
import { ThemeProvider } from './components/ThemeContext';
import { setApiPharmacyId } from './services/api';
import type { Role } from './data';

type AppView = 'landing' | 'login' | 'signup' | 'pharmacist';

export interface UserSession {
  fullName: string;
  email?: string;
  role: Role;
  pharmacyId: string;
  pharmacyName?: string;
}

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [currentUser, setCurrentUser] = useState<UserSession>({
    fullName: 'Demo Pharmacist',
    role: 'Pharmacist',
    pharmacyId: 'DEMO_PHARMACY',
    pharmacyName: 'Apollo MedPlus Central'
  });

  const handleLogin = (_role: Role, user?: any) => {
    const sessionUser: UserSession = {
      fullName: user?.fullName || 'Pharmacist',
      email: user?.email || 'pharmacist@demo.com',
      role: 'Pharmacist',
      pharmacyId: user?.pharmacyId || 'DEMO_PHARMACY',
      pharmacyName: user?.pharmacyName || 'PharmaFlow Workspace'
    };
    setCurrentUser(sessionUser);
    setApiPharmacyId(sessionUser.pharmacyId);
    setView('pharmacist');
  };

  const handleLaunchDemo = () => {
    const demoSession: UserSession = {
      fullName: 'Demo Pharmacist',
      email: 'pharmacist@demo.com',
      role: 'Pharmacist',
      pharmacyId: 'DEMO_PHARMACY',
      pharmacyName: 'Apollo MedPlus Central'
    };
    setCurrentUser(demoSession);
    setApiPharmacyId('DEMO_PHARMACY');
    setView('pharmacist');
  };

  const handleLogout = () => {
    setApiPharmacyId('DEMO_PHARMACY');
    setView('landing');
  };

  return (
    <ThemeProvider>
      {view === 'landing' && (
        <Landing
          onSignIn={() => setView('login')}
          onGetStarted={handleLaunchDemo}
        />
      )}
      {view === 'login' && (
        <Auth
          mode="signin"
          onLogin={handleLogin}
          onSwitch={() => setView('signup')}
          onBack={() => setView('landing')}
        />
      )}
      {view === 'signup' && (
        <Auth
          mode="signup"
          onLogin={handleLogin}
          onSwitch={() => setView('login')}
          onBack={() => setView('landing')}
        />
      )}
      {view === 'pharmacist' && (
        <PharmacistPortal
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
    </ThemeProvider>
  );
}
