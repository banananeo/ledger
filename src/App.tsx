import React, { useCallback, useEffect, useState } from 'react';
import Shell from './components/dashboard/Shell.jsx';
import LoginForm from './components/LoginForm.jsx';
import { refreshSession, clearStoredSession, getStoredCookies, getStoredData, saveStoredData } from './api';
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
    const savedData = getStoredData();

    if (savedCookies && Object.keys(savedCookies).length > 0) {
      if (savedData) {
        setData(savedData);
        setAuthed(true);
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }

      setRefreshing(true);
      refreshSession({ cookies: savedCookies })
        .then((freshData) => {
          setData(freshData);
          saveStoredData(freshData);
          setAuthed(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err: any) => {
          if (err?.statusCode === 401) {
            clearStoredSession();
            setAuthed(false);
            setData(null);
          } else if (!savedData) {
            // If we don't have offline data to fallback on, log out to show login screen
            clearStoredSession();
            setAuthed(false);
            setData(null);
          } else {
            // We have offline data, just show error
            setError('Could not connect. Showing offline data.');
          }
        })
        .finally(() => {
          setRefreshing(false);
        });
    }
  }, []);

  const handleLoginSuccess = (loginData: AppData) => {
    setData(loginData);
    saveStoredData(loginData);
    setAuthed(true);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setError('');
  };

  const handleSync = useCallback(async () => {
    if (!data?.session?.cookies || refreshing) return;
    setRefreshing(true);
    setError('');

    try {
      const fresh = await refreshSession({
        cookies: data.session.cookies,
        isDemo: data?.metadata?.loginBy === 'demo',
      });
      const mergedData = {
        ...data,
        ...fresh,
        profile: data?.profile || fresh.profile,
      };
      setData(mergedData);
      saveStoredData(mergedData);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err?.message || 'Failed to sync data.');
      // Only log out if it's a 401 Unauthorized (invalid session)
      if (err?.statusCode === 401) {
        clearStoredSession();
        setAuthed(false);
        setData(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, [data, refreshing]);

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
