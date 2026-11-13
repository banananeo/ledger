import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import {
  getStudentPortalCaptcha,
  getStoredStudentPortalCredentials,
  loginStudentPortal,
} from '../api';
import { friendlyLoginError } from '../utils/friendlyErrors.js';
import './LoginForm.css';

const containerVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const MANUAL_CAPTCHA_CODES = new Set([
  'CAPTCHA_REQUIRED',
  'CAPTCHA_FETCH_FAILED',
  'CAPTCHA_UNAVAILABLE',
  'OCR_FAILED',
  'OCR_UNAVAILABLE',
  'CAPTCHA_SOLVER_FAILED',
  'AUTO_CAPTCHA_FAILED',
  'INVALID_CAPTCHA',
  'WRONG_CAPTCHA',
]);

function needsManualCaptcha(err) {
  if (MANUAL_CAPTCHA_CODES.has(err?.code?.toUpperCase?.() || '')) return true;
  return /captcha|ocr/i.test(typeof err?.message === 'string' ? err.message : '');
}
function LoginForm({ onSuccess, onSkip, overlay = false }) {
  const [username, setUsername] = useState(() => getStoredStudentPortalCredentials()?.username || '');
  const [password, setPassword] = useState(() => getStoredStudentPortalCredentials()?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState(null);
  const [manualCaptcha, setManualCaptcha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');

  /*
   * Load a CAPTCHA from the SRM Student Portal.
   */
  const loadCaptcha = async ({ clearError = true } = {}) => {
    setCaptchaLoading(true);
    if (clearError) setError('');

    try {
      const challenge =
        await getStudentPortalCaptcha();

      setCaptchaChallenge({
        challengeId: challenge.challengeId,
        imageUrl: challenge.imageUrl,
      });

      setCaptcha('');
      return true;
    } catch (err) {
      console.error(
        '[StudentPortal] CAPTCHA failed:',
        err
      );

      if (clearError) setError(friendlyLoginError(err, 'student-portal', 'captcha'));
      setCaptchaChallenge(null);
      return false;
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError(
        'Please enter your SRM Net ID.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter your SRM password.'
      );
      return;
    }

    if (manualCaptcha && !captchaChallenge) {
      await loadCaptcha();
      return;
    }

    if (manualCaptcha && !captcha.trim()) {
      setError(
        'Please enter the CAPTCHA shown above.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data =
        await loginStudentPortal(
          username.trim(),
          password,
          manualCaptcha ? captcha.trim() : undefined,
          manualCaptcha ? captchaChallenge.challengeId : undefined
        );

      console.log(
        '[StudentPortal] Attendance:',
        data.attendance
      );

      /*
       * Pass the Student Portal data through Ledger's normal
       * dashboard/session storage flow.
       */
      onSuccess(data);
    } catch (err) {
      console.error(
        '[StudentPortal] Login failed:',
        err
      );

      const message = friendlyLoginError(err, 'student-portal');
      if (!manualCaptcha && needsManualCaptcha(err)) {
        setManualCaptcha(true);
        const loaded = await loadCaptcha({ clearError: false });
        setError(loaded
          ? `${message} Enter the CAPTCHA manually to continue.`
          : `${message} A CAPTCHA could not be loaded. Please try again.`);
      } else if (manualCaptcha) {
        // Manual CAPTCHA sessions are single-use, including after a rejected
        // answer, so load a fresh challenge before the next attempt.
        const loaded = await loadCaptcha({ clearError: false });
        setError(loaded
          ? `${message} A fresh CAPTCHA is ready; please try again.`
          : `${message} A new CAPTCHA could not be loaded. Please try again.`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-wrapper${overlay ? ' login-wrapper--overlay' : ''}`}>
      <header className="login-topbar">
        <div className="login-topbar__brand"><span className="login-brand-mark" aria-hidden="true">L</span>Ledger</div>
        <span className="login-topbar__context">STUDENT PORTAL</span>
      </header>
      <motion.main
        className={`login-card${manualCaptcha ? ' login-card--captcha' : ' login-card--student-portal'}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <section className="login-editorial-hero">
          <div className="login-editorial-step"><span>{manualCaptcha ? '03' : '02'}</span><span>STUDENT PORTAL</span><span>{manualCaptcha ? 'VERIFY' : 'CONNECT'}</span></div>
          <h1>{manualCaptcha ? <>One last<br />step.</> : <>Bring it<br />together.</>}</h1>
          <p>{manualCaptcha ? 'Enter the security code shown below to finish connecting your SRM account.' : 'Add attendance and marks from SRM. Ledger can reconnect automatically when a session expires.'}</p>
        </section>
        <motion.div
          className="login-header"
          variants={itemVariants}
        >
          <span className="login-step-label">{manualCaptcha ? 'CAPTCHA VERIFICATION' : 'STUDENT PORTAL CREDENTIALS'}</span>
        </motion.div>

        <AnimatePresence>

          {error && (
            <motion.div
              className="login-error-banner"
              role="alert"
              aria-live="assertive"
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -6,
              }}
              transition={{
                duration: 0.22,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <motion.div
            className="form-group"
            variants={itemVariants}
          >
            <label
              className="form-label"
              htmlFor="netid-input"
            >
              Net ID
            </label>

            <input
              id="netid-input"
              type="text"
              className="form-input"
              placeholder="Enter your SRM Net ID"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              disabled={
                loading ||
                captchaLoading
              }
              autoComplete="username"
              required
            />
          </motion.div>

          <motion.div
            className="form-group"
            variants={itemVariants}
          >
            <label
              className="form-label"
              htmlFor="password-input"
            >
              Password
            </label>

            <div className="form-input-wrapper">
              <input
                id="password-input"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                className="form-input"
                placeholder="Enter your SRM Password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                disabled={
                  loading ||
                  captchaLoading
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="form-toggle-btn"
                onClick={() =>
                  setShowPassword(
                    (visible) => !visible
                  )
                }
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword
                  ? 'HIDE'
                  : 'SHOW'}
              </button>
            </div>
          </motion.div>

          {manualCaptcha && captchaChallenge && (
            <motion.div
              className="captcha-box"
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <label
                className="form-label"
                htmlFor="captcha-input"
              >
                Security Code (CAPTCHA)
              </label>

              <div className="captcha-image-container">
                <img
                  src={captchaChallenge.imageUrl}
                  alt="SRM CAPTCHA"
                  className="captcha-image"
                />
              </div>

              <input
                id="captcha-input"
                type="text"
                className="form-input"
                placeholder="Type characters from image above"
                value={captcha}
                onChange={(e) =>
                  setCaptcha(
                    e.target.value
                  )
                }
                disabled={loading}
                required
                autoFocus
              />
            </motion.div>
          )}

          <motion.div
            className="login-actions"
            variants={itemVariants}
          >
            <button
              type="submit"
              className="btn-primary"
              disabled={
                loading ||
                captchaLoading
              }
            >
              {captchaLoading
                ? 'Loading CAPTCHA…'
                : loading
                  ? manualCaptcha ? 'Checking CAPTCHA…' : 'Connecting to Student Portal…'
                  : manualCaptcha && !captchaChallenge
                    ? 'Load CAPTCHA'
                    : manualCaptcha
                      ? 'Connect Student Portal'
                      : 'Connect automatically'}
            </button>
            <button
              type="button"
              className="login-mode-toggle"
              onClick={() => {
                if (manualCaptcha) {
                  setManualCaptcha(false);
                  setCaptchaChallenge(null);
                  setCaptcha('');
                  setError('');
                } else {
                  setManualCaptcha(true);
                  void loadCaptcha();
                }
              }}
              disabled={loading || captchaLoading}
              aria-pressed={manualCaptcha}
            >
              {manualCaptcha ? 'Try automatic login' : 'Enter CAPTCHA manually'}
            </button>
            {onSkip && (
              <button type="button" className="btn-secondary" onClick={onSkip} disabled={loading || captchaLoading}>
                Skip for now
              </button>
            )}
          </motion.div>
        </form>

        <motion.div
          className="login-footer-tip"
          variants={itemVariants}
        >
          <ShieldCheck className="login-footer-icon" size={16} aria-hidden="true" />
          <span><strong>Saved in this browser.</strong> Student Portal credentials are used for automatic reconnection when the SRM session expires.</span>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default LoginForm;
