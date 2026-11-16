import React, { useCallback, useEffect, useRef, useState } from 'react';
import './AfterHoursScene.css';

const STORAGE_KEY = 'ledger_after_hours_stats_v1';
const ROUND_MS = 45000;
const FINAL_BELL_AT = 35000;
const MAX_CONSTELLATION = 14;
const COUNTDOWN_FROM = 3;
const TOTAL_WINDOWS = 21;
const DEFAULT_FREEPLAY_WINDOWS = [0, 4, 6, 10, 13, 15, 19];
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

// Difficulty ramps through the night: 10 PM → midnight → 3 AM final bell.
const PHASES = [
  { id: 'dusk', label: 'QUIET HOURS', until: 15000, starEvery: 1250, windowEvery: 1150, windowLife: 2500 },
  { id: 'midnight', label: 'MIDNIGHT RUSH', until: FINAL_BELL_AT, starEvery: 980, windowEvery: 880, windowLife: 2100, banner: 'MIDNIGHT RUSH', sub: 'THE SKY SPEEDS UP' },
  { id: 'final', label: 'FINAL BELL · ×2', until: Infinity, starEvery: 760, windowEvery: 680, windowLife: 1750, banner: 'FINAL BELL', sub: 'ALL POINTS ×2' },
];

const BACKGROUND_STARS = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  top: `${8 + ((index * 37) % 52)}%`,
  left: `${4 + ((index * 53) % 92)}%`,
  size: index % 4 === 0 ? 3 : 2,
  delay: `${((index * 0.35) % 2.8).toFixed(2)}s`,
}));

const BUILDINGS = [
  { id: 'left', windowCount: 6, startIndex: 0 },
  { id: 'main', windowCount: 9, startIndex: 6 },
  { id: 'right', windowCount: 6, startIndex: 15 },
];

const STUDY_QUIPS = ['COFFEE #4', 'LAB PUSHED', '75% SAFE', '3 AM COMMIT', 'NOTES SHARED', 'MAGGI READY', 'RECORD SIGNED', 'NO 8 AM TOMORROW'];
const URGENT_QUIPS = ['11:59 PM CLUTCH!', 'DETENTION DODGED!', 'CT2 SAVED!', 'PORTAL SYNCED!', 'SERVER UP!'];
const CONSTELLATION_NAMES = ['THE 75% BEAR', 'THE PROXY HUNTER', 'THE LAST BENCH', 'THE CANTEEN LADLE', 'THE NIGHT OWL', 'THE LAB RECORD', "THE BACKBENCHER'S CROWN"];

const MOON_THEMES = ['classic', 'aurora', 'ember'];
const MOON_LABELS = { classic: 'SILVER MOON', aurora: 'AURORA SKY', ember: 'BLOOD MOON' };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const comboFor = (streak) => Math.min(5, 1 + Math.floor(streak / 3));
const getPhase = (elapsed) => PHASES.find((phase) => elapsed < phase.until) || PHASES[PHASES.length - 1];

function campusClock(elapsed) {
  const minutes = Math.floor(22 * 60 + clamp(elapsed / ROUND_MS, 0, 1) * 6 * 60) % (24 * 60);
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(minutes % 60).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

function formatSeconds(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function firstNameOf(profile) {
  const raw = profile?.name?.trim().split(/\s+/)[0];
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function getRankTitle(score) {
  if (score >= 1600) return 'DEAN OF AFTER HOURS';
  if (score >= 1000) return 'KEEPER OF THE CONSTELLATIONS';
  if (score >= 500) return 'ROOFTOP ASTRONOMER';
  if (score >= 200) return 'CANTEEN NIGHT OWL';
  return 'NIGHT WATCH INITIATE';
}

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration unsupported
  }
}

function loadSavedStats() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      bestScore: Number(parsed?.bestScore) || 0,
      bestCombo: Number(parsed?.bestCombo) || 1,
      gamesPlayed: Number(parsed?.gamesPlayed) || 0,
    };
  } catch {
    return { bestScore: 0, bestCombo: 1, gamesPlayed: 0 };
  }
}

function saveStats(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

function createGame(now) {
  return {
    now,
    elapsed: 0,
    timeLeft: ROUND_MS,
    score: 0,
    streak: 0,
    maxCombo: 1,
    starsCaught: 0,
    windowsCaught: 0,
    misses: 0,
    phaseId: 'dusk',
    lastStarSpawn: now - 900,
    lastWindowSpawn: now - 500,
    over: false,
  };
}

function makeStar(id, now, motionScale, origin) {
  const kind = origin ? 'star' : Math.random() < 0.16 ? 'comet' : 'star';
  const x = origin ? origin.x : 12 + Math.random() * 70;
  const y = origin ? origin.y : 8 + Math.random() * 24;
  const dir = x > 50 ? -1 : 1; // always streak toward the centre so it stays on-screen
  const dx = dir * (90 + Math.random() * 80);
  const dy = 50 + Math.random() * 50;
  const duration = (kind === 'comet' ? 1600 : 1900 + Math.random() * 500) * motionScale;
  return {
    id,
    kind,
    x,
    y,
    dx,
    dy,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    duration,
    born: now,
    ambient: Boolean(origin),
  };
}

export default function AfterHoursScene({ onClose, profile }) {
  const dialogRef = useRef(null);
  const skyRef = useRef(null);
  const audioCtxRef = useRef(null);
  const idRef = useRef(1);
  const timersRef = useRef(new Set());
  const lastCatchRef = useRef(0);
  const pausedAtRef = useRef(0);
  const reducedMotionRef = useRef(
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );

  // Game engine state lives in refs so the rAF loop can mutate it synchronously.
  const gameRef = useRef(createGame(0));
  const starsRef = useRef([]);
  const windowsRef = useRef({});
  const constellationRef = useRef([]);

  const [savedStats, setSavedStats] = useState(loadSavedStats);
  const statsRef = useRef(savedStats);
  statsRef.current = savedStats;

  const [mode, setMode] = useState('idle'); // idle | countdown | playing | gameover
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true);
  soundRef.current = soundEnabled;

  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [moonTheme, setMoonTheme] = useState('classic');
  const [freePlayWindows, setFreePlayWindows] = useState(() => new Set(DEFAULT_FREEPLAY_WINDOWS));
  const [popups, setPopups] = useState([]);
  const [result, setResult] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [, setFrame] = useState(0);
  const forceRender = useCallback(() => setFrame((frame) => (frame + 1) % 1000000), []);

  const schedule = useCallback((fn, ms) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      fn();
    }, ms);
    timersRef.current.add(timer);
  }, []);

  // Procedural Web Audio night-sky synth — no audio files needed.
  const playTone = useCallback((type, level = 1) => {
    if (!soundRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;

      const note = (freq, delay, dur, wave = 'triangle', vol = 0.07, slideTo) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, t0 + delay);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + delay + dur * 0.8);
        gain.gain.setValueAtTime(vol, t0 + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0 + delay);
        osc.stop(t0 + delay + dur + 0.02);
      };

      switch (type) {
        case 'miss':
          note(196, 0, 0.2, 'sine', 0.06, 130.81);
          break;
        case 'tick':
          note(level > 0 ? 659.25 : 1046.5, 0, level > 0 ? 0.12 : 0.28, 'sine', 0.06);
          break;
        case 'comet':
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => note(freq, i * 0.045, 0.32));
          break;
        case 'finish':
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => note(freq, i * 0.08, 0.45, 'triangle', 0.06));
          break;
        case 'record':
          [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((freq, i) => note(freq, i * 0.07, 0.5, 'triangle', 0.065));
          break;
        default: {
          const idx = clamp(level - 1 + (type === 'urgent' ? 2 : type === 'star' ? 1 : 0), 0, PENTATONIC.length - 1);
          note(PENTATONIC[idx], 0, 0.24, type === 'window' ? 'sine' : 'triangle', 0.07, PENTATONIC[idx] * 1.02);
        }
      }
    } catch {
      // Ignore Web Audio errors on restricted browsers
    }
  }, []);

  const addPopup = useCallback((x, y, text, subtext = '', tone = 'mint') => {
    const id = idRef.current++;
    setPopups((prev) => [...prev.slice(-8), { id, x: clamp(x, 12, 88), y: clamp(y, 10, 90), text, subtext, tone }]);
    schedule(() => setPopups((prev) => prev.filter((popup) => popup.id !== id)), 900);
  }, [schedule]);

  const triggerShake = useCallback(() => {
    if (reducedMotionRef.current) return;
    setShaking(true);
    schedule(() => setShaking(false), 380);
  }, [schedule]);

  const centerInSky = (element) => {
    const sky = skyRef.current?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (!sky || !sky.width) return { x: 50, y: 30 };
    return {
      x: ((rect.left + rect.width / 2 - sky.left) / sky.width) * 100,
      y: ((rect.top + rect.height / 2 - sky.top) / sky.height) * 100,
    };
  };

  const finishRound = useCallback(() => {
    const g = gameRef.current;
    if (g.over) return;
    g.over = true;
    starsRef.current = [];
    windowsRef.current = {};

    const prev = statsRef.current;
    const record = g.score > 0 && g.score > prev.bestScore;
    const next = {
      bestScore: Math.max(prev.bestScore, g.score),
      bestCombo: Math.max(prev.bestCombo, g.maxCombo),
      gamesPlayed: prev.gamesPlayed + 1,
    };
    saveStats(next);
    setSavedStats(next);

    const caught = g.starsCaught + g.windowsCaught;
    const attempts = caught + g.misses;
    const dots = constellationRef.current.length;
    setResult({
      score: g.score,
      starsCaught: g.starsCaught,
      windowsCaught: g.windowsCaught,
      maxCombo: g.maxCombo,
      accuracy: attempts ? Math.round((caught / attempts) * 100) : 0,
      rank: getRankTitle(g.score),
      constellationName: dots >= 3 ? CONSTELLATION_NAMES[(dots + g.score) % CONSTELLATION_NAMES.length] : null,
    });
    setIsNewRecord(record);
    setMode('gameover');
    playTone(record ? 'record' : 'finish');
    vibrate(record ? [40, 60, 40, 60, 80] : 30);
  }, [playTone]);

  // One frame of the game: advance time, expire misses, spawn targets.
  const step = useCallback((now, dt) => {
    const g = gameRef.current;
    if (g.over) return;
    g.now = now;
    g.elapsed += dt;
    g.timeLeft -= dt;

    const phase = getPhase(g.elapsed);
    if (phase.id !== g.phaseId) {
      g.phaseId = phase.id;
      if (phase.banner) {
        addPopup(50, 30, phase.banner, phase.sub, phase.id === 'final' ? 'coral' : 'gold');
        playTone('comet');
      }
    }

    const motionScale = reducedMotionRef.current ? 1.35 : 1;
    let missed = 0;
    starsRef.current = starsRef.current.filter((star) => {
      if (now - star.born >= star.duration) {
        missed += 1;
        return false;
      }
      return true;
    });
    const wins = windowsRef.current;
    for (const key of Object.keys(wins)) {
      if (now - wins[key].born >= wins[key].duration) {
        delete wins[key];
        missed += 1;
      }
    }

    if (missed > 0) {
      g.misses += missed;
      if (g.streak > 0) {
        const bigBreak = g.streak >= 3;
        g.streak = 0;
        playTone('miss');
        if (bigBreak) {
          addPopup(50, 40, 'COMBO BROKEN', 'STREAK RESET', 'coral');
          triggerShake();
          vibrate([20, 30, 20]);
        }
      }
    }

    const boost = Math.min(g.streak, 15) * 14;
    if (starsRef.current.length < 3 && now - g.lastStarSpawn >= phase.starEvery - boost) {
      g.lastStarSpawn = now;
      starsRef.current.push(makeStar(idRef.current++, now, motionScale));
    }

    if (Object.keys(wins).length < 4 && now - g.lastWindowSpawn >= phase.windowEvery - boost) {
      g.lastWindowSpawn = now;
      const free = [];
      for (let i = 0; i < TOTAL_WINDOWS; i += 1) if (!wins[i]) free.push(i);
      if (free.length) {
        const idx = free[Math.floor(Math.random() * free.length)];
        const urgent = Math.random() < (phase.id === 'final' ? 0.4 : 0.26);
        wins[idx] = {
          id: idRef.current++,
          kind: urgent ? 'urgent' : 'study',
          born: now,
          duration: (urgent ? phase.windowLife * 0.75 : phase.windowLife) * motionScale,
        };
      }
    }

    if (g.timeLeft <= 0) {
      g.timeLeft = 0;
      finishRound();
    }
    forceRender();
  }, [addPopup, finishRound, forceRender, playTone, triggerShake]);

  const startRound = useCallback(() => {
    starsRef.current = [];
    windowsRef.current = {};
    constellationRef.current = [];
    gameRef.current = createGame(performance.now());
    setPopups([]);
    setResult(null);
    setIsNewRecord(false);
    setPaused(false);
    setCountdown(COUNTDOWN_FROM);
    setMode('countdown');
  }, []);

  const pause = useCallback(() => {
    if (modeRef.current !== 'playing' || pausedRef.current || gameRef.current.over) return;
    pausedAtRef.current = performance.now();
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    const delta = performance.now() - pausedAtRef.current;
    starsRef.current.forEach((star) => { star.born += delta; });
    Object.values(windowsRef.current).forEach((win) => { win.born += delta; });
    gameRef.current.lastStarSpawn += delta;
    gameRef.current.lastWindowSpawn += delta;
    pausedRef.current = false;
    setPaused(false);
  }, []);

  // Body scroll lock, initial focus & cleanup.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    const timers = timersRef.current;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Keyboard: Esc closes, Space/Enter starts, P pauses, Tab stays inside the dialog.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'p' || event.key === 'P') {
        if (pausedRef.current) resume();
        else pause();
        return;
      }
      if ((event.key === ' ' || event.key === 'Enter') && event.target?.tagName !== 'BUTTON') {
        if (modeRef.current === 'idle' || modeRef.current === 'gameover') {
          event.preventDefault();
          startRound();
        } else if (pausedRef.current) {
          event.preventDefault();
          resume();
        }
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(dialogRef.current.querySelectorAll('button:not([disabled])'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!dialogRef.current.contains(document.activeElement) || document.activeElement === dialogRef.current) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pause, resume, startRound]);

  // Auto-pause when the tab is hidden or the window loses focus.
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
    };
  }, [pause]);

  // 3-2-1 countdown.
  useEffect(() => {
    if (mode !== 'countdown') return undefined;
    if (countdown <= 0) {
      gameRef.current = createGame(performance.now());
      playTone('tick', 0);
      setMode('playing');
      return undefined;
    }
    playTone('tick', countdown);
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 650);
    return () => window.clearTimeout(timer);
  }, [mode, countdown, playTone]);

  // requestAnimationFrame game loop.
  useEffect(() => {
    if (mode !== 'playing' || paused) return undefined;
    let raf = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = clamp(now - last, 0, 100);
      last = now;
      step(now, dt);
      if (!gameRef.current.over) raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [mode, paused, step]);

  const handleCatchStar = (event, star) => {
    event.stopPropagation();
    if (pausedRef.current || !starsRef.current.some((item) => item.id === star.id)) return;
    lastCatchRef.current = performance.now();
    const { x, y } = centerInSky(event.currentTarget);
    starsRef.current = starsRef.current.filter((item) => item.id !== star.id);

    if (modeRef.current !== 'playing') {
      playTone('star', 2);
      addPopup(x, y, 'WISH LOGGED', '75% BLESSED', 'mint');
      forceRender();
      return;
    }

    const g = gameRef.current;
    const prevMult = comboFor(g.streak);
    g.streak += 1;
    const mult = comboFor(g.streak);
    const bell = g.elapsed >= FINAL_BELL_AT ? 2 : 1;
    const points = (star.kind === 'comet' ? 35 : 15) * mult * bell;
    g.score += points;
    g.starsCaught += 1;
    g.maxCombo = Math.max(g.maxCombo, mult);
    constellationRef.current = [...constellationRef.current, { x, y }].slice(-MAX_CONSTELLATION);

    if (star.kind === 'comet') {
      g.timeLeft += 2000;
      playTone('comet', mult);
      vibrate(18);
      addPopup(x, y, `+${points}`, 'COMET · +2s', 'gold');
    } else {
      playTone('star', mult);
      vibrate(8);
      const sub = mult > prevMult ? `COMBO ×${mult}!` : bell > 1 ? 'FINAL BELL ×2' : 'STAR CAUGHT';
      addPopup(x, y, `+${points}`, sub, 'mint');
    }
    forceRender();
  };

  const handleWindowTap = (event, windowIndex) => {
    event.stopPropagation();
    if (modeRef.current === 'countdown' || pausedRef.current) return;
    const { x, y } = centerInSky(event.currentTarget);

    if (modeRef.current !== 'playing') {
      setFreePlayWindows((prev) => {
        const next = new Set(prev);
        if (next.has(windowIndex)) next.delete(windowIndex);
        else next.add(windowIndex);
        return next;
      });
      if (!freePlayWindows.has(windowIndex)) {
        addPopup(x, y - 8, STUDY_QUIPS[windowIndex % STUDY_QUIPS.length], `ROOM #${101 + windowIndex}`, 'amber');
      }
      playTone('window', 1);
      return;
    }

    const active = windowsRef.current[windowIndex];
    if (!active) return;
    delete windowsRef.current[windowIndex];

    const g = gameRef.current;
    g.streak += 1;
    const mult = comboFor(g.streak);
    const bell = g.elapsed >= FINAL_BELL_AT ? 2 : 1;
    const points = (active.kind === 'urgent' ? 25 : 10) * mult * bell;
    g.score += points;
    g.windowsCaught += 1;
    g.maxCombo = Math.max(g.maxCombo, mult);

    const quips = active.kind === 'urgent' ? URGENT_QUIPS : STUDY_QUIPS;
    playTone(active.kind === 'urgent' ? 'urgent' : 'window', mult);
    vibrate(active.kind === 'urgent' ? 14 : 8);
    addPopup(x, y - 8, `+${points}`, quips[(windowIndex + g.streak) % quips.length], active.kind === 'urgent' ? 'coral' : 'amber');
    forceRender();
  };

  const handleMoonClick = (event) => {
    event.stopPropagation();
    const next = MOON_THEMES[(MOON_THEMES.indexOf(moonTheme) + 1) % MOON_THEMES.length];
    setMoonTheme(next);
    addPopup(78, 30, MOON_LABELS[next], 'SKY SHIFTED', 'mint');
    playTone('star', 3);
  };

  // Free play: tap empty sky to launch your own shooting star.
  const handleSkyClick = (event) => {
    if (modeRef.current === 'playing' || modeRef.current === 'countdown') return;
    if (performance.now() - lastCatchRef.current < 400) return;
    const sky = skyRef.current?.getBoundingClientRect();
    if (!sky) return;
    const x = ((event.clientX - sky.left) / sky.width) * 100;
    const y = ((event.clientY - sky.top) / sky.height) * 100;
    if (y > 46) return;
    const star = makeStar(idRef.current++, performance.now(), 1, { x: clamp(x, 8, 86), y: clamp(y, 6, 40) });
    starsRef.current = [...starsRef.current.slice(-3), star];
    playTone('star', 2);
    forceRender();
    schedule(() => {
      starsRef.current = starsRef.current.filter((item) => item.id !== star.id);
      forceRender();
    }, star.duration);
  };

  // Keep the shell's pull-to-refresh from firing while playing.
  const stopTouch = (event) => event.stopPropagation();

  const g = gameRef.current;
  const isLive = mode === 'playing' || mode === 'countdown';
  const multiplier = comboFor(g.streak);
  const phase = getPhase(g.elapsed);
  const finalBell = mode === 'playing' && g.elapsed >= FINAL_BELL_AT;
  const roundProgress = clamp(g.timeLeft / ROUND_MS, 0, 1);
  const constellation = constellationRef.current;
  const starsForGlow = isLive ? g.starsCaught : result?.starsCaught ?? 0;
  const illuminatedStarCount = Math.min(BACKGROUND_STARS.length, 10 + starsForGlow * 2);
  const firstName = firstNameOf(profile);

  const dialogClass = [
    'after-hours__dialog',
    `after-hours__dialog--${moonTheme}`,
    mode === 'playing' && multiplier >= 3 ? 'after-hours__dialog--fever' : '',
    finalBell ? 'after-hours__dialog--final' : '',
    paused ? 'after-hours__dialog--paused' : '',
    shaking ? 'after-hours__dialog--shake' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className="after-hours"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onTouchStart={stopTouch}
      onTouchMove={stopTouch}
      onTouchEnd={stopTouch}
    >
      <section
        ref={dialogRef}
        className={dialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="after-hours-title"
        tabIndex={-1}
      >
        {/* HUD */}
        <div className="after-hours__topbar">
          <div className="after-hours__hud">
            <button
              type="button"
              className={`after-hours__hud-btn${soundEnabled ? ' after-hours__hud-btn--on' : ''}`}
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-label={soundEnabled ? 'Mute night synth' : 'Unmute night synth'}
            >
              <span className="after-hours__hud-dot" />
              {soundEnabled ? 'SYNTH ON' : 'MUTED'}
            </button>

            {isLive ? (
              <>
                <div className="after-hours__hud-pill">
                  <span className="after-hours__hud-label">SCORE</span>
                  <strong className="after-hours__hud-val">{g.score}</strong>
                </div>
                <div className={`after-hours__hud-pill after-hours__hud-pill--combo-${multiplier}`}>
                  <span className="after-hours__hud-label">COMBO</span>
                  <strong className="after-hours__hud-val">×{multiplier}</strong>
                </div>
                <div className={`after-hours__hud-pill${g.timeLeft <= 10000 && mode === 'playing' ? ' after-hours__hud-pill--urgent' : ''}`}>
                  <span className="after-hours__hud-label">TIME</span>
                  <strong className="after-hours__hud-val">{formatSeconds(g.timeLeft)}</strong>
                </div>
                {mode === 'playing' && (
                  <button
                    type="button"
                    className="after-hours__hud-btn"
                    onClick={() => (paused ? resume() : pause())}
                    aria-label={paused ? 'Resume' : 'Pause'}
                  >
                    {paused ? '▶ RESUME' : '❚❚ PAUSE'}
                  </button>
                )}
              </>
            ) : (
              <div className="after-hours__hud-pill">
                <span className="after-hours__hud-label">BEST</span>
                <strong className="after-hours__hud-val">{savedStats.bestScore}</strong>
              </div>
            )}
          </div>

          <button className="after-hours__close" type="button" onClick={onClose} aria-label="Close after-hours scene">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Night sky & campus */}
        <div ref={skyRef} className={`after-hours__sky after-hours__sky--${moonTheme}`} onClick={handleSkyClick}>
          {isLive && (
            <div className="after-hours__round-bar" aria-hidden="true">
              <i style={{ transform: `scaleX(${roundProgress.toFixed(4)})` }} />
            </div>
          )}

          <div className="after-hours__stars" aria-hidden="true">
            {BACKGROUND_STARS.map((star, index) => (
              <i
                key={star.id}
                className={`after-hours__star${index < illuminatedStarCount ? ' after-hours__star--bright' : ''}`}
                style={{ top: star.top, left: star.left, width: `${star.size}px`, height: `${star.size}px`, animationDelay: star.delay }}
              />
            ))}
          </div>

          {/* Your constellation, drawn from every star you catch */}
          {constellation.length > 1 && (
            <svg className="after-hours__constellation" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={constellation.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} />
            </svg>
          )}
          {constellation.map((point, index) => (
            <i
              key={`${index}-${point.x.toFixed(1)}`}
              className="after-hours__const-dot"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              aria-hidden="true"
            />
          ))}

          {isNewRecord && mode === 'gameover' && (
            <div className="after-hours__meteor-shower" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} style={{ left: `${6 + i * 9}%`, animationDelay: `${(i * 0.17).toFixed(2)}s` }} />
              ))}
            </div>
          )}

          <button
            type="button"
            className={`after-hours__moon after-hours__moon--${moonTheme}`}
            onClick={handleMoonClick}
            title="Tap to shift the sky"
            aria-label="Shift moon phase"
          />

          <div className="after-hours__shooting-layer">
            {starsRef.current.map((star) => (
              <button
                key={star.id}
                type="button"
                className={`after-hours__shooting-star${star.kind === 'comet' ? ' after-hours__shooting-star--comet' : ''}`}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  '--star-dx': `${star.dx}px`,
                  '--star-dy': `${star.dy}px`,
                  '--star-dur': `${star.duration}ms`,
                  '--star-angle': `${star.angle}deg`,
                }}
                onPointerDown={(event) => handleCatchStar(event, star)}
                onClick={(event) => { if (event.detail === 0) handleCatchStar(event, star); }}
                aria-label={star.kind === 'comet' ? 'Catch golden comet' : 'Catch shooting star'}
              >
                <span className="after-hours__shooting-tail" />
                <span className="after-hours__shooting-head" />
              </button>
            ))}
          </div>

          <div className="after-hours__popup-layer" aria-hidden="true">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className={`after-hours__popup after-hours__popup--${popup.tone}`}
                style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
              >
                <strong>{popup.text}</strong>
                {popup.subtext && <span>{popup.subtext}</span>}
              </div>
            ))}
          </div>

          <div className="after-hours__campus">
            {BUILDINGS.map((building) => (
              <div key={building.id} className={`after-hours__building after-hours__building--${building.id}`}>
                {Array.from({ length: building.windowCount }, (_, idx) => {
                  const windowIndex = building.startIndex + idx;
                  const active = mode === 'playing' ? windowsRef.current[windowIndex] : null;
                  const lit = mode !== 'playing' && mode !== 'countdown' && freePlayWindows.has(windowIndex);
                  const fuse = active ? clamp(1 - (g.now - active.born) / active.duration, 0, 1) : 0;
                  let stateClass = '';
                  if (active) stateClass = active.kind === 'urgent' ? ' after-hours__window--urgent' : ' after-hours__window--active';
                  else if (lit) stateClass = ' after-hours__window--lit';

                  return (
                    <button
                      key={windowIndex}
                      type="button"
                      className={`after-hours__window${stateClass}`}
                      onPointerDown={(event) => handleWindowTap(event, windowIndex)}
                      onClick={(event) => { if (event.detail === 0) handleWindowTap(event, windowIndex); }}
                      aria-label={`Campus room ${101 + windowIndex}${active ? ' — lit, tap now' : ''}`}
                    >
                      {active && <i className="after-hours__window-fuse" style={{ transform: `scaleX(${fuse.toFixed(3)})` }} />}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="after-hours__path" />
          </div>

          {mode === 'countdown' && (
            <div className="after-hours__overlay" aria-live="assertive">
              <span key={countdown} className="after-hours__countdown">{countdown > 0 ? countdown : 'GO'}</span>
              <small>CATCH STARS · TAP GLOWING ROOMS</small>
            </div>
          )}

          {paused && (
            <div className="after-hours__overlay after-hours__overlay--paused">
              <span className="after-hours__paused-title">PAUSED</span>
              <button type="button" className="after-hours__play-btn" onClick={(event) => { event.stopPropagation(); resume(); }}>
                Resume shift
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="after-hours__copy">
          {mode === 'idle' && (
            <>
              <p className="after-hours__eyebrow">You found the quiet side of campus · tap windows, moon, or sky</p>
              <h2 id="after-hours-title">After hours<span>.</span></h2>
              <p>Catch shooting stars and check on glowing rooms before they go dark. Every star you catch joins your constellation.</p>
              {savedStats.gamesPlayed > 0 && (
                <div className="after-hours__record-strip">
                  <span>BEST <strong>{savedStats.bestScore}</strong></span>
                  <span>TOP COMBO <strong>×{savedStats.bestCombo}</strong></span>
                  <span>SHIFTS <strong>{savedStats.gamesPlayed}</strong></span>
                </div>
              )}
              <div className="after-hours__actions">
                <button type="button" className="after-hours__play-btn" onClick={startRound}>
                  Start night shift · 45s
                </button>
                <div className="after-hours__status"><span /> LEDGER IS STILL AWAKE</div>
              </div>
              <p className="after-hours__keys">SPACE start · P pause · ESC leave</p>
            </>
          )}

          {isLive && (
            <>
              <p id="after-hours-title" className={`after-hours__eyebrow${finalBell ? ' after-hours__eyebrow--final' : ''}`}>
                {campusClock(g.elapsed)} · {phase.label}
              </p>
              <div className="after-hours__live-strip">
                <div className="after-hours__live-stat"><span>STARS</span><strong>{g.starsCaught}</strong></div>
                <div className="after-hours__live-stat"><span>ROOMS</span><strong>{g.windowsCaught}</strong></div>
                <div className="after-hours__live-stat"><span>STREAK</span><strong>{g.streak}</strong></div>
              </div>
            </>
          )}

          {mode === 'gameover' && result && (
            <>
              <p className={`after-hours__eyebrow${isNewRecord ? ' after-hours__eyebrow--record' : ''}`}>
                {isNewRecord ? '★ New campus record ★' : 'Shift complete · 4:00 AM'}
              </p>
              <h2 id="after-hours-title">{result.score}<span> pts</span></h2>
              <div className="after-hours__rank">{result.rank}</div>
              <div className="after-hours__result-grid">
                <div><span>STARS</span><strong>{result.starsCaught}</strong></div>
                <div><span>ROOMS</span><strong>{result.windowsCaught}</strong></div>
                <div><span>MAX COMBO</span><strong>×{result.maxCombo}</strong></div>
                <div><span>ACCURACY</span><strong>{result.accuracy}%</strong></div>
              </div>
              <p className="after-hours__summary-meta">
                {result.constellationName
                  ? <>You drew <strong>{result.constellationName}</strong> across the sky.</>
                  : 'Catch 3+ stars to draw your own constellation.'}
                {' '}Good night{firstName ? `, ${firstName}` : ''}.
              </p>
              <div className="after-hours__actions">
                <button type="button" className="after-hours__play-btn" onClick={startRound}>Play again</button>
                <button type="button" className="after-hours__secondary-btn" onClick={() => setMode('idle')}>Free play</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
