import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import {
  getStudentPortalCaptcha,
  loginStudentPortal,
  ApiError,
} from '../api';
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

function LoginForm({ onSuccess, onSkip, overlay = false }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState(null);

  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');

  /*
   * Load a CAPTCHA from the SRM Student Portal.
   */
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setError('');

    try {
      const challenge =
        await getStudentPortalCaptcha();

      setCaptchaChallenge({
        challengeId: challenge.challengeId,
        imageUrl: challenge.imageUrl,
      });

      setCaptcha('');
    } catch (err) {
      console.error(
        '[StudentPortal] CAPTCHA failed:',
        err
      );

      setError(
        err?.message ||
        'Failed to load the SRM Student Portal CAPTCHA.'
      );
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

    /*
     * First submission:
     * obtain a CAPTCHA session.
     */
    if (!captchaChallenge) {
      await loadCaptcha();
      return;
    }

    if (!captcha.trim()) {
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
          captcha.trim(),
          captchaChallenge.challengeId
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

      if (
        err instanceof ApiError
      ) {
        setError(
          err.message ||
          'Student Portal login failed.'
        );
      } else {
        setError(
          err?.message ||
          'Student Portal login failed.'
        );
      }

      /*
       * CAPTCHA sessions should not be reused after
       * a failed authentication attempt.
       */
      setCaptchaChallenge(null);
      setCaptcha('');
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
        className={`login-card${captchaChallenge ? ' login-card--captcha' : ' login-card--student-portal'}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <section className="login-editorial-hero">
          <div className="login-editorial-step"><span>{captchaChallenge ? '03' : '02'}</span><span>STUDENT PORTAL</span><span>{captchaChallenge ? 'VERIFY' : 'CONNECT'}</span></div>
          <h1>{captchaChallenge ? <>One last<br />step.</> : <>Bring it<br />together.</>}</h1>
          <p>{captchaChallenge ? 'Enter the security code shown below to finish connecting your SRM account.' : 'Add attendance and marks from SRM to your Ledger dashboard.'}</p>
        </section>
        <motion.div
          className="login-header"
          variants={itemVariants}
        >
          <span className="login-step-label">{captchaChallenge ? 'CAPTCHA VERIFICATION' : 'STUDENT PORTAL CREDENTIALS'}</span>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="login-error-banner"
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

          {captchaChallenge && (
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
                  ? 'Signing in to Student Portal…'
                  : captchaChallenge
                    ? 'Connect Student Portal'
                    : 'Continue'}
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
          <span><strong>Secure connection.</strong> Your credentials are used to establish an SRM session for Ledger.</span>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default LoginForm;
