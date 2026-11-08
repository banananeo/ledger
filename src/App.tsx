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
  getStudentPortalSkipped,
  saveStudentPortalSkipped,
  ApiError,
  CaptchaChallenge,
} from './api';
import type { AppData } from './types';
import { hasAcademiaAuthSignal, resolveBootView, shouldOfferStudentPortal } from './utils/session.ts';
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
  const [splashDone, setSplashDone] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(true);

  const lastSyncTimeRef = useRef<number>(Date.now());

  const handleSplashDone = useCallback(() => setSplashDone(true), []);
  const handleSplashSkip = useCallback(() => {
    setSplashDone(true);
    setRestoring(false);
  }, []);

  // The splash doubles as the restore screen, but it must never trap the user.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
      setRestoring(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Boot: paint the cached dashboard immediately, then revalidate in the background.
  useEffect(() => {
    const cachedData = normalizeSavedData(getStoredData());
    const academiaCookies = getAcademiaCookies() || cachedData?.session?.academiaCookies || null;
    const studentPortalCookies = getStudentPortalCookies() || cachedData?.session?.studentPortalCookies || null;
    const savedCreds = getStoredCredentials();

    if (cachedData) {
      setData(cachedData);
      setAuthed(true);
    }

    const noteMissingStudentPortal = () => {
      setStudentPortalIssue(true);
      setStudentPortalError('Connect Student Portal to load attendance and marks.');
    };

    const providers: Array<{ source: 'academia' | 'student-portal'; promise: Promise<AppData> }> = [];
    if (hasAcademiaAuthSignal({ academiaCookies, savedCreds, cachedData })) {
      providers.push({
        source: 'academia',
        promise: refreshSession({
          cookies: academiaCookies || undefined,
          username: savedCreds?.username,
          password: savedCreds?.password,
          isDemo: cachedData?.metadata?.loginBy === 'demo',
        }),
      });
    }
    if (studentPortalCookies) {
      providers.push({
        source: 'student-portal',
        promise: refreshSession({ source: 'student-portal', cookies: studentPortalCookies }),
      });
    }

    if (providers.length === 0) {
      if (cachedData) {
        const portalOnly = cachedData.metadata?.source === 'student-portal';
        if (!portalOnly) {
          setAcademiaIssue(true);
          setError('Saved session could not be verified. Tap Reconnect Academia to sign in again.');
        }
        setAuthed(true);
      } else {
        setAuthed(false);
        setLoginStep('academia');
      }
      if (!studentPortalCookies) noteMissingStudentPortal();
      setRestoring(false);
      return;
    }

    setRefreshing(true);
    Promise.all(
      providers.map(async ({ source, promise }) => ({ source, result: await Promise.allSettled([promise]) })),
    )
      .then((results) => {
        let merged = cachedData;

        for (const { source, result: [outcome] } of results) {
          if (outcome.status === 'fulfilled') {
            merged = mergeAppData(merged, outcome.value);
            if (source === 'academia') {
              setAcademiaIssue(false);
              setError('');
            } else {
              setStudentPortalIssue(false);
              setStudentPortalError('');
            }
          } else if (source === 'academia') {
            // Background restores never open the CAPTCHA modal; the banner's
            // Reconnect button lets the user start that flow explicitly.
            setAcademiaIssue(true);
            setError(outcome.reason?.message || 'Could not refresh Academia. Showing saved data.');
          } else {
            setStudentPortalIssue(true);
            setStudentPortalError('Student Portal session needs to be reconnected.');
          }
        }

        if (merged) {
          setData(merged);
          saveStoredData(merged);
          setAuthed(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          if (!studentPortalCookies) noteMissingStudentPortal();
          setLoginStep(null);
        } else {
          setAuthed(false);
          setLoginStep('academia');
        }

        lastSyncTimeRef.current = Date.now();
      })
      .finally(() => {
        setRefreshing(false);
        setRestoring(false);
      });
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
      } catch {
        setStudentPortalIssue(true);
        setStudentPortalError('Student Portal session needs to be reconnected.');
      } finally {
        setRefreshing(false);
      }
      setAuthed(true);
      setLoginStep(null);
      setReconnecting(false);
      return;
    }

    setReconnecting(false);

    if (shouldOfferStudentPortal({ hasPortalCookies: false, skipped: getStudentPortalSkipped() })) {
      // One-time onboarding: show the optional Student Portal form over the
      // dashboard instead of blocking the app with it on every launch.
      setAuthed(true);
      setStudentPortalIssue(true);
      setStudentPortalError('Connect Student Portal to load attendance and marks.');
      setLoginStep('student-portal');
      setReconnecting(true);
      return;
    }

    setAuthed(true);
    setStudentPortalIssue(true);
    setStudentPortalError('Connect Student Portal to load attendance and marks.');
    setLoginStep(null);
  };

  const handleStudentPortalSuccess = (portalData: AppData) => {
    const merged = mergeAppData(normalizeSavedData(data), portalData);
    setData(merged);
    if (portalData.session?.cookies) saveStudentPortalCookies(portalData.session.cookies);
    saveStoredData(merged);
    saveStudentPortalSkipped(false);
    setStudentPortalIssue(false);
    setStudentPortalError('');
    setAuthed(true);
    setLoginStep(null);
    setReconnecting(false);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    lastSyncTimeRef.current = Date.now();
  };

  const handleSync = useCallback(
    async (captchaText?: string, options?: { interactive?: boolean }) => {
      const interactive = options?.interactive !== false;
      if (refreshing) return;
      const savedCreds = getStoredCredentials();
      const academiaCookies = data?.session?.academiaCookies || getAcademiaCookies();
      const studentPortalCookies = data?.session?.studentPortalCookies || getStudentPortalCookies();
      const requests: Array<{ provider: 'academia' | 'student-portal'; promise: Promise<AppData> }> = [];
      if (academiaCookies || savedCreds || data?.metadata?.loginBy === 'demo') {
        requests.push({
          provider: 'academia',
          promise: refreshSession({
            cookies: academiaCookies || undefined,
            username: savedCreds?.username,
            password: savedCreds?.password,
            captcha: captchaText,
            cdigest: captchaText ? captchaChallenge?.cdigest : undefined,
            isDemo: data?.metadata?.loginBy === 'demo',
          }),
        });
      }
      if (studentPortalCookies) {
        requests.push({
          provider: 'student-portal',
          promise: refreshSession({ source: 'student-portal', cookies: studentPortalCookies }),
        });
      }
      if (!requests.length) return;
      setRefreshing(true);
      setError('');
      let waitingForCaptcha = false;
      try {
        const results = await Promise.all(
          requests.map(async ({ provider, promise }) => ({
            provider,
            result: (await Promise.allSettled([promise]))[0],
          })),
        );
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
            if (result.reason instanceof ApiError && result.reason.captchaChallenge && interactive) {
              waitingForCaptcha = true;
              setCaptchaChallenge(result.reason.captchaChallenge);
            } else if (result.reason instanceof ApiError && result.reason.captchaChallenge) {
              academiaErrors.push(
                'Academia needs a quick re-verification. Use Reconnect Academia to sign in again.',
              );
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
    },
    [data, refreshing, captchaChallenge],
  );

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      // Auto-sync at most once every 3 minutes on window focus/network recovery.
      if (authed && data && now - lastSyncTimeRef.current > 180000 && !refreshing) {
        lastSyncTimeRef.current = now;
        handleSync(undefined, { interactive: false });
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
    saveStudentPortalSkipped(true);
    setAuthed(true);
    setLoginStep(null);
    setReconnecting(false);
  };

  const bootView = resolveBootView({ hasData: Boolean(data), restoring, splashDone });
  const overlayLogin = Boolean(data) && reconnecting;
  const splashStatus = !data && restoring ? 'Connecting to Academia…' : 'Preparing your dashboard';

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="sync">
        {bootView === 'splash' ? (
          <SplashScreen
            key="splash"
            onDone={handleSplashDone}
            onSkip={handleSplashSkip}
            status={splashStatus}
          />
        ) : bootView === 'login' ? (
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
