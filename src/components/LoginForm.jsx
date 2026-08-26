import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { login, ApiError } from '../api';
import { useTheme } from '../context/ThemeContext.tsx';
import { SunIcon, MoonIcon } from './dashboard/Icons.jsx';
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
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your SRM Net ID / Reg No and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await login({
        username: username.trim(),
        password,
        captcha: captchaChallenge ? captcha.trim() : undefined,
        cdigest: captchaChallenge?.cdigest,
      });
      onSuccess(data);
    } catch (err) {
      if (err instanceof ApiError && err.captchaChallenge) {
        setCaptchaChallenge(err.captchaChallenge);
        setCaptcha('');
        setError(err.message || 'Please complete the CAPTCHA image verification.');
      } else {
        setError(err?.message || 'Failed to authenticate with SRM Academia. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await login({ isDemo: true });
      onSuccess(data);
    } catch (err) {
      setError(err?.message || 'Failed to load demo student profile.');
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
        <motion.div className="login-header" variants={itemVariants}>
          <div className="login-header__top-row">
            <div className="login-header__brand">
              Ledger<span className="login-header__brand-dot">.</span>
            </div>
            <button
              type="button"
              className="bbtn bbtn--outline bbtn--icon login-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <SunIcon width={17} height={17} /> : <MoonIcon width={17} height={17} />}
            </button>
          </div>
          <p className="login-header__subtitle">
            Sign in with your official SRM Academia credentials to access your attendance, timetable, and records.
          </p>
        </motion.div>


        <AnimatePresence>
          {error && (
            <motion.div
              className="login-error-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form className="login-form" onSubmit={handleSubmit}>
          <motion.div className="form-group" variants={itemVariants}>
            <label className="form-label" htmlFor="netid-input">
              Net ID
            </label>
            <input
              id="netid-input"
              type="text"
              className="form-input"
              placeholder="e.g. ab1234@srmist.edu.in"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </motion.div>

          <motion.div className="form-group" variants={itemVariants}>
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div className="form-input-wrapper">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your Academia Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="form-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </motion.div>

          {captchaChallenge && (
            <motion.div
              className="captcha-box"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <label className="form-label" htmlFor="captcha-input">
                Security Code (Captcha)
              </label>
              <div className="captcha-image-container">
                <img
                  src={captchaChallenge.image}
                  alt="Academia Captcha"
                  className="captcha-image"
                />
              </div>
              <input
                id="captcha-input"
                type="text"
                className="form-input"
                placeholder="Type characters from image above"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </motion.div>
          )}

          <motion.div className="login-actions" variants={itemVariants}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Authenticating with Academia…' : 'Sign in to Ledger'}
            </button>

            <div className="login-divider">or explore</div>

            <button
              type="button"
              className="btn-demo"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              ✨ Try Instant Demo Mode
            </button>
          </motion.div>
        </form>

        <motion.div className="login-footer-tip" variants={itemVariants}>
          🔒 <strong>Direct Integration</strong>: Your credentials are encrypted and sent directly to the local backend gateway to establish an active session with SRM's ZohoCreator portal. No passwords are ever stored.
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LoginForm;
