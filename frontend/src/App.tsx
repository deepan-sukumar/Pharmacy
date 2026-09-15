import React, { useState } from 'react';
import Landing from './Landing';
import Auth from './Auth';
import PharmacistPortal from './PharmacistPortal';
import { ThemeProvider } from './components/ThemeContext';
import { setApiPharmacyId, setApiAuthToken, getApiAuthToken, api } from './services/api';
import type { Role } from './data';

type AppView = 'landing' | 'login' | 'signup' | 'pharmacist';

export interface UserSession {
  fullName: string;
  email?: string;
  role: Role;
  pharmacyId: string;
  pharmacyName?: string;
  token?: string;
}

const SESSION_STORAGE_KEY = 'pharmaflow_session';

export default function App() {
  const [view, setView] = useState<AppView>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.pharmacyId) {
          setApiPharmacyId(parsed.pharmacyId);
          if (parsed.token) {
            setApiAuthToken(parsed.token);
          }
          return 'pharmacist';
        }
      }
    } catch {
      // Ignore parse errors
    }
    return 'landing';
  });

  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.pharmacyId) {
          if (parsed.token) {
            setApiAuthToken(parsed.token);
          }
          return {
            fullName: parsed.fullName || 'Pharmacist',
            email: parsed.email || '',
            role: 'Pharmacist',
            pharmacyId: parsed.pharmacyId,
            pharmacyName: parsed.pharmacyName || 'PharmaFlow Workspace',
            token: parsed.token || ''
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {
      fullName: 'Demo Pharmacist',
      email: 'pharmacist@demo.com',
      role: 'Pharmacist',
      pharmacyId: 'DEMO_PHARMACY',
      pharmacyName: 'Apollo MedPlus Central'
    };
  });

  const handleLogin = (_role: Role, user?: any) => {
    const token = user?.token || getApiAuthToken();
    const sessionUser: UserSession = {
      fullName: user?.fullName || 'Pharmacist',
      email: user?.email || '',
      role: 'Pharmacist',
      pharmacyId: user?.pharmacyId || 'DEMO_PHARMACY',
      pharmacyName: user?.pharmacyName || 'PharmaFlow Workspace',
      token
    };
    setCurrentUser(sessionUser);
    setApiPharmacyId(sessionUser.pharmacyId);
    if (token) {
      setApiAuthToken(token);
    }
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
    }
    setView('pharmacist');
  };

  const handleLaunchDemo = async () => {
    try {
      const res = await api.loginUser({ email: 'pharmacist@demo.com', password: 'demo123' });
      if (res?.user) {
        handleLogin('Pharmacist', { ...res.user, token: res.token });
        return;
      }
    } catch (e) {
      console.warn('Demo login via API fallback:', e);
    }
    handleLogin('Pharmacist', {
      fullName: 'Demo Pharmacist',
      email: 'pharmacist@demo.com',
      role: 'Pharmacist',
      pharmacyId: 'DEMO_PHARMACY',
      pharmacyName: 'Apollo MedPlus Central'
    });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove session from localStorage:', e);
    }
    setApiPharmacyId('');
    setApiAuthToken('');
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
