import React, { useCallback, useEffect, useState } from 'react';
import Shell from './components/dashboard/Shell.jsx';
import LoginForm from './components/LoginForm.jsx';
import { refreshSession, clearStoredSession, getStoredCookies } from './api';
import type { AppData } from './types';
import './App.css';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Attempt auto-restoring session from stored cookies on mount
  useEffect(() => {
    const savedCookies = getStoredCookies();
    if (savedCookies && Object.keys(savedCookies).length > 0) {
      setRefreshing(true);
      refreshSession({ cookies: savedCookies })
        .then((freshData) => {
          setData(freshData);
          setAuthed(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch(() => {
          clearStoredSession();
          setAuthed(false);
          setData(null);
        })
        .finally(() => {
          setRefreshing(false);
        });
    }
  }, []);

  const handleLoginSuccess = (loginData: AppData) => {
    setData(loginData);
    setAuthed(true);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setError('');
  };

  const handleSync = useCallback(async () => {
    if (!data?.session?.cookies) return;
    setRefreshing(true);
    setError('');

    try {
      const fresh = await refreshSession({
        cookies: data.session.cookies,
        isDemo: data?.metadata?.loginBy === 'demo',
      });
      setData((prev) => ({
        ...prev,
        ...fresh,
        profile: prev?.profile || fresh.profile,
      }));
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err?.message || 'Session expired. Please sign in again.');
      clearStoredSession();
      setAuthed(false);
      setData(null);
    } finally {
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    const onFocus = () => {
      if (authed && data) {
        handleSync();
      }
    };
    
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [authed, data, handleSync]);

  const handleLogout = () => {
    clearStoredSession();
    setAuthed(false);
    setData(null);
    setLastSynced(null);
    setError('');
  };

  if (!authed || !data) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <Shell
      data={data}
      lastSynced={lastSynced}
      onRefresh={handleSync}
      refreshing={refreshing}
      onLogout={handleLogout}
      error={error}
    />
  );
}

export default App;
