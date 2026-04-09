import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import { authAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event fired');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  if (loading) return (
    <div className="loading-screen">
      <img src="/favicon.png" alt="LLO Logo" className="loading-logo" />
      <div className="loading-bar-container">
        <div className="loading-bar-fill"></div>
      </div>
    </div>
  );

  const requiresOnboarding = user && !user.onboardingCompleted;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/onboarding" />} />
        <Route path="/onboarding" element={user ? <Onboarding user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/" element={user ? <Dashboard user={user} setUser={setUser} canInstall={!!deferredPrompt} onInstall={installApp} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
