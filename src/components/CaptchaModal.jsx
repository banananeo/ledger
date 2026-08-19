import React, { useState } from 'react';
import './CaptchaModal.css';

function CaptchaModal({ challenge, onSubmit, onCancel, loading }) {
  const [captcha, setCaptcha] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!captcha.trim()) return;
    onSubmit(captcha.trim());
  };

  return (
    <div className="captcha-modal-overlay">
      <div className="captcha-modal-card bcard">
        <div className="captcha-modal-header">
          <h3 className="captcha-modal-title">Verification Required</h3>
          <p className="captcha-modal-desc">
            Academia security requested a quick image verification to complete your sync.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="captcha-modal-form">
          <div className="captcha-modal-img-box">
            <img src={challenge.image} alt="Academia CAPTCHA" className="captcha-modal-img" />
          </div>

          <input
            type="text"
            className="captcha-modal-input"
            placeholder="Type characters from image"
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
            autoFocus
            disabled={loading}
            required
          />

          <div className="captcha-modal-actions">
            <button
              type="button"
              className="bbtn bbtn--outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bbtn"
              disabled={loading || !captcha.trim()}
            >
              {loading ? 'Verifying…' : 'Verify & Sync'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CaptchaModal;
