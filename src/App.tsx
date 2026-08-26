import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import Shell from './components/dashboard/Shell.jsx';
import LoginForm from './components/LoginForm.jsx';
import CaptchaModal from './components/CaptchaModal.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import {
  refreshSession,
  clearStoredSession,
  getStoredCookies,
  getStoredCredentials,
  getStoredData,
  saveStoredData,
  ApiError,
  CaptchaChallenge,
} from './api';
import type { AppData } from './types';
import './App.css';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Brief initial splash on app mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  // Attempt auto-restoring session from stored cookies or credentials on mount
  useEffect(() => {
    const savedCookies = getStoredCookies();
    const savedData = getStoredData();
    const savedCreds = getStoredCredentials();

    if (savedData) {
      setData(savedData);
      setAuthed(true);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    if ((savedCookies && Object.keys(savedCookies).length > 0) || savedCreds) {
      setRefreshing(true);
      refreshSession({
        cookies: savedCookies || undefined,
        username: savedCreds?.username,
        password: savedCreds?.password,
      })
        .then((freshData) => {
          setData((prev) => {
            const merged = {
              ...(prev || {}),
              ...freshData,
              profile: prev?.profile || freshData.profile,
              courses: freshData.courses || prev?.courses,
              schedule: freshData.schedule || prev?.schedule,
              calendar: freshData.calendar || prev?.calendar,
            } as AppData;
            saveStoredData(merged);
            return merged;
          });
          setAuthed(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setError('');
        })
        .catch((err: any) => {
          if (err instanceof ApiError && err.captchaChallenge) {
            setCaptchaChallenge(err.captchaChallenge);
          } else if (savedData) {
            // Keep user logged in with cached offline data
            setError(
              err?.statusCode === 401
                ? 'Session expired on Academia. Showing offline data.'
                : 'Could not connect to Academia. Showing offline data.'
            );
          } else {
            // No offline data available at all, show login
            clearStoredSession();
            setAuthed(false);
            setData(null);
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

  const handleSync = useCallback(async (captchaText?: string) => {
    if (refreshing) return;
    const savedCreds = getStoredCredentials();
    const currentCookies = data?.session?.cookies || getStoredCookies() || undefined;

    if (!currentCookies && !savedCreds) return;

    setRefreshing(true);
    setError('');

    try {
      const fresh = await refreshSession({
        cookies: currentCookies,
        username: savedCreds?.username,
        password: savedCreds?.password,
        captcha: captchaText,
        cdigest: captchaChallenge?.cdigest,
        isDemo: data?.metadata?.loginBy === 'demo',
      });
      const mergedData: AppData = {
        ...data,
        ...fresh,
        profile: data?.profile || fresh.profile,
        courses: fresh.courses || data?.courses,
        schedule: fresh.schedule || data?.schedule,
        calendar: fresh.calendar || data?.calendar,
      };
      setData(mergedData);
      saveStoredData(mergedData);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setError('');
      setCaptchaChallenge(null);
    } catch (err: any) {
      if (err instanceof ApiError && err.captchaChallenge) {
        setCaptchaChallenge(err.captchaChallenge);
      } else if (err?.statusCode === 401) {
        setError('Session expired on Academia. Please sign in again to sync latest data.');
      } else {
        setError(err?.message || 'Failed to sync with Academia. Showing saved data.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [data, refreshing, captchaChallenge]);

  useEffect(() => {
    let lastSyncTime = Date.now();
    const onFocus = () => {
      const now = Date.now();
      // Auto-sync at most once every 3 minutes on window focus/network recovery
      if (authed && data && now - lastSyncTime > 180000 && !refreshing) {
        lastSyncTime = now;
        handleSync();
      }
    };
    
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [authed, data, handleSync, refreshing]);

  const handleLogout = () => {
    clearStoredSession();
    setAuthed(false);
    setData(null);
    setLastSynced(null);
    setError('');
    setCaptchaChallenge(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!authed || !data ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <LoginForm onSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Shell
              data={data}
              lastSynced={lastSynced}
              onRefresh={() => handleSync()}
              refreshing={refreshing}
              onLogout={handleLogout}
              error={error}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {captchaChallenge && (
          <CaptchaModal
            key="captcha"
            challenge={captchaChallenge}
            onSubmit={(code) => handleSync(code)}
            onCancel={() => setCaptchaChallenge(null)}
            loading={refreshing}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;

