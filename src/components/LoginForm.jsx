import React, { useState } from 'react';
import { login, ApiError } from '../api';
import './LoginForm.css';

function LoginForm({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <div className="login-card">
        <div className="login-header">
          <div className="login-header__brand">
            Ledger<span className="login-header__brand-dot">.</span>
          </div>
          <p className="login-header__subtitle">
            Sign in with your official SRM Academia credentials to access your attendance, timetable, and records.
          </p>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="netid-input">
              Net ID / Reg No / Email
            </label>
            <input
              id="netid-input"
              type="text"
              className="form-input"
              placeholder="e.g. RA2311003010482 or ab1234@srmist.edu.in"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Academia Password
            </label>
            <div className="form-input-wrapper">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your Academia password"
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
          </div>

          {captchaChallenge && (
            <div className="captcha-box">
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
            </div>
          )}

          <div className="login-actions">
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
          </div>
        </form>

        <div className="login-footer-tip">
          🔒 <strong>Direct Integration</strong>: Your credentials are encrypted and sent directly to the local backend gateway to establish an active session with SRM's ZohoCreator portal. No passwords are ever stored.
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
