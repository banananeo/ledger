import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function mergeAppData(prev: AppData | null, fresh: AppData): AppData {
  return {
    ...(prev || {}),
    ...fresh,
    profile: fresh.profile || prev?.profile,
    attendance: fresh.attendance || prev?.attendance,
    marks: fresh.marks || prev?.marks,
    courses: fresh.courses || prev?.courses,
    schedule: fresh.schedule || prev?.schedule,
    calendar: fresh.calendar || prev?.calendar,
    session: fresh.session || prev?.session,
    metadata: {
      ...(prev?.metadata || {}),
      ...(fresh?.metadata || {}),
    },
  };
}

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashProgress, setSplashProgress] = useState<number>(15);

  const lastSyncTimeRef = useRef<number>(Date.now());
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Brief initial splash progress increment on app mount
  useEffect(() => {
    const minTimer = setTimeout(() => setSplashProgress((p) => Math.max(p, 60)), 350);
    return () => clearTimeout(minTimer);
  }, []);

  // Cleanup any lingering splash hide timers on unmount
  useEffect(() => {
    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }
    };
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
      setSplashProgress((p) => Math.max(p, 45));
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
            const merged = mergeAppData(prev, freshData);
            saveStoredData(merged);
            return merged;
          });
          setAuthed(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          lastSyncTimeRef.current = Date.now();
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
          setSplashProgress(100);
          splashTimerRef.current = setTimeout(() => setShowSplash(false), 200);
        });
    } else {
      // No stored session to restore — nothing to wait on
      setSplashProgress(100);
      splashTimerRef.current = setTimeout(() => setShowSplash(false), 350);
    }
  }, []);

  const handleLoginSuccess = (loginData: AppData) => {
    setData(loginData);
    saveStoredData(loginData);
    setAuthed(true);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    lastSyncTimeRef.current = Date.now();
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
        cdigest: captchaText ? captchaChallenge?.cdigest : undefined,
        isDemo: data?.metadata?.loginBy === 'demo',
      });
      const mergedData = mergeAppData(data, fresh);
      setData(mergedData);
      saveStoredData(mergedData);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      lastSyncTimeRef.current = Date.now();
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
    const onFocus = () => {
      const now = Date.now();
      // Auto-sync at most once every 3 minutes on window focus/network recovery
      if (authed && data && now - lastSyncTimeRef.current > 180000 && !refreshing) {
        lastSyncTimeRef.current = now;
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
        {showSplash && <SplashScreen key="splash" progress={splashProgress} />}
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
            challenge={captchaChallenge}
            onSubmit={(code: string) => handleSync(code)}
            onCancel={() => setCaptchaChallenge(null)}
            loading={refreshing}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;


