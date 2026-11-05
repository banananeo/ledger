import React, { useEffect, useRef } from 'react';
import './AfterHoursScene.css';

const stars = Array.from({ length: 34 }, (_, index) => index);

export default function AfterHoursScene({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="after-hours" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="after-hours__dialog" role="dialog" aria-modal="true" aria-labelledby="after-hours-title">
        <button ref={closeRef} className="after-hours__close" type="button" onClick={onClose} aria-label="Close after-hours scene">
          <span aria-hidden="true">×</span>
        </button>

        <div className="after-hours__sky" aria-hidden="true">
          <div className="after-hours__stars">
            {stars.map((star) => <i key={star} className={`after-hours__star after-hours__star--${star % 5}`} />)}
          </div>
          <div className="after-hours__moon" />

          <div className="after-hours__campus">
            <div className="after-hours__building after-hours__building--left"><span /><span /><span /><span /><span /><span /></div>
            <div className="after-hours__building after-hours__building--main"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
            <div className="after-hours__building after-hours__building--right"><span /><span /><span /><span /><span /><span /></div>
            <div className="after-hours__path" />
          </div>
        </div>

        <div className="after-hours__copy">
          <p className="after-hours__eyebrow">You found the quiet side of campus</p>
          <h2 id="after-hours-title">After hours<span>.</span></h2>
          <p>The last class is over. The campus is still yours.</p>
          <div className="after-hours__status"><span /> LEDGER IS STILL AWAKE</div>
        </div>
      </section>
    </div>
  );
}
