import React, { useState } from 'react';
import { motion } from 'motion/react';
import './CaptchaModal.css';

function CaptchaModal({ challenge, onSubmit, onCancel, loading }) {
  const [captcha, setCaptcha] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!captcha.trim()) return;
    onSubmit(captcha.trim());
  };

  return (
    <motion.div
      className="captcha-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="captcha-modal-card bcard"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
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
      </motion.div>
    </motion.div>
  );
}

export default CaptchaModal;
