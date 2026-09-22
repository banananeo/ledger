import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

function LoginForm({ onSuccess }) {
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
       * For now we pass the attendance response
       * upward. The next step will merge this with
       * Ledger's existing AppData.
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
    <div className="login-wrapper">
      <motion.div
        className="login-card"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="login-header"
          variants={itemVariants}
        >
          <div className="login-header__top-row">
            <div className="login-header__brand">
              Ledger
              <span className="login-header__brand-dot">
                .
              </span>
            </div>
          </div>

          <p className="login-header__subtitle">
            Sign in with your official SRM
            credentials to access Ledger.
          </p>
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
                    !showPassword
                  )
                }
                tabIndex={-1}
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
                  src={
                    `/api/student-portal/captcha-image/${captchaChallenge.challengeId}`
                  }
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
                  ? 'Signing in to SRM…'
                  : captchaChallenge
                    ? 'Sign in to Ledger'
                    : 'Continue'}
            </button>
          </motion.div>
        </form>

        <motion.div
          className="login-footer-tip"
          variants={itemVariants}
        >
          🔒 <strong>Direct Integration</strong>:
          Your credentials are sent securely to
          the local backend to establish your SRM
          session. No passwords are stored.
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LoginForm;