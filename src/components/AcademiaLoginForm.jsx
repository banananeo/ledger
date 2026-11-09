import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { login } from '../api';
import { friendlyLoginError } from '../utils/friendlyErrors.js';
import './LoginForm.css';

function AcademiaLoginForm({ onSuccess, onCancel = undefined, overlay = false }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login({ username: username.trim(), password });
      onSuccess(data);
    } catch (err) {
      setError(friendlyLoginError(err, 'academia'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-wrapper${overlay ? ' login-wrapper--overlay' : ''}`}>
      <header className="login-topbar">
        <div className="login-topbar__brand"><span className="login-brand-mark" aria-hidden="true">L</span>Ledger</div>
        <span className="login-topbar__context">ACADEMIA</span>
      </header>
      <main className="login-card login-card--academia">
        <section className="login-editorial-hero">
          <div className="login-editorial-step"><span>01</span><span>ACADEMIA</span><span>SIGN IN</span></div>
          <h1>Good to<br />see you.</h1>
          <p>Sign in with Academia for your profile, timetable and calendar.</p>
        </section>
        <header className="login-header">
          <span className="login-step-label">Academia account</span>
        </header>
        {error && <div className="login-error-banner" role="alert">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="academia-netid">Academia Net ID</label>
            <input id="academia-netid" className="form-input" placeholder="Enter your Net ID" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="academia-password">Academia Password</label>
            <div className="form-input-wrapper">
              <input id="academia-password" className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={loading} />
              <button type="button" className="form-toggle-btn" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'HIDE' : 'SHOW'}</button>
            </div>
          </div>
          <div className={`login-actions${onCancel ? ' login-actions--has-cancel' : ''}`}>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in to Academia…' : 'Continue'}
            </button>
            {onCancel && <button className="btn-secondary" type="button" onClick={onCancel} disabled={loading}>Cancel</button>}
          </div>
        </form>
        <p className="login-helper">Use your SRM Academia credentials.</p>
        <div className="login-student-note"><span>Student Portal</span><small>OPTIONAL / LATER</small><p>After Academia, connect separately for attendance and marks. You can do this later.</p></div>
        <div className="login-footer-tip"><ShieldCheck className="login-footer-icon" size={16} aria-hidden="true" /><span>Your campus, at a glance.</span><span className="login-footer-brand">SRM / LEDGER</span></div>
      </main>
    </div>
  );
}

export default AcademiaLoginForm;
