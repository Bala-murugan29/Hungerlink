import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import DonorDashboard from './DonorDashboard';
import RecipientDashboard from './RecipientDashboard';
import LanguageButton from './components/LanguageButton';

type AuthState = 'login' | 'signup' | 'authenticated';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'donor' | 'recipient' | 'ngo';
  location: {
    address: string;
    coordinates: {
      type: string;
      coordinates: number[];
    };
  };
  ngoDetails?: {
    registrationId: string;
    isVerified: boolean;
  };
}

function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [user, setUser] = useState<User | null>(null);
  // const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing auth token on app load
    const savedToken = localStorage.getItem('hungerlink_token');
    const savedUser = localStorage.getItem('hungerlink_user');
    
  if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setAuthState('authenticated');
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('hungerlink_token');
        localStorage.removeItem('hungerlink_user');
      }
    }
  }, []);

  const handleAuthSuccess = (authData: any) => {
    console.log('Auth success data:', authData);
    
    if (authData.success && authData.user && authData.token) {
      setUser(authData.user);
      // setToken(authData.token);
      setAuthState('authenticated');
      
      // Save to localStorage
      localStorage.setItem('hungerlink_token', authData.token);
      localStorage.setItem('hungerlink_user', JSON.stringify(authData.user));
    }
  };

  const handleLogout = () => {
    setUser(null);
    // setToken(null);
    setAuthState('login');
    
    // Clear localStorage
    localStorage.removeItem('hungerlink_token');
    localStorage.removeItem('hungerlink_user');
  };

  let content: React.ReactNode = (
    <LoginPage
      onNavigateToSignup={() => setAuthState('signup')}
      onAuthSuccess={handleAuthSuccess}
    />
  );

  if (authState === 'signup') {
    content = (
      <SignupPage
        onNavigateToLogin={() => setAuthState('login')}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  if (authState === 'authenticated' && user) {
    if (user.role === 'donor') {
      content = <DonorDashboard user={user} onLogout={handleLogout} />;
    } else if (user.role === 'recipient' || user.role === 'ngo') {
      content = <RecipientDashboard user={user} onLogout={handleLogout} />;
    }
  }

  return (
    <>
      <LanguageButton />
      {content}
    </>
  );
}

export default App;
