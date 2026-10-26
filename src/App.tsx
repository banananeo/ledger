import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import Shell from './components/dashboard/Shell.jsx';
import AcademiaLoginForm from './components/AcademiaLoginForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import CaptchaModal from './components/CaptchaModal.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import {
  refreshSession,
  clearStoredSession,
  getAcademiaCookies,
  getStudentPortalCookies,
  saveAcademiaCookies,
  saveStudentPortalCookies,
  getStoredCredentials,
  getStoredData,
  saveStoredData,
  ApiError,
  CaptchaChallenge,
} from './api';
import type { AppData } from './types';
import './App.css';

function mergeAppData(prev: AppData | null, fresh: AppData): AppData {
  const isStudentPortal = fresh.metadata?.source === 'student-portal';
  return {
    ...(prev || {}),
    ...fresh,
    profile: fresh.profile || prev?.profile,
    attendance: isStudentPortal
      ? fresh.attendance || prev?.attendance
      : prev?.metadata?.source === 'student-portal'
        ? prev.attendance || fresh.attendance
        : fresh.attendance || prev?.attendance,
    marks: isStudentPortal
      ? fresh.marks || prev?.marks
      : prev?.metadata?.source === 'student-portal'
        ? prev.marks || fresh.marks
        : fresh.marks || prev?.marks,
    courses: fresh.courses || prev?.courses,
    schedule: fresh.schedule || prev?.schedule,
    calendar: fresh.calendar || prev?.calendar,
    session: {
      ...(prev?.session || {}),
      ...(isStudentPortal
        ? { studentPortalCookies: fresh.session?.cookies }
        : { academiaCookies: fresh.session?.cookies }),
      cookies: undefined,
    },
    metadata: {
      ...(prev?.metadata || {}),
      ...(fresh?.metadata || {}),
    },
  };
}

function normalizeSavedData(data: AppData | null): AppData | null {
  if (!data) return null;
  const isStudentPortal = data.metadata?.source === 'student-portal';
  return {
    ...data,
    session: {
      ...data.session,
      academiaCookies: data.session?.academiaCookies || (!isStudentPortal ? data.session?.cookies : undefined),
      studentPortalCookies: data.session?.studentPortalCookies || (isStudentPortal ? data.session?.cookies : undefined),
      cookies: undefined,
    },
  };
}

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const [loginStep, setLoginStep] = useState<'academia' | 'student-portal' | null>('academia');
  const [reconnecting, setReconnecting] = useState(false);
  const [academiaIssue, setAcademiaIssue] = useState(false);
  const [studentPortalIssue, setStudentPortalIssue] = useState(false);
  const [studentPortalError, setStudentPortalError] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  const lastSyncTimeRef = useRef<number>(Date.now());
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Safety timeout: never trap the user on splash even if animation stalls
  useEffect(() => {
    if (!showSplash) return;
    splashTimerRef.current = setTimeout(() => setShowSplash(false), 4000);
    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }
    };
  }, [showSplash]);

  // Attempt auto-restoring session from stored cookies or credentials on mount
  useEffect(() => {
    const cachedData = normalizeSavedData(getStoredData());
    const academiaCookies = getAcademiaCookies();
    const studentPortalCookies = getStudentPortalCookies();
    const savedCreds = getStoredCredentials();
    if (cachedData) setData(cachedData);

    const hasAcademiaAuth = Boolean(
      (academiaCookies && Object.keys(academiaCookies).length) || savedCreds || cachedData?.metadata?.loginBy === 'demo'
    );
    if (!hasAcademiaAuth) {
      setAuthed(false);
      setLoginStep('academia');
      setStudentPortalIssue(!studentPortalCookies);
      if (studentPortalCookies) {
        refreshSession({ source: 'student-portal', cookies: studentPortalCookies })
          .then((fresh) => setData((prev) => {
            const merged = mergeAppData(normalizeSavedData(prev), fresh);
            saveStoredData(merged);
            return merged;
          }))
          .catch(() => setStudentPortalIssue(true));
      }
      return;
    }

    setRefreshing(true);
    const providers: Array<{ source: 'academia' | 'student-portal'; promise: Promise<AppData> }> = [];
    if (academiaCookies || savedCreds || cachedData?.metadata?.loginBy === 'demo') {
      providers.push({ source: 'academia', promise: refreshSession({
        cookies: academiaCookies || undefined,
        username: savedCreds?.username,
        password: savedCreds?.password,
        isDemo: cachedData?.metadata?.loginBy === 'demo',
      }) });
    }
    if (studentPortalCookies) {
      providers.push({ source: 'student-portal', promise: refreshSession({ source: 'student-portal', cookies: studentPortalCookies }) });
    }

    Promise.all(providers.map(async ({ source, promise }) => ({ source, result: await Promise.allSettled([promise]) })))
      .then((results) => {
        let merged = cachedData;
        let academiaRestored = false;
        for (const { source, result: [outcome] } of results) {
          if (outcome.status === 'fulfilled') {
            merged = mergeAppData(merged, outcome.value);
            if (source === 'academia') {
              academiaRestored = true;
              setAcademiaIssue(false);
              setError('');
            } else {
              setStudentPortalIssue(false);
              setStudentPortalError('');
            }
          } else if (source === 'academia') {
            setAcademiaIssue(true);
            setError(outcome.reason?.message || 'Could not refresh Academia. Showing saved data.');
            if (outcome.reason instanceof ApiError && outcome.reason.captchaChallenge) {
              setCaptchaChallenge(outcome.reason.captchaChallenge);
            }
          } else {
            setStudentPortalIssue(true);
            setStudentPortalError('Student Portal session needs to be reconnected.');
          }
        }
        if (merged) {
          setData(merged);
          saveStoredData(merged);
          setAuthed(Boolean(studentPortalCookies) || Boolean(cachedData));
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        if (!studentPortalCookies && (academiaRestored || cachedData)) {
          setStudentPortalIssue(true);
          setAuthed(false);
          setLoginStep('student-portal');
        } else if (!merged) {
          setAuthed(false);
          setLoginStep('academia');
        } else {
          setLoginStep(null);
        }
        lastSyncTimeRef.current = Date.now();
      })
      .finally(() => setRefreshing(false));
  }, []);

  const handleAcademiaSuccess = async (loginData: AppData) => {
    const merged = mergeAppData(normalizeSavedData(data), loginData);
    setData(merged);
    if (loginData.session?.cookies) saveAcademiaCookies(loginData.session.cookies);
    saveStoredData(merged);
    setAcademiaIssue(false);
    setError('');
    const studentPortalCookies = getStudentPortalCookies();
    if (studentPortalCookies) {
      setRefreshing(true);
      try {
        const portalData = await refreshSession({ source: 'student-portal', cookies: studentPortalCookies });
        const complete = mergeAppData(merged, portalData);
        setData(complete);
        saveStoredData(complete);
        setStudentPortalIssue(false);
        setStudentPortalError('');
        setAuthed(true);
        setLoginStep(null);
      } catch {
        setStudentPortalIssue(true);
        setStudentPortalError('Student Portal session needs to be reconnected.');
        setAuthed(false);
        setLoginStep('student-portal');
      } finally {
        setRefreshing(false);
      }
      setReconnecting(false);
      return;
    }
    setAuthed(false);
    setReconnecting(false);
    setStudentPortalIssue(true);
    setLoginStep('student-portal');
  };

  const handleStudentPortalSuccess = (portalData: AppData) => {
    const merged = mergeAppData(normalizeSavedData(data), portalData);
    setData(merged);
    if (portalData.session?.cookies) saveStudentPortalCookies(portalData.session.cookies);
    saveStoredData(merged);
    setStudentPortalIssue(false);
    setStudentPortalError('');
    setAuthed(true);
    setLoginStep(null);
    setReconnecting(false);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    lastSyncTimeRef.current = Date.now();
  };

  const skipStudentPortal = () => {
    setAuthed(true);
    setLoginStep(null);
    setReconnecting(false);
    if (studentPortalIssue) setStudentPortalError('Connect Student Portal to load attendance and marks.');
  };

  const handleSync = useCallback(async (captchaText?: string) => {
    if (refreshing) return;
    const savedCreds = getStoredCredentials();
    const academiaCookies = data?.session?.academiaCookies || getAcademiaCookies();
    const studentPortalCookies = data?.session?.studentPortalCookies || getStudentPortalCookies();
    const requests: Array<{ provider: 'academia' | 'student-portal'; promise: Promise<AppData> }> = [];
    if (academiaCookies || savedCreds || data?.metadata?.loginBy === 'demo') {
      requests.push({ provider: 'academia', promise: refreshSession({
        cookies: academiaCookies || undefined,
        username: savedCreds?.username,
        password: savedCreds?.password,
        captcha: captchaText,
        cdigest: captchaText ? captchaChallenge?.cdigest : undefined,
        isDemo: data?.metadata?.loginBy === 'demo',
      }) });
    }
    if (studentPortalCookies) {
      requests.push({ provider: 'student-portal', promise: refreshSession({ source: 'student-portal', cookies: studentPortalCookies }) });
    }
    if (!requests.length) return;
    setRefreshing(true);
    setError('');
    let waitingForCaptcha = false;
    try {
      const results = await Promise.all(requests.map(async ({ provider, promise }) => ({
        provider,
        result: (await Promise.allSettled([promise]))[0],
      })));
      let mergedData = data;
      const academiaErrors: string[] = [];
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      lastSyncTimeRef.current = Date.now();
      for (const { provider, result } of results) {
        if (result.status === 'fulfilled') {
          mergedData = mergeAppData(mergedData, result.value);
          if (provider === 'academia') setAcademiaIssue(false);
          else {
            setStudentPortalIssue(false);
            setStudentPortalError('');
          }
        } else if (provider === 'academia') {
          setAcademiaIssue(true);
          if (result.reason instanceof ApiError && result.reason.captchaChallenge) {
            waitingForCaptcha = true;
            setCaptchaChallenge(result.reason.captchaChallenge);
          } else {
            academiaErrors.push(result.reason?.message || 'Academia refresh failed.');
          }
        } else {
          setStudentPortalIssue(true);
          setStudentPortalError('Student Portal session needs to be reconnected.');
        }
      }
      if (mergedData) {
        setData(mergedData);
        saveStoredData(mergedData);
      }
      setError(academiaErrors.join(' '));
    } finally {
      setRefreshing(false);
      if (!waitingForCaptcha) setCaptchaChallenge(null);
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
    setLoginStep('academia');
    setReconnecting(false);
    setData(null);
    setLastSynced(null);
    setError('');
    setStudentPortalError('');
    setAcademiaIssue(false);
    setStudentPortalIssue(false);
    setCaptchaChallenge(null);
  };

  const handleReconnectAcademia = () => {
    setReconnecting(true);
    setLoginStep('academia');
  };

  const handleConnectStudentPortal = () => {
    setReconnecting(true);
    setLoginStep('student-portal');
  };

  const skipOrCloseStudentPortal = () => {
    setAuthed(true);
    setLoginStep(null);
    setReconnecting(false);
  };

  const overlayLogin = authed && reconnecting;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="sync">
        {showSplash ? (
          <SplashScreen key="splash" onDone={handleSplashDone} />
        ) : !authed || !data ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 12, scale: 0.99, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {loginStep === 'student-portal' ? (
              <LoginForm onSuccess={handleStudentPortalSuccess} onSkip={skipOrCloseStudentPortal} />
            ) : (
              <AcademiaLoginForm onSuccess={handleAcademiaSuccess} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Shell
              data={data}
              lastSynced={lastSynced}
              onRefresh={() => handleSync()}
              refreshing={refreshing}
              onLogout={handleLogout}
              error={error}
              onReconnectAcademia={handleReconnectAcademia}
              onConnectStudentPortal={handleConnectStudentPortal}
              academiaIssue={academiaIssue}
              studentPortalIssue={studentPortalIssue}
              studentPortalError={studentPortalError}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {overlayLogin && loginStep === 'academia' && (
          <AcademiaLoginForm overlay onSuccess={handleAcademiaSuccess} onCancel={() => { setLoginStep(null); setReconnecting(false); }} />
        )}
        {overlayLogin && loginStep === 'student-portal' && (
          <LoginForm overlay onSuccess={handleStudentPortalSuccess} onSkip={skipOrCloseStudentPortal} />
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


