import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadIcon, ImageIcon, CheckIcon, SunIcon, MoonIcon } from './Icons.jsx';
import { generateTimetableCanvas, downloadTimetableImage } from '../../utils/timetableImageGenerator';
import './TimetableExportModal.css';

function TimetableExportModal({ isOpen, onClose, schedule = [], profile }) {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    generateTimetableCanvas({
      schedule,
      profile,
      theme: selectedTheme,
    })
      .then((canvas) => {
        if (!isMounted) return;
        canvasRef.current = canvas;
        const url = canvas.toDataURL('image/png');
        setPreviewUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate timetable preview:', err);
      })
      .finally(() => {
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedTheme, schedule, profile]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadTimetableImage({
        schedule,
        profile,
        theme: selectedTheme,
      });
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      });
    } catch (err) {
      console.error('Copy to clipboard error:', err);
    }
  };


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="timetable-modal-overlay" onClick={onClose}>
        <motion.div
          className="bcard timetable-modal"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="timetable-modal__head">
            <div className="timetable-modal__title-group">
              <div className="timetable-modal__icon-badge">
                <ImageIcon width={20} height={20} />
              </div>
              <div>
                <h3 className="timetable-modal__title">Export Weekly Timetable</h3>
                <p className="timetable-modal__subtitle">
                  High-res weekly grid with room details & Ledger branding
                </p>
              </div>
            </div>

            <button
              className="bbtn bbtn--outline bbtn--icon timetable-modal__close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Theme Switcher Bar */}
          <div className="timetable-modal__toolbar">
            <div className="timetable-modal__theme-toggles">
              <button
                className={`bbtn ${selectedTheme === 'light' ? 'bbtn--good' : 'bbtn--outline'} timetable-modal__theme-btn`}
                onClick={() => setSelectedTheme('light')}
              >
                <SunIcon width={16} height={16} />
                <span>Classic Light (Print-Ready)</span>
              </button>

              <button
                className={`bbtn ${selectedTheme === 'dark' ? 'bbtn--good' : 'bbtn--outline'} timetable-modal__theme-btn`}
                onClick={() => setSelectedTheme('dark')}
              >
                <MoonIcon width={16} height={16} />
                <span>Dark Slate Theme</span>
              </button>
            </div>

            <div className="timetable-modal__badge num">
              {schedule.length} Day Orders • All Time Slots
            </div>
          </div>

          {/* Image Preview Container */}
          <div className="timetable-modal__preview-wrapper">
            {isGenerating ? (
              <div className="timetable-modal__loading">
                <span className="sidebar__spin">⏳</span>
                <p>Generating high-resolution poster...</p>
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Weekly Timetable Preview"
                className="timetable-modal__preview-img"
              />
            ) : (
              <div className="timetable-modal__loading">
                <p>No preview available</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="timetable-modal__foot">
            <button
              className="bbtn bbtn--outline timetable-modal__action-btn"
              onClick={handleCopy}
              disabled={isGenerating || !previewUrl}
            >
              {copied ? <CheckIcon width={16} height={16} /> : <ImageIcon width={16} height={16} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Image'}</span>
            </button>

            <button
              className="bbtn timetable-modal__download-btn"
              onClick={handleDownload}
              disabled={isGenerating || !previewUrl}
            >
              <DownloadIcon width={18} height={18} />
              <span>Download PNG Image (High-Res)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TimetableExportModal;
