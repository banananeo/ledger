import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { computeWrappedAnalytics } from '../../utils/wrappedAnalytics';
import {
  downloadWrappedImage,
  shareWrappedImage,
} from '../../utils/wrappedImageGenerator';
import './SemesterWrappedModal.css';

const SLIDE_DURATION_MS = 6000;
const TOTAL_SLIDES = 5;
const TICK_COUNT = 50;
const IDENTITY_BARS = Array.from({ length: 12 }, (_, idx) => idx);

const EASE_TEXT_BEZIER = [0, 0, 0.58, 1];
const EASE_HOLD_OUT = [[0.5, 0, 0.5, 1], 'easeOut', 'linear'];
const EASE_TICK_OPACITY = ['linear', 'easeOut', 'linear'];
const EASE_ID_BAR_SCALE = ['easeInOut', 'easeInOut', 'easeInOut', 'easeInOut', 'linear'];

/**
 * Helper to build Figma's 6-second timeline transition for [0, tStart, tEnd, 1] keyframes.
 */
function timelineFadeY(tStart, tEnd) {
  return {
    duration: 6,
    times: [0, tStart, tEnd, 1],
    ease: EASE_HOLD_OUT,
  };
}

function timelineOpacity(tStart, tEnd) {
  return {
    opacity: {
      duration: 6,
      times: [0, tStart, tEnd, 1],
      ease: EASE_HOLD_OUT,
    },
  };
}

/**
 * Reusable component for Figma `textAnimations` (WORD, LINE, CHARACTER_NO_WHITESPACE).
 * Uses `derivedTimingInfo`: each group starts at `(startMs + idx * staggerStepMs) / 1000`
 * and plays for `groupDurationMs / 1000` with `EASE_TEXT_BEZIER`.
 */
function StaggeredTextGroup({
  items,
  mode = 'word', // 'word' | 'line' | 'char'
  startMs,
  groupDurationMs,
  staggerStepMs,
  distancePx = 14,
  className = '',
  itemClassName = '',
  as: Tag = 'div',
  ...rest
}) {
  const durationSec = groupDurationMs / 1000;

  return (
    <Tag className={className} {...rest}>
      {items.map((token, idx) => {
        const delaySec = (startMs + idx * staggerStepMs) / 1000;
        return (
          <motion.span
            key={`${idx}-${token}`}
            className={
              mode === 'line'
                ? `sw-anim-line ${itemClassName}`
                : mode === 'word'
                  ? `sw-anim-word ${itemClassName}`
                  : `sw-anim-char ${itemClassName}`
            }
            initial={{ opacity: 0, y: distancePx }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durationSec,
              delay: delaySec,
              ease: EASE_TEXT_BEZIER,
            }}
          >
            {token}
            {mode === 'word' && idx < items.length - 1 ? '\u00A0' : ''}
          </motion.span>
        );
      })}
    </Tag>
  );
}

/**
 * Splits a title like "The Tactical Ghost." into 2 balanced lines for Figma's LINE animation.
 */
function splitIntoTwoLines(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];
  if (words.length === 2) return [words[0], words[1]];
  const splitIdx = Math.ceil(words.length / 2);
  return [words.slice(0, splitIdx).join(' '), words.slice(splitIdx).join(' ')];
}

export default function SemesterWrappedModal({ data, isOpen, onClose }) {
  const stats = useMemo(() => computeWrappedAnalytics(data), [data]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cardTheme, setCardTheme] = useState('cobalt');
  const [exportState, setExportState] = useState('idle');
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSlideIndex(0);
      setReplayKey((k) => k + 1);
      setProgress(0);
      setPaused(false);
      setExportState('idle');
      setExportMessage('');
    }
  }, [isOpen]);

  const goToSlide = useCallback((nextIdx) => {
    if (nextIdx < 0 || nextIdx >= TOTAL_SLIDES) return;
    setSlideIndex(nextIdx);
    setReplayKey((k) => k + 1);
    setProgress(0);
  }, []);

  const handleNext = useCallback(() => {
    if (slideIndex < TOTAL_SLIDES - 1) {
      setSlideIndex((prev) => prev + 1);
      setReplayKey((k) => k + 1);
      setProgress(0);
    }
  }, [slideIndex]);

  const handlePrev = useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
      setReplayKey((k) => k + 1);
      setProgress(0);
    } else {
      setReplayKey((k) => k + 1);
      setProgress(0);
    }
  }, [slideIndex]);

  // 6000ms story cohort timer matching Figma's 6s timelineDurationMs
  useEffect(() => {
    if (!isOpen || paused || slideIndex === TOTAL_SLIDES - 1) return undefined;

    const stepMs = 40;
    const increment = (stepMs / SLIDE_DURATION_MS) * 100;

    const timer = window.setInterval(() => {
      setProgress((prev) => (prev + increment >= 100 ? 100 : prev + increment));
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [isOpen, paused, slideIndex, replayKey]);

  useEffect(() => {
    if (progress >= 100 && slideIndex < TOTAL_SLIDES - 1) {
      handleNext();
    }
  }, [progress, slideIndex, handleNext]);

  // Keyboard navigation & scroll lock
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        handlePrev();
      } else if (event.key === ' ') {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  const handleBodyClick = (event) => {
    if (event.target.closest('button')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    if (clickX < rect.width * 0.3) {
      handlePrev();
    } else if (clickX > rect.width * 0.3 && slideIndex < TOTAL_SLIDES - 1) {
      handleNext();
    }
  };

  const handleDownload = async () => {
    if (exportState === 'downloading' || exportState === 'sharing') return;
    setExportState('downloading');
    setExportMessage('');
    try {
      await downloadWrappedImage(stats, cardTheme);
      setExportState('done');
      setExportMessage('Saved Story PNG!');
      setTimeout(() => setExportState('idle'), 2800);
    } catch (err) {
      setExportState('idle');
      setExportMessage(err?.message || 'Could not export image.');
    }
  };

  const handleShare = async () => {
    if (exportState === 'downloading' || exportState === 'sharing') return;
    setExportState('sharing');
    setExportMessage('');
    try {
      const outcome = await shareWrappedImage(stats, cardTheme);
      setExportState('done');
      setExportMessage(
        outcome === 'shared' ? 'Shared Semester Wrapped!' : 'Downloaded Story PNG!'
      );
      setTimeout(() => setExportState('idle'), 2800);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setExportMessage(err?.message || 'Share cancelled or unavailable.');
      }
      setExportState('idle');
    }
  };

  // 50-bar barcode attendance ticks for Slide 1 (75:9 .. 75:58)
  const filledTicksCount = useMemo(() => {
    return Math.max(0, Math.min(TICK_COUNT, Math.round((stats.overallPercentage / 100) * TICK_COUNT)));
  }, [stats.overallPercentage]);

  // Top 4 bunked courses for Slide 2 leaderboard (75:85 .. 75:104)
  const topBunkList = useMemo(() => {
    return [...stats.courses]
      .sort((a, b) => (b.absent !== a.absent ? b.absent - a.absent : a.percentage - b.percentage))
      .slice(0, 4);
  }, [stats.courses]);

  const maxBunkCount = useMemo(() => {
    return Math.max(1, ...topBunkList.map((c) => c.absent));
  }, [topBunkList]);

  const stageThemeClass = [
    'sw-stage--01-cobalt',
    'sw-stage--02-lime',
    'sw-stage--03-paper',
    'sw-stage--04-midnight',
    'sw-stage--05-receipt',
  ][slideIndex];

  const showSemesterInHeader = slideIndex >= 2;

  // Slide 1 dynamic tokens
  const s01HeyWords = [`Hey`, `${stats.firstName.toUpperCase()},`];
  const s01ShowedWords = ['You', 'showed', 'up.'];
  const s01PctChars = stats.overallPercentage.toFixed(1).split('');
  const s01AttendedStr = stats.hasCountData
    ? String(stats.totalAttended)
    : `${stats.overallPercentage.toFixed(0)}%`;
  const s01AttendedChars = s01AttendedStr.split('');

  // Slide 2 dynamic tokens
  const s02BunkChars = (stats.hasCountData ? String(stats.totalBunked) : '0').split('');

  // Slide 3 dynamic tokens
  const s03MostBunkedStr = stats.mostBunkedCourse
    ? stats.mostBunkedCourse.hasCounts
      ? String(stats.mostBunkedCourse.absent)
      : `${stats.mostBunkedCourse.percentage.toFixed(0)}%`
    : '0';
  const s03MostBunkedChars = s03MostBunkedStr.split('');
  const s03LoyalPctStr = stats.mostLoyalCourse
    ? `${stats.mostLoyalCourse.percentage.toFixed(1)}%`
    : '100.0%';
  const s03LoyalPctChars = s03LoyalPctStr.split('');

  // Slide 4 dynamic tokens
  const s04TitleLines = splitIntoTwoLines(`${stats.archetype.title}.`);
  const s04QuoteLines = useMemo(() => {
    const raw = `“${stats.archetype.tagline}”`;
    const dotIdx = raw.indexOf('.');
    if (dotIdx > 0 && dotIdx < raw.length - 2) {
      return [raw.slice(0, dotIdx + 1).trim(), raw.slice(dotIdx + 1).trim()];
    }
    return splitIntoTwoLines(raw);
  }, [stats.archetype.tagline]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sw-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.section
            className={`sw-stage ${stageThemeClass}`}
            role="dialog"
            aria-modal="true"
            aria-label="Ledger Semester Wrapped"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Story Header (Figma 74:3, 74:7, 74:11, 74:15, 74:19) */}
            <motion.header
              key={`header-${slideIndex}-${replayKey}`}
              className="sw-header"
              data-name="Story header"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1] }}
              transition={{
                opacity: { duration: 6, times: [0, 0.0367, 1], ease: ['easeOut', 'linear'] },
              }}
            >
              <div className="sw-progress-row" role="tablist" aria-label="Story progress">
                {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
                  const isPast = idx < slideIndex;
                  const isCurrent = idx === slideIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`Slide ${idx + 1} of ${TOTAL_SLIDES}`}
                      className="sw-progress-segment"
                      onClick={() => goToSlide(idx)}
                    >
                      {isCurrent ? (
                        <motion.span
                          key={`prog-${slideIndex}-${replayKey}`}
                          className="sw-progress-fill"
                          initial={{ width: '1.5%' }}
                          animate={{ width: paused ? `${Math.max(1.5, progress)}%` : ['1.5%', '1.5%', '100%'] }}
                          transition={
                            paused
                              ? { duration: 0.1 }
                              : {
                                  width: {
                                    duration: 6,
                                    times: [0, 0.0083, 1],
                                    ease: [[0.5, 0, 0.5, 1], 'linear'],
                                  },
                                }
                          }
                        />
                      ) : (
                        <span
                          className="sw-progress-fill"
                          style={{ width: isPast ? '100%' : '0%' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="sw-header__main-row">
                <div className="sw-header__brand">
                  <span className="sw-header__wordmark">ledger</span>
                  <span className="sw-header__dot" aria-hidden="true" />
                  <span className="sw-header__slash">/ WRAPPED</span>
                </div>

                <div className="sw-header__actions">
                  {slideIndex < TOTAL_SLIDES - 1 && (
                    <button
                      type="button"
                      className="sw-header__ctrl-btn sw-header__pause-btn"
                      onClick={() => setPaused((p) => !p)}
                      aria-label={paused ? 'Resume story' : 'Pause story'}
                      title={paused ? 'Resume' : 'Pause'}
                    >
                      {paused ? '▶' : 'Ⅱ'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="sw-header__ctrl-btn sw-header__close-btn"
                    onClick={onClose}
                    aria-label="Close Wrapped"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {showSemesterInHeader && (
                <p className="sw-header__semester">{stats.semesterTag}</p>
              )}

              <div className="sw-header__rule" aria-hidden="true" />
            </motion.header>

            {/* Story Body */}
            <div
              className="sw-body"
              onClick={handleBodyClick}
              onPointerDown={(e) => {
                if (!e.target.closest('button') && slideIndex < TOTAL_SLIDES - 1) {
                  setPaused(true);
                }
              }}
              onPointerUp={(e) => {
                if (!e.target.closest('button') && slideIndex < TOTAL_SLIDES - 1) {
                  setPaused(false);
                }
              }}
            >
              {/* =========================================================
                  SLIDE 01: Wrapped · 01 Attendance (Figma 74:2)
                 ========================================================= */}
              {slideIndex === 0 && (
                <div
                  key={`s01-${replayKey}`}
                  className="sw-slide sw-slide--01"
                  data-node-id="74:2"
                >
                  <div className="sw-s01__intro">
                    {/* 75:3 Hey SABAREESH, (WORD stagger) */}
                    <StaggeredTextGroup
                      as="p"
                      mode="word"
                      items={s01HeyWords}
                      startMs={120}
                      groupDurationMs={416.667}
                      staggerStepMs={133.333}
                      distancePx={14}
                      className="sw-s01__hey"
                      data-node-id="75:3"
                    />
                    {/* 75:4 You showed up. (WORD stagger) */}
                    <StaggeredTextGroup
                      as="h2"
                      mode="word"
                      items={s01ShowedWords}
                      startMs={250}
                      groupDurationMs={335.366}
                      staggerStepMs={107.317}
                      distancePx={14}
                      className="sw-s01__showed"
                      data-node-id="75:4"
                    />
                  </div>

                  <div className="sw-s01__pct-block">
                    <div className="sw-s01__pct-row">
                      {/* 75:5 83.6 (CHARACTER_NO_WHITESPACE stagger) */}
                      <StaggeredTextGroup
                        as="span"
                        mode="char"
                        items={s01PctChars}
                        startMs={400}
                        groupDurationMs={306.122}
                        staggerStepMs={97.959}
                        distancePx={18}
                        className="sw-s01__pct-num"
                        data-node-id="75:5"
                      />
                      {/* 75:6 % */}
                      <motion.span
                        className="sw-s01__pct-sign"
                        data-node-id="75:6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                        transition={timelineFadeY(0.0917, 0.1583)}
                      >
                        %
                      </motion.span>
                    </div>
                    {/* 75:7 OF YOUR SEMESTER. ON RECORD. */}
                    <motion.p
                      className="sw-s01__pct-caption"
                      data-node-id="75:7"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                      transition={timelineFadeY(0.0917, 0.1583)}
                    >
                      OF YOUR SEMESTER. ON RECORD.
                    </motion.p>
                  </div>

                  {/* 75:8 + 75:9..75:58 50-bar barcode attendance chart (slides/fills AFTER top elements appear) */}
                  <motion.div
                    className="sw-s01__chart-wrap"
                    role="img"
                    aria-label={`${stats.overallPercentage.toFixed(1)} percent attendance chart`}
                    style={{ transformOrigin: '0% 50%' }}
                    initial={{ opacity: 0, x: -18, scaleX: 0.92 }}
                    animate={{
                      opacity: [0, 0, 1, 1],
                      x: [-18, -18, 0, 0],
                      scaleX: [0.92, 0.92, 1, 1],
                    }}
                    transition={timelineFadeY(0.165, 0.225)}
                  >
                    <motion.div
                      className="sw-s01__chart-bg"
                      data-node-id="75:8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0, 0.13, 0.13] }}
                      transition={timelineOpacity(0.165, 0.225)}
                    />
                    <div className="sw-s01__chart-ticks">
                      {Array.from({ length: TICK_COUNT }).map((_, tickIdx) => {
                        const isFilled = tickIdx < filledTicksCount;
                        const isLastFilled = tickIdx === filledTicksCount - 1;
                        // Slide & light up sequentially from left to right AFTER the percentage (t = 0.18 -> 0.30)
                        const tickAppearStart = Number((0.17 + tickIdx * 0.0018).toFixed(4));
                        const tickAppearEnd = Number((tickAppearStart + 0.025).toFixed(4));
                        const progressRatio =
                          filledTicksCount > 1 ? tickIdx / (filledTicksCount - 1) : 0;
                        const bgStart = Number(
                          (0.185 + Math.pow(progressRatio, 1.2) * (0.295 - 0.185)).toFixed(4)
                        );
                        const bgEnd = Number(
                          (bgStart + (isLastFilled ? 0.015 : 0.006)).toFixed(4)
                        );
                        const targetColor = isLastFilled
                          ? 'rgba(238, 246, 152, 0.86)'
                          : '#EBF581';

                        if (isFilled) {
                          return (
                            <motion.span
                              key={tickIdx}
                              className="sw-s01__tick"
                              initial={{
                                opacity: 0,
                                y: 8,
                                backgroundColor: 'rgba(250, 250, 245, 0.28)',
                              }}
                              animate={{
                                opacity: [0, 0, 1, 1],
                                y: [8, 8, 0, 0],
                                backgroundColor: [
                                  'rgba(250, 250, 245, 0.28)',
                                  'rgba(250, 250, 245, 0.28)',
                                  targetColor,
                                  targetColor,
                                ],
                              }}
                              transition={{
                                opacity: {
                                  duration: 6,
                                  times: [0, tickAppearStart, tickAppearEnd, 1],
                                  ease: EASE_TICK_OPACITY,
                                },
                                y: {
                                  duration: 6,
                                  times: [0, tickAppearStart, tickAppearEnd, 1],
                                  ease: EASE_HOLD_OUT,
                                },
                                backgroundColor: {
                                  duration: 6,
                                  times: [0, bgStart, bgEnd, 1],
                                  ease: EASE_TICK_OPACITY,
                                },
                              }}
                            />
                          );
                        }

                        return (
                          <motion.span
                            key={tickIdx}
                            className="sw-s01__tick sw-s01__tick--unfilled"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: [0, 0, 0.28, 0.28], y: [8, 8, 0, 0] }}
                            transition={{
                              opacity: {
                                duration: 6,
                                times: [0, tickAppearStart, tickAppearEnd, 1],
                                ease: EASE_TICK_OPACITY,
                              },
                              y: {
                                duration: 6,
                                times: [0, tickAppearStart, tickAppearEnd, 1],
                                ease: EASE_HOLD_OUT,
                              },
                            }}
                          />
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* 75:59, 75:60, 75:61 Classes attended counter */}
                  <div className="sw-s01__classes-block">
                    <div className="sw-s01__classes-row">
                      <StaggeredTextGroup
                        as="span"
                        mode="char"
                        items={s01AttendedChars}
                        startMs={1750}
                        groupDurationMs={365.854}
                        staggerStepMs={117.073}
                        distancePx={18}
                        className="sw-s01__attended"
                        data-node-id="75:59"
                      />
                      <motion.span
                        className="sw-s01__conducted"
                        data-node-id="75:60"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                        transition={timelineFadeY(0.31, 0.3767)}
                      >
                        {stats.hasCountData
                          ? `/ ${stats.totalConducted}`
                          : `/ ${stats.coursesCount}`}
                      </motion.span>
                    </div>
                    <motion.p
                      className="sw-s01__classes-label"
                      data-node-id="75:61"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                      transition={timelineFadeY(0.31, 0.3767)}
                    >
                      CLASSES ATTENDED
                    </motion.p>
                  </div>

                  {/* 75:62 Horizontal stats divider */}
                  <motion.div
                    className="sw-s01__divider-h"
                    data-node-id="75:62"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 0.28, 0.28] }}
                    transition={timelineOpacity(0.3433, 0.41)}
                  />

                  {/* 75:63..75:69 Two-column stats split */}
                  <div className="sw-s01__split">
                    <motion.div
                      className="sw-s01__split-col"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                      transition={timelineFadeY(0.3433, 0.41)}
                    >
                      <strong
                        className="sw-s01__split-val sw-s01__split-val--light"
                        data-node-id="75:64"
                      >
                        {stats.hasCountData
                          ? stats.minutesInClass.toLocaleString()
                          : stats.coursesCount}
                      </strong>
                      <span className="sw-s01__split-label" data-node-id="75:65">
                        MINS ON CAMPUS
                      </span>
                      <span className="sw-s01__split-sub" data-node-id="75:66">
                        {stats.hasCountData
                          ? `${stats.hoursInClass} hours, seated.`
                          : 'Courses tracked.'}
                      </span>
                    </motion.div>

                    <motion.div
                      className="sw-s01__divider-v"
                      data-node-id="75:63"
                      aria-hidden="true"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0, 0.28, 0.28] }}
                      transition={timelineOpacity(0.3433, 0.41)}
                    />

                    <motion.div
                      className="sw-s01__split-col"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                      transition={timelineFadeY(0.3433, 0.41)}
                    >
                      <strong
                        className="sw-s01__split-val sw-s01__split-val--lime"
                        data-node-id="75:67"
                      >
                        {stats.safeCoursesCount} / {stats.coursesCount} Safe
                      </strong>
                      <span className="sw-s01__split-label" data-node-id="75:68">
                        75% SAFETY CHECK
                      </span>
                      <span className="sw-s01__split-sub" data-node-id="75:69">
                        {stats.atRiskCoursesCount === 0
                          ? 'Zero courses below 75%.'
                          : `${stats.atRiskCoursesCount} course${
                              stats.atRiskCoursesCount === 1 ? '' : 's'
                            } below 75%.`}
                      </span>
                    </motion.div>
                  </div>

                  {/* 75:70, 75:71 Closing quote with vertical lime bar */}
                  <div className="sw-s01__closing">
                    <motion.span
                      className="sw-s01__closing-bar"
                      data-node-id="75:70"
                      aria-hidden="true"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0, 1, 1] }}
                      transition={timelineOpacity(0.39, 0.4567)}
                    />
                    <motion.p
                      className="sw-s01__closing-text"
                      data-node-id="75:71"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                      transition={timelineFadeY(0.39, 0.4567)}
                    >
                      {stats.attendanceQuote}
                    </motion.p>
                  </div>
                </div>
              )}

              {/* =========================================================
                  SLIDE 02: Wrapped · 02 The bunk report (Figma 74:6)
                 ========================================================= */}
              {slideIndex === 1 && (
                <div
                  key={`s02-${replayKey}`}
                  className="sw-slide sw-slide--02"
                  data-node-id="74:6"
                >
                  {/* 75:72 02 / THE BUNK REPORT */}
                  <motion.p
                    className="sw-s02__kicker"
                    data-node-id="75:72"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                    transition={timelineFadeY(0.0133, 0.0717)}
                  >
                    02 / THE BUNK REPORT
                  </motion.p>

                  <div className="sw-s02__headline-block">
                    {/* 75:73 Strategically / skipped. (LINE stagger) */}
                    <StaggeredTextGroup
                      as="h2"
                      mode="line"
                      items={['Strategically', 'skipped.']}
                      startMs={160}
                      groupDurationMs={454.545}
                      staggerStepMs={145.455}
                      distancePx={20}
                      className="sw-s02__headline"
                      data-node-id="75:73"
                    />
                    {/* 75:74 Editorial underline */}
                    <motion.div
                      className="sw-s02__underline"
                      data-node-id="75:74"
                      aria-hidden="true"
                      initial={{ width: 1 }}
                      animate={{ width: [1, 1, 164, 164] }}
                      transition={{
                        width: {
                          duration: 6,
                          times: [0, 0.0917, 0.1667, 1],
                          ease: EASE_HOLD_OUT,
                        },
                      }}
                    />
                  </div>

                  <div className="sw-s02__bunk-hero">
                    <div className="sw-s02__bunk-row">
                      {/* 75:75 58 (CHARACTER_NO_WHITESPACE stagger) */}
                      <StaggeredTextGroup
                        as="span"
                        mode="char"
                        items={s02BunkChars}
                        startMs={400}
                        groupDurationMs={416.667}
                        staggerStepMs={133.333}
                        distancePx={18}
                        className="sw-s02__bunk-giant"
                        data-node-id="75:75"
                      />
                      {/* 75:76 TOTAL BUNKS BUNKED */}
                      <motion.span
                        className="sw-s02__bunk-label"
                        data-node-id="75:76"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                        transition={timelineFadeY(0.0917, 0.15)}
                      >
                        TOTAL BUNKS
                        <br />
                        BUNKED
                      </motion.span>
                    </div>
                    {/* 75:77 classes missed across N subjects */}
                    <motion.p
                      className="sw-s02__bunk-sub"
                      data-node-id="75:77"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                      transition={timelineFadeY(0.0917, 0.15)}
                    >
                      classes missed across {stats.coursesCount} subjects
                    </motion.p>
                  </div>

                  {/* 75:78..75:83 Solid Cobalt Metrics Panel */}
                  <motion.div
                    className="sw-s02__panel"
                    data-node-id="75:78"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1] }}
                    transition={timelineOpacity(0.125, 0.1833)}
                  >
                    <motion.div
                      className="sw-s02__panel-col"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                      transition={timelineFadeY(0.125, 0.1833)}
                    >
                      <strong className="sw-s02__panel-val" data-node-id="75:79">
                        {stats.hasCountData ? `${stats.hoursBunked} hrs` : '0 hrs'}
                      </strong>
                      <span className="sw-s02__panel-sub" data-node-id="75:80">
                        {stats.hasCountData
                          ? `${stats.minutesBunked.toLocaleString()} mins reclaimed`
                          : '0 mins reclaimed'}
                      </span>
                    </motion.div>

                    <motion.div
                      className="sw-s02__panel-sep"
                      data-node-id="75:81"
                      aria-hidden="true"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0, 0.3, 0.3] }}
                      transition={timelineOpacity(0.125, 0.1833)}
                    />

                    <motion.div
                      className="sw-s02__panel-col"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                      transition={timelineFadeY(0.125, 0.1833)}
                    >
                      <strong className="sw-s02__panel-val" data-node-id="75:82">
                        +{stats.safeBunkBank}
                      </strong>
                      <span className="sw-s02__panel-sub" data-node-id="75:83">
                        Safe skips in bank
                      </span>
                    </motion.div>
                  </motion.div>

                  {/* 75:84..75:104 Your Top Bunk Leaderboard */}
                  <div className="sw-s02__leaderboard">
                    <motion.p
                      className="sw-s02__leaderboard-title"
                      data-node-id="75:84"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                      transition={timelineFadeY(0.1583, 0.2167)}
                    >
                      YOUR TOP BUNK LEADERBOARD
                    </motion.p>

                    <ul className="sw-s02__leaderboard-list">
                      {topBunkList.map((course, idx) => {
                        const barWidthPct = course.hasCounts
                          ? Math.max(8, Math.round((course.absent / maxBunkCount) * 100))
                          : Math.max(8, Math.round(100 - course.percentage));

                        const rowStart = Number((0.1717 + idx * 0.02167).toFixed(4));
                        const rowEnd = Number((0.23 + idx * 0.02167).toFixed(4));
                        const fillStart = Number((0.175 + idx * 0.02167).toFixed(4));
                        const fillOpEnd = Number((0.2083 + idx * 0.02167).toFixed(4));
                        const fillWEnd = Number((0.2833 + idx * 0.02167).toFixed(4));

                        return (
                          <li key={course.courseCode} className="sw-s02__lb-item">
                            <motion.div
                              className="sw-s02__lb-top"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }}
                              transition={timelineFadeY(rowStart, rowEnd)}
                            >
                              <span className="sw-s02__lb-rank">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="sw-s02__lb-name">{course.courseTitle}</span>
                              <strong className="sw-s02__lb-count">
                                {course.hasCounts
                                  ? course.absent
                                  : `${course.percentage.toFixed(0)}%`}
                              </strong>
                            </motion.div>
                            <div className="sw-s02__lb-track-wrap">
                              <motion.div
                                className="sw-s02__lb-track-bg"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0, 0.12, 0.12] }}
                                transition={timelineOpacity(rowStart, rowEnd)}
                              />
                              <motion.span
                                className="sw-s02__lb-fill"
                                initial={{ opacity: 0, width: '0%' }}
                                animate={{
                                  opacity: [0, 0, 1, 1],
                                  width: ['0%', '0%', `${barWidthPct}%`, `${barWidthPct}%`],
                                }}
                                transition={{
                                  opacity: {
                                    duration: 6,
                                    times: [0, fillStart, fillOpEnd, 1],
                                    ease: EASE_HOLD_OUT,
                                  },
                                  width: {
                                    duration: 6,
                                    times: [0, fillStart, fillWEnd, 1],
                                    ease: EASE_HOLD_OUT,
                                  },
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {/* =========================================================
                  SLIDE 03: Wrapped · 03 Ghosts & loyalties (Figma 74:10)
                 ========================================================= */}
              {slideIndex === 2 && (
                <div
                  key={`s03-${replayKey}`}
                  className="sw-slide sw-slide--03"
                  data-node-id="74:10"
                >
                  {/* 75:105 03 / GHOSTS & LOYALTIES */}
                  <motion.p
                    className="sw-s03__kicker"
                    data-node-id="75:105"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1] }}
                    transition={timelineOpacity(0.01, 0.085)}
                  >
                    03 / GHOSTS &amp; LOYALTIES
                  </motion.p>

                  {/* 75:106 One got ghosted. / One got your all. (LINE stagger) */}
                  <StaggeredTextGroup
                    as="h2"
                    mode="line"
                    items={['One got ghosted.', 'One got your all.']}
                    startMs={140}
                    groupDurationMs={492.424}
                    staggerStepMs={157.576}
                    distancePx={18}
                    className="sw-s03__headline"
                    data-node-id="75:106"
                  />

                  {/* 75:107..75:113 #1 Most Bunked Feature Block */}
                  <motion.div
                    className="sw-s03__bunked-box"
                    data-node-id="75:107"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                    transition={timelineFadeY(0.075, 0.15)}
                  >
                    <p className="sw-s03__bunked-tag" data-node-id="75:108">
                      #1 MOST BUNKED
                    </p>
                    <h3 className="sw-s03__bunked-title" data-node-id="75:109">
                      {stats.mostBunkedCourse?.courseTitle || 'None Skipped'}
                    </h3>

                    <div className="sw-s03__bunked-stats">
                      <div className="sw-s03__bunked-left">
                        {/* 75:110 13 (CHARACTER_NO_WHITESPACE stagger) */}
                        <StaggeredTextGroup
                          as="span"
                          mode="char"
                          items={s03MostBunkedChars}
                          startMs={650}
                          groupDurationMs={378.788}
                          staggerStepMs={121.212}
                          distancePx={12}
                          className="sw-s03__bunked-num"
                          data-node-id="75:110"
                        />
                        <span className="sw-s03__bunked-unit" data-node-id="75:111">
                          BUNKS
                        </span>
                      </div>

                      <div className="sw-s03__bunked-right">
                        <span className="sw-s03__bunked-pct" data-node-id="75:112">
                          {stats.mostBunkedCourse
                            ? `${stats.mostBunkedCourse.percentage.toFixed(1)}%`
                            : '100.0%'}
                        </span>
                        <span className="sw-s03__bunked-att-label" data-node-id="75:113">
                          ATTENDANCE
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* 75:114..75:118 #1 Most Loyal Feature Block */}
                  <motion.div
                    className="sw-s03__loyal-box"
                    data-node-id="75:114"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                    transition={timelineFadeY(0.1417, 0.2167)}
                  >
                    <p className="sw-s03__loyal-tag" data-node-id="75:115">
                      #1 MOST LOYAL
                    </p>
                    <h3 className="sw-s03__loyal-title" data-node-id="75:116">
                      {stats.mostLoyalCourse?.courseTitle || 'All Courses'}
                    </h3>
                    {/* 75:117 100.0% (CHARACTER_NO_WHITESPACE stagger) */}
                    <StaggeredTextGroup
                      as="p"
                      mode="char"
                      items={s03LoyalPctChars}
                      startMs={1050}
                      groupDurationMs={192.308}
                      staggerStepMs={61.538}
                      distancePx={12}
                      className="sw-s03__loyal-pct"
                      data-node-id="75:117"
                    />
                    <p className="sw-s03__loyal-sub" data-node-id="75:118">
                      {stats.mostLoyalCourse?.hasCounts
                        ? `${stats.mostLoyalCourse.attended}/${stats.mostLoyalCourse.conducted} CLASSES ATTENDED`
                        : `${stats.mostLoyalCourse?.courseCode || ''} CLASSES ATTENDED`}
                    </p>
                  </motion.div>

                  {/* 75:119..75:126 Bottom Two-Column Footnote Split */}
                  <motion.div
                    className="sw-s03__bottom-split"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
                    transition={timelineFadeY(0.2083, 0.2833)}
                  >
                    <div className="sw-s03__bottom-col">
                      <span className="sw-s03__bottom-eyebrow" data-node-id="75:119">
                        SECOND HOME ROOM
                      </span>
                      <strong className="sw-s03__room-val" data-node-id="75:120">
                        {stats.topRoom ? stats.topRoom.room : 'TBA'}
                      </strong>
                      <p className="sw-s03__bottom-note" data-node-id="75:121">
                        {stats.topRoom ? (
                          <>
                            {stats.topRoom.sessionsPerCycle} classes every
                            <br />
                            5-day cycle
                          </>
                        ) : (
                          <>
                            Across campus
                            <br />
                            blocks
                          </>
                        )}
                      </p>
                    </div>

                    <div
                      className="sw-s03__bottom-divider"
                      data-node-id="75:122"
                      aria-hidden="true"
                    />

                    <div className="sw-s03__bottom-col">
                      <span className="sw-s03__bottom-eyebrow" data-node-id="75:123">
                        75% TIGHTROPE SUBJECT
                      </span>
                      <strong className="sw-s03__tightrope-code" data-node-id="75:124">
                        {stats.tightropeCourse ? stats.tightropeCourse.courseCode : '—'}
                      </strong>
                      <span className="sw-s03__tightrope-pct" data-node-id="75:125">
                        {stats.tightropeCourse
                          ? `(${stats.tightropeCourse.percentage.toFixed(1)}%)`
                          : ''}
                      </span>
                      <p className="sw-s03__bottom-note" data-node-id="75:126">
                        Closest to the 75.0%
                        <br />
                        cutoff line
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* =========================================================
                  SLIDE 04: Wrapped · 04 The tactical ghost (Figma 74:14)
                 ========================================================= */}
              {slideIndex === 3 && (
                <div
                  key={`s04-${replayKey}`}
                  className="sw-slide sw-slide--04"
                  data-node-id="74:14"
                >
                  {/* 75:127 04 / YOUR SEMESTER ARCHETYPE */}
                  <motion.p
                    className="sw-s04__kicker"
                    data-node-id="75:127"
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [9, 9, 0, 0] }}
                    transition={timelineFadeY(0.01, 0.085)}
                  >
                    04 / YOUR SEMESTER ARCHETYPE
                  </motion.p>

                  {/* 75:128 Based on your bunks, margins, and rhythm, you are: */}
                  <motion.p
                    className="sw-s04__intro"
                    data-node-id="75:128"
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [9, 9, 0, 0] }}
                    transition={timelineFadeY(0.01, 0.085)}
                  >
                    Based on your bunks, margins, and rhythm, you are:
                  </motion.p>

                  {/* 75:129 + 75:130 Precision badge */}
                  <motion.div
                    className="sw-s04__badge"
                    data-node-id="75:129"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1] }}
                    transition={timelineOpacity(0.0433, 0.1183)}
                  >
                    <motion.span
                      data-node-id="75:130"
                      initial={{ opacity: 0, y: 9 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [9, 9, 0, 0] }}
                      transition={timelineFadeY(0.0433, 0.1183)}
                    >
                      {stats.archetype.badge}
                    </motion.span>
                  </motion.div>

                  {/* 75:131 The Tactical / Ghost. (LINE stagger) */}
                  <StaggeredTextGroup
                    as="h2"
                    mode="line"
                    items={s04TitleLines}
                    startMs={400}
                    groupDurationMs={606.061}
                    staggerStepMs={193.939}
                    distancePx={22}
                    className="sw-s04__title"
                    data-node-id="75:131"
                  />

                  {/* 75:132..75:143 12-bar Identity Recording Strip with scaleY wave */}
                  <div className="sw-s04__identity-bars" aria-hidden="true">
                    {IDENTITY_BARS.map((idx) => {
                      const mod = idx % 3;
                      const t0 = Number((0.1367 + idx * 0.005833).toFixed(4));
                      return (
                        <motion.span
                          key={idx}
                          className={`sw-s04__id-bar sw-s04__id-bar--${mod}`}
                          style={{ transformOrigin: '50% 50%' }}
                          initial={{ opacity: 0, scaleY: 0.25 }}
                          animate={{
                            opacity: [0, 0, 0.9, 0.9],
                            scaleY: [0.25, 0.25, 1.3, 0.65, 1, 1],
                          }}
                          transition={{
                            opacity: {
                              duration: 6,
                              times: [0, t0, Number((t0 + 0.03).toFixed(4)), 1],
                              ease: EASE_HOLD_OUT,
                            },
                            scaleY: {
                              duration: 6,
                              times: [
                                0,
                                t0,
                                Number((t0 + 0.04167).toFixed(4)),
                                Number((t0 + 0.1).toFixed(4)),
                                Number((t0 + 0.1583).toFixed(4)),
                                1,
                              ],
                              ease: EASE_ID_BAR_SCALE,
                            },
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* 75:144 “Maximum freedom. / Zero casualties.” (LINE stagger) */}
                  <StaggeredTextGroup
                    as="div"
                    mode="line"
                    items={s04QuoteLines}
                    startMs={1050}
                    groupDurationMs={530.303}
                    staggerStepMs={169.697}
                    distancePx={12}
                    className="sw-s04__quote"
                    data-node-id="75:144"
                  />

                  {/* 75:145 Description */}
                  <motion.p
                    className="sw-s04__desc"
                    data-node-id="75:145"
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [9, 9, 0, 0] }}
                    transition={timelineFadeY(0.2367, 0.3117)}
                  >
                    {stats.archetype.description}
                  </motion.p>

                  {/* 75:146 Metrics rule */}
                  <motion.div
                    className="sw-s04__rule"
                    data-node-id="75:146"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1] }}
                    transition={timelineOpacity(0.275, 0.35)}
                  />

                  {/* 75:147..75:152 3-Column Metrics */}
                  <motion.div
                    className="sw-s04__metrics"
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [9, 9, 0, 0] }}
                    transition={timelineFadeY(0.275, 0.35)}
                  >
                    <div className="sw-s04__metric-col">
                      <span className="sw-s04__metric-label" data-node-id="75:147">
                        ATTENDANCE
                      </span>
                      <strong className="sw-s04__metric-val" data-node-id="75:148">
                        {stats.overallPercentage.toFixed(1)}%
                      </strong>
                    </div>
                    <div className="sw-s04__metric-col">
                      <span className="sw-s04__metric-label" data-node-id="75:149">
                        BUNKS TAKEN
                      </span>
                      <strong className="sw-s04__metric-val" data-node-id="75:150">
                        {stats.hasCountData ? stats.totalBunked : '0'}
                      </strong>
                    </div>
                    <div className="sw-s04__metric-col">
                      <span className="sw-s04__metric-label" data-node-id="75:151">
                        SAFE BANK
                      </span>
                      <strong
                        className="sw-s04__metric-val sw-s04__metric-val--lime"
                        data-node-id="75:152"
                      >
                        +{stats.safeBunkBank}
                      </strong>
                    </div>
                  </motion.div>

                  {/* 75:153..75:156 Internal marks highlight */}
                  <motion.div
                    className="sw-s04__marks-box"
                    data-node-id="75:153"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1] }}
                    transition={timelineOpacity(0.3133, 0.3883)}
                  >
                    <motion.div
                      className="sw-s04__marks-inner"
                      initial={{ opacity: 0, y: 9 }}
                      animate={{ opacity: [0, 0, 1, 1], y: [9, 9, 0, 0] }}
                      transition={timelineFadeY(0.3133, 0.3883)}
                    >
                      <span className="sw-s04__marks-eyebrow" data-node-id="75:154">
                        INTERNAL MARKS HIGHLIGHT
                      </span>
                      <strong className="sw-s04__marks-main" data-node-id="75:155">
                        {stats.topMarkCourse
                          ? `${stats.topMarkCourse.courseTitle} · ${stats.topMarkCourse.obtained} / ${stats.topMarkCourse.max} (${stats.topMarkCourse.percentage.toFixed(1)}%)`
                          : 'No internal marks uploaded yet'}
                      </strong>
                      <span className="sw-s04__marks-sub" data-node-id="75:156">
                        {stats.topMarkCourse
                          ? 'Highest internal score'
                          : 'Connect Student Portal for internal marks'}
                      </span>
                    </motion.div>
                  </motion.div>
                </div>
              )}

              {/* =========================================================
                  SLIDE 05: Wrapped · 05 Your receipt (Figma 74:18)
                 ========================================================= */}
              {slideIndex === 4 && (
                <div
                  key={`s05-${replayKey}`}
                  className="sw-slide sw-slide--05"
                  data-node-id="74:18"
                >
                  {/* 75:158 05 / YOUR WRAPPED RECEIPT */}
                  <motion.p
                    className="sw-s05__kicker"
                    data-node-id="75:158"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0, 0, 1, 1], y: [6, 6, 0, 0] }}
                    transition={timelineFadeY(0.01, 0.0733)}
                  >
                    05 / YOUR WRAPPED RECEIPT
                  </motion.p>

                  {/* 75:159 Your semester. / Worth sharing. (LINE stagger) */}
                  <StaggeredTextGroup
                    as="h2"
                    mode="line"
                    items={['Your semester.', 'Worth sharing.']}
                    startMs={150}
                    groupDurationMs={492.424}
                    staggerStepMs={157.576}
                    distancePx={16}
                    className="sw-s05__headline"
                    data-node-id="75:159"
                  />

                  {/* 75:160..75:163 Theme Switcher */}
                  <motion.div
                    className="sw-s05__switcher"
                    data-node-id="75:160"
                    role="group"
                    aria-label="Receipt theme"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1] }}
                    transition={timelineOpacity(0.075, 0.1383)}
                  >
                    <button
                      type="button"
                      className={`sw-s05__switch-btn ${
                        cardTheme === 'cobalt' ? 'sw-s05__switch-btn--active' : ''
                      }`}
                      data-node-id="75:161"
                      onClick={() => setCardTheme('cobalt')}
                    >
                      <motion.span
                        data-node-id="75:162"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: [0, 0, 1, 1], y: [6, 6, 0, 0] }}
                        transition={timelineFadeY(0.075, 0.1383)}
                      >
                        Cobalt Paper
                      </motion.span>
                    </button>
                    <button
                      type="button"
                      className={`sw-s05__switch-btn ${
                        cardTheme === 'midnight' ? 'sw-s05__switch-btn--active' : ''
                      }`}
                      onClick={() => setCardTheme('midnight')}
                    >
                      <motion.span
                        data-node-id="75:163"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: [0, 0, 1, 1], y: [6, 6, 0, 0] }}
                        transition={timelineFadeY(0.075, 0.1383)}
                      >
                        Midnight Acid
                      </motion.span>
                    </button>
                  </motion.div>

                  {/* 75:164 Shareable Semester Receipt (Tilted rotate: 1.4 -> 0, y: 28 -> 0 entrance!) */}
                  <motion.div
                    className={`sw-s05__receipt sw-s05__receipt--${cardTheme}`}
                    data-node-id="75:164"
                    style={{ transformOrigin: '50% 50%' }}
                    initial={{ opacity: 0, rotate: 1.4, y: 28 }}
                    animate={{
                      opacity: [0, 0, 1, 1],
                      rotate: [1.4, 1.4, 0, 0],
                      y: [28, 28, 0, 0],
                    }}
                    transition={timelineFadeY(0.08, 0.205)}
                  >
                    <div className="sw-s05__receipt-inner">
                      <p className="sw-s05__r-brand" data-node-id="75:165">
                        ledger / wrapped
                      </p>
                      <p className="sw-s05__r-meta" data-node-id="75:166">
                        {stats.semesterTag} &nbsp;/&nbsp; {stats.firstName.toUpperCase()}
                      </p>

                      <div className="sw-s05__r-rule" data-node-id="75:167" aria-hidden="true" />

                      <div className="sw-s05__r-hero">
                        <div className="sw-s05__r-hero-left">
                          <span className="sw-s05__r-label" data-node-id="75:168">
                            ATTENDANCE
                          </span>
                          <strong className="sw-s05__r-pct" data-node-id="75:169">
                            {stats.overallPercentage.toFixed(1)}%
                          </strong>
                          <span className="sw-s05__r-sub" data-node-id="75:172">
                            {stats.hasCountData
                              ? `${stats.totalAttended}/${stats.totalConducted} · ${stats.minutesInClass.toLocaleString()} mins`
                              : `${stats.coursesCount} courses tracked`}
                          </span>
                          <span className="sw-s05__r-safe" data-node-id="75:174">
                            +{stats.safeBunkBank} safe skips left
                          </span>
                        </div>

                        <div className="sw-s05__r-hero-right">
                          <span className="sw-s05__r-label" data-node-id="75:170">
                            BUNKS
                          </span>
                          <strong className="sw-s05__r-bunks" data-node-id="75:171">
                            {stats.hasCountData ? stats.totalBunked : '0'}
                          </strong>
                          <span className="sw-s05__r-sub" data-node-id="75:173">
                            {stats.hasCountData ? `${stats.hoursBunked}h free` : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="sw-s05__r-rule" data-node-id="75:175" aria-hidden="true" />

                      <div className="sw-s05__r-courses">
                        <div className="sw-s05__r-course-col">
                          <span className="sw-s05__r-course-tag" data-node-id="75:176">
                            #1 MOST BUNKED
                          </span>
                          <strong className="sw-s05__r-course-name" data-node-id="75:177">
                            {stats.mostBunkedCourse?.courseTitle || 'None Skipped'}
                          </strong>
                          <span className="sw-s05__r-course-stat" data-node-id="75:178">
                            {stats.mostBunkedCourse
                              ? stats.mostBunkedCourse.hasCounts
                                ? `${stats.mostBunkedCourse.absent} bunks · ${stats.mostBunkedCourse.percentage.toFixed(1)}%`
                                : `${stats.mostBunkedCourse.percentage.toFixed(1)}%`
                              : '0 bunks'}
                          </span>
                        </div>

                        <div className="sw-s05__r-course-col">
                          <span className="sw-s05__r-course-tag" data-node-id="75:179">
                            #1 MOST LOYAL
                          </span>
                          <strong className="sw-s05__r-course-name" data-node-id="75:180">
                            {stats.mostLoyalCourse?.courseTitle || 'All Courses'}
                          </strong>
                          <span className="sw-s05__r-course-stat" data-node-id="75:181">
                            {stats.mostLoyalCourse
                              ? `${stats.mostLoyalCourse.percentage.toFixed(1)}% attended`
                              : '100.0% attended'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="sw-s05__r-archetype" data-node-id="75:182">
                      <span className="sw-s05__r-arch-kicker" data-node-id="75:183">
                        {stats.archetype.badge} / {stats.archetype.title.toUpperCase()}
                      </span>
                      <strong className="sw-s05__r-arch-quote" data-node-id="75:184">
                        “{stats.archetype.tagline}”
                      </strong>
                    </div>
                  </motion.div>

                  {exportMessage && (
                    <p className="sw-s05__feedback" role="status">
                      {exportMessage}
                    </p>
                  )}

                  {/* 75:185..75:190 Action Buttons */}
                  <div className="sw-s05__actions">
                    <motion.button
                      type="button"
                      className="sw-s05__download-btn"
                      data-node-id="75:185"
                      onClick={handleDownload}
                      disabled={exportState === 'downloading'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0, 1, 1] }}
                      transition={timelineOpacity(0.1917, 0.255)}
                    >
                      <motion.span
                        className="sw-s05__btn-label"
                        data-node-id="75:186"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: [0, 0, 1, 1], y: [6, 6, 0, 0] }}
                        transition={timelineFadeY(0.1917, 0.255)}
                      >
                        {exportState === 'downloading'
                          ? '↓   Generating Story PNG…'
                          : '↓   Download Story PNG'}
                      </motion.span>
                    </motion.button>

                    <div className="sw-s05__secondary-row">
                      <motion.button
                        type="button"
                        className="sw-s05__share-btn"
                        data-node-id="75:187"
                        onClick={handleShare}
                        disabled={exportState === 'sharing'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0, 1, 1] }}
                        transition={timelineOpacity(0.2167, 0.28)}
                      >
                        <motion.span
                          className="sw-s05__btn-label"
                          data-node-id="75:188"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: [0, 0, 1, 1], y: [6, 6, 0, 0] }}
                          transition={timelineFadeY(0.2167, 0.28)}
                        >
                          {exportState === 'sharing' ? '↗   Sharing…' : '↗   Share'}
                        </motion.span>
                      </motion.button>

                      <motion.button
                        type="button"
                        className="sw-s05__replay-btn"
                        data-node-id="75:189"
                        onClick={() => goToSlide(0)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0, 1, 1] }}
                        transition={timelineOpacity(0.2167, 0.28)}
                      >
                        <motion.span
                          className="sw-s05__btn-label"
                          data-node-id="75:190"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: [0, 0, 1, 1], y: [6, 6, 0, 0] }}
                          transition={timelineFadeY(0.2167, 0.28)}
                        >
                          ↺ &nbsp;Replay
                        </motion.span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
