import React, { useState } from 'react';
import { login, ApiError } from '../api';
import './LoginForm.css';

function AcademiaLoginForm({ onSuccess, onCancel = undefined, overlay = false }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err instanceof ApiError ? err.message : err?.message || 'Academia login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-wrapper${overlay ? ' login-wrapper--overlay' : ''}`}>
      <div className="login-card">
        <header className="login-header">
          <div className="login-header__brand">Ledger<span className="login-header__brand-dot">.</span></div>
          <p className="login-header__subtitle">Sign in to Academia to load your profile, timetable, and calendar.</p>
        </header>
        {error && <div className="login-error-banner" role="alert">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="academia-netid">Academia Net ID</label>
            <input id="academia-netid" className="form-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="academia-password">Academia Password</label>
            <input id="academia-password" className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={loading} />
          </div>
          <div className="login-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in to Academia…' : 'Continue'}
            </button>
            {onCancel && <button className="btn-secondary" type="button" onClick={onCancel} disabled={loading}>Cancel</button>}
          </div>
        </form>
        <div className="login-footer-tip">Academia provides your timetable, calendar, and profile. You can connect the Student Portal next for attendance and marks.</div>
      </div>
    </div>
  );
}

export default AcademiaLoginForm;
