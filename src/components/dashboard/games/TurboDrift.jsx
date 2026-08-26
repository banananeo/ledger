import React, { useState, useEffect, useRef, useCallback } from 'react';
import { triggerHapticVibration } from '../../../utils/mobilePush';
import './TurboDrift.css';

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const LANES = 3;           // number of lanes
const BASE_SPEED = 4;      // px per frame road scroll
const SPEED_STEP = 0.4;    // added every SPEED_INTERVAL ms
const SPEED_INTERVAL = 8000; // ms between speed bumps
const MAX_SPEED = 18;
const NITRO_DURATION = 2500;  // ms of invincibility
const NITRO_CHARGE = 4;       // coins needed to fill nitro

// Colour palette (all drawn on canvas)
const CLR = {
  bg: '#080a0f',
  road: '#0e1018',
  lane_line: '#2a2f45',
  lane_center: '#1e2130',
  player: '#6366f1',
  player_glow: 'rgba(99,102,241,0.55)',
  player_nitro: '#f472b6',
  traffic: ['#ef4444','#f59e0b','#22c55e','#38bdf8','#e879f9','#fb923c'],
  coin: '#fbbf24',
  coin_glow: 'rgba(251,191,36,0.6)',
  nitro_can: '#f472b6',
  nitro_glow: 'rgba(244,114,182,0.5)',
  stripe: 'rgba(255,255,255,0.07)',
  near_miss: 'rgba(245,158,11,0.18)',
};

function playTone(freq, dur = 0.06, type = 'sine', vol = 0.1) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export function TurboDrift() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const stateRef  = useRef(null); // mutable game state bucket

  const [uiScore,      setUiScore]      = useState(0);
  const [uiHighScore,  setUiHighScore]  = useState(() =>
    parseInt(localStorage.getItem('td_hs') || '0', 10));
  const [uiCombo,      setUiCombo]      = useState(1);
  const [uiSpeedPct,   setUiSpeedPct]   = useState(0);
  const [gamePhase,    setGamePhase]    = useState('ready'); // ready|playing|paused|over
  const [flashMsg,     setFlashMsg]     = useState(null);   // {text,cls}
  const [nitroReady,   setNitroReady]   = useState(false);

  /* ── flash helper ── */
  const flash = useCallback((text, cls) => {
    setFlashMsg(null);
    requestAnimationFrame(() => setFlashMsg({ text, cls, key: Date.now() }));
    setTimeout(() => setFlashMsg(null), 1200);
  }, []);

  /* ── init / reset game state bucket ── */
  const initState = useCallback((cw, ch) => {
    const laneW = cw / LANES;
    return {
      cw, ch, laneW,
      // player
      playerLane: 1,       // 0 | 1 | 2
      playerY: ch - 120,
      playerW: laneW * 0.55,
      playerH: laneW * 0.9,
      // road
      roadOffset: 0,
      speed: BASE_SPEED,
      frameCount: 0,
      lastSpeedUp: Date.now(),
      // traffic
      cars: [],
      carSpawnTimer: 0,
      carSpawnInterval: 90, // frames
      // pickups
      coins: [],
      nitroCans: [],
      coinSpawnTimer: 0,
      nitroSpawnTimer: 0,
      // nitro
      nitroChargeCoins: 0,
      nitroActive: false,
      nitroTimer: 0,
      // scoring
      score: 0,
      highScore: parseInt(localStorage.getItem('td_hs') || '0', 10),
      combo: 1,
      goodStreak: 0,
      // particles
      particles: [],
    };
  }, []);

  /* ── canvas draw ── */
  const draw = useCallback((s, ctx) => {
    const { cw, ch, laneW } = s;

    // bg
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, cw, ch);

    // road surface
    ctx.fillStyle = CLR.road;
    ctx.fillRect(0, 0, cw, ch);

    // road stripe scanlines
    ctx.fillStyle = CLR.stripe;
    for (let y = 0; y < ch; y += 40) {
      ctx.fillRect(0, y, cw, 18);
    }

    // lane dividers (dashed)
    ctx.setLineDash([20, 18]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = CLR.lane_line;
    for (let i = 1; i < LANES; i++) {
      const x = i * laneW;
      ctx.beginPath();
      ctx.moveTo(x, (s.roadOffset % 38) - 38);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // particles
    s.particles = s.particles.filter(p => p.life > 0);
    s.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      p.r *= 0.92;
      p.life--;
    });
    ctx.globalAlpha = 1;

    // coins
    s.coins.forEach(c => {
      ctx.shadowColor = CLR.coin_glow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = CLR.coin;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // inner shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(c.x - c.r * 0.25, c.y - c.r * 0.25, c.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // nitro cans
    s.nitroCans.forEach(n => {
      ctx.shadowColor = CLR.nitro_glow;
      ctx.shadowBlur = 14;
      ctx.fillStyle = CLR.nitro_can;
      const hw = n.r * 0.65, hh = n.r;
      ctx.beginPath();
      ctx.roundRect(n.x - hw, n.y - hh, hw * 2, hh * 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `bold ${n.r}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', n.x, n.y);
    });

    // traffic cars
    s.cars.forEach(car => {
      const x = car.lane * laneW + laneW / 2;
      const hw = laneW * 0.48;
      const hh = laneW * 0.72;

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, car.y + hh + 6, hw * 0.7, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // body
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.roundRect(x - hw, car.y - hh, hw * 2, hh * 2, 6);
      ctx.fill();

      // windshield
      ctx.fillStyle = 'rgba(180,220,255,0.45)';
      ctx.beginPath();
      ctx.roundRect(x - hw * 0.6, car.y - hh + 6, hw * 1.2, hh * 0.4, 3);
      ctx.fill();

      // taillights
      ctx.fillStyle = '#ff2222';
      ctx.beginPath(); ctx.roundRect(x - hw + 2, car.y + hh - 10, hw * 0.4, 6, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x + hw * 0.6 - 2, car.y + hh - 10, hw * 0.4, 6, 2); ctx.fill();
    });

    // player car
    const px = s.playerLane * laneW + laneW / 2;
    const py = s.playerY;
    const pw = s.playerW / 2;
    const ph = s.playerH / 2;
    const isNitro = s.nitroActive;
    const pColor = isNitro ? CLR.player_nitro : CLR.player;

    // glow
    ctx.shadowColor = isNitro ? 'rgba(244,114,182,0.7)' : CLR.player_glow;
    ctx.shadowBlur = isNitro ? 30 : 18;

    // body
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.roundRect(px - pw, py - ph, pw * 2, ph * 2, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // windshield
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    ctx.beginPath();
    ctx.roundRect(px - pw * 0.62, py - ph + 6, pw * 1.24, ph * 0.45, 3);
    ctx.fill();

    // headlights
    ctx.fillStyle = isNitro ? '#fff' : '#e0e7ff';
    ctx.shadowColor = isNitro ? '#fff' : '#c7d2fe';
    ctx.shadowBlur = isNitro ? 20 : 10;
    ctx.beginPath(); ctx.roundRect(px - pw + 2, py - ph + 2, pw * 0.42, 8, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(px + pw * 0.58 - 2, py - ph + 2, pw * 0.42, 8, 2); ctx.fill();
    ctx.shadowBlur = 0;

    // exhaust trail
    if (isNitro) {
      const grad = ctx.createLinearGradient(px, py + ph, px, py + ph + 35);
      grad.addColorStop(0, 'rgba(244,114,182,0.9)');
      grad.addColorStop(0.5, 'rgba(99,102,241,0.5)');
      grad.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.4, py + ph);
      ctx.lineTo(px + pw * 0.4, py + ph);
      ctx.lineTo(px + pw * 0.15, py + ph + 35);
      ctx.lineTo(px - pw * 0.15, py + ph + 35);
      ctx.fill();
    }
  }, []);

  /* ── spawn helpers ── */
  const spawnCar = (s) => {
    const usedLanes = s.cars.filter(c => c.y < -30).map(c => c.lane);
    const freeLanes = [0,1,2].filter(l => !usedLanes.includes(l));
    if (!freeLanes.length) return;
    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    s.cars.push({
      lane,
      y: -80,
      speed: s.speed * (0.4 + Math.random() * 0.5),
      color: CLR.traffic[Math.floor(Math.random() * CLR.traffic.length)],
    });
  };

  const spawnCoin = (s) => {
    const lane = Math.floor(Math.random() * LANES);
    s.coins.push({ lane, x: lane * s.laneW + s.laneW / 2, y: -20, r: 10 });
  };

  const spawnNitroCan = (s) => {
    const lane = Math.floor(Math.random() * LANES);
    s.nitroCans.push({ lane, x: lane * s.laneW + s.laneW / 2, y: -20, r: 14 });
  };

  const spawnParticles = (s, x, y, color, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      s.particles.push({
        x, y, color,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: 2 + Math.random() * 4,
        life: 20 + Math.random() * 20,
        maxLife: 40,
      });
    }
  };

  /* ── main game loop ── */
  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    s.frameCount++;

    // speed escalation (time-based)
    const now = Date.now();
    if (now - s.lastSpeedUp > SPEED_INTERVAL && s.speed < MAX_SPEED) {
      s.speed = Math.min(MAX_SPEED, s.speed + SPEED_STEP);
      s.lastSpeedUp = now;
    }

    // road scroll
    s.roadOffset = (s.roadOffset + s.speed) % 38;

    // nitro countdown
    if (s.nitroActive) {
      s.nitroTimer -= 16;
      if (s.nitroTimer <= 0) { s.nitroActive = false; }
    }

    // ── spawn traffic ──
    s.carSpawnTimer++;
    const dynInterval = Math.max(45, s.carSpawnInterval - s.speed * 2.5);
    if (s.carSpawnTimer >= dynInterval) {
      spawnCar(s);
      s.carSpawnTimer = 0;
    }

    // ── spawn coins every ~100 frames ──
    s.coinSpawnTimer++;
    if (s.coinSpawnTimer >= 80 + Math.floor(Math.random() * 40)) {
      spawnCoin(s);
      s.coinSpawnTimer = 0;
    }

    // ── spawn nitro every ~500 frames ──
    s.nitroSpawnTimer++;
    if (s.nitroSpawnTimer >= 480 + Math.floor(Math.random() * 120)) {
      spawnNitroCan(s);
      s.nitroSpawnTimer = 0;
    }

    // ── move traffic ──
    s.cars.forEach(car => { car.y += car.speed + s.speed * 0.35; });
    s.cars = s.cars.filter(car => car.y < s.ch + 100);

    // ── move pickups ──
    s.coins.forEach(c => { c.y += s.speed * 0.8; });
    s.coins = s.coins.filter(c => c.y < s.ch + 30);
    s.nitroCans.forEach(n => { n.y += s.speed * 0.7; });
    s.nitroCans = s.nitroCans.filter(n => n.y < s.ch + 30);

    // ── player bounds ──
    const px = s.playerLane * s.laneW + s.laneW / 2;
    const py = s.playerY;
    const pw = s.playerW / 2;
    const ph = s.playerH / 2;

    // ── coin collection ──
    s.coins = s.coins.filter(c => {
      const dx = Math.abs(c.x - px);
      const dy = Math.abs(c.y - py);
      if (dx < pw + c.r && dy < ph + c.r) {
        s.score += 5 * s.combo;
        s.goodStreak++;
        s.nitroChargeCoins++;
        if (s.goodStreak >= 3) {
          s.combo = Math.min(8, s.combo + 1);
          setUiCombo(s.combo);
          flash(`${s.combo}× COMBO!`, 'td__flash--combo');
          playTone(660, 0.1, 'sine', 0.12);
        }
        if (s.nitroChargeCoins >= NITRO_CHARGE) {
          s.nitroChargeCoins = 0;
          setNitroReady(true);
          flash('NITRO READY! ⚡', 'td__flash--nitro');
        }
        spawnParticles(s, c.x, c.y, CLR.coin, 8);
        playTone(800, 0.06, 'triangle', 0.1);
        setUiScore(s.score);
        return false;
      }
      return true;
    });

    // ── nitro can collection ──
    s.nitroCans = s.nitroCans.filter(n => {
      const dx = Math.abs(n.x - px);
      const dy = Math.abs(n.y - py);
      if (dx < pw + n.r && dy < ph + n.r) {
        setNitroReady(true);
        flash('NITRO READY! ⚡', 'td__flash--nitro');
        playTone(880, 0.12, 'sine', 0.15);
        spawnParticles(s, n.x, n.y, CLR.nitro_can, 10);
        return false;
      }
      return true;
    });

    // ── collision detection ──
    if (!s.nitroActive) {
      for (const car of s.cars) {
        const cx = car.lane * s.laneW + s.laneW / 2;
        const hw = s.laneW * 0.46;
        const hh = s.laneW * 0.7;
        const dx = Math.abs(cx - px);
        const dy = Math.abs(car.y - py);
        if (dx < pw + hw - 6 && dy < ph + hh - 8) {
          // CRASH!
          spawnParticles(s, px, py, CLR.player, 20);
          spawnParticles(s, cx, car.y, car.color, 16);
          playTone(120, 0.5, 'sawtooth', 0.25);
          triggerHapticVibration([200, 80, 200]);
          // save high score
          if (s.score > s.highScore) {
            localStorage.setItem('td_hs', String(s.score));
            setUiHighScore(s.score);
          }
          setUiScore(s.score);
          setGamePhase('over');
          return; // stop loop
        }

        // near-miss: different lane but very close
        if (car.lane !== s.playerLane) {
          const laneGap = Math.abs(car.lane - s.playerLane);
          if (laneGap === 1 && dy < ph + hh && Math.abs(car.y - py) < 30) {
            if (!car._nearMiss) {
              car._nearMiss = true;
              s.score += 15 * s.combo;
              s.goodStreak++;
              setUiScore(s.score);
              flash('NEAR MISS!', 'td__flash--miss');
              playTone(440, 0.07, 'triangle', 0.08);
              triggerHapticVibration([30]);
            }
          }
        }
      }
    }

    // ── update speed UI ──
    const spd = Math.min(100, Math.round(((s.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 100));
    setUiSpeedPct(spd);

    draw(s, ctx);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, flash]);

  /* ── start / restart ── */
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;

    setUiScore(0);
    setUiCombo(1);
    setUiSpeedPct(0);
    setNitroReady(false);
    setFlashMsg(null);

    stateRef.current = initState(cw, ch);
    setGamePhase('playing');
  }, [initState]);

  /* ── pause / resume ── */
  const togglePause = useCallback(() => {
    setGamePhase(p => p === 'playing' ? 'paused' : 'playing');
  }, []);

  /* ── game loop effect ── */
  useEffect(() => {
    if (gamePhase === 'playing') {
      rafRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [gamePhase, gameLoop]);

  /* ── canvas sizing ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  /* ── keyboard controls ── */
  useEffect(() => {
    const onKey = (e) => {
      if ([' ', 'ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) e.preventDefault();

      if (e.key === ' ') {
        if (gamePhase === 'playing' || gamePhase === 'paused') togglePause();
        return;
      }
      if (gamePhase !== 'playing') return;

      const s = stateRef.current;
      if (!s) return;

      if ((e.key === 'ArrowLeft' || e.key === 'a') && s.playerLane > 0) {
        s.playerLane--;
        triggerHapticVibration([15]);
      } else if ((e.key === 'ArrowRight' || e.key === 'd') && s.playerLane < LANES - 1) {
        s.playerLane++;
        triggerHapticVibration([15]);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'n') {
        activateNitro();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gamePhase, togglePause]);

  /* ── touch swipe ── */
  const touchStartX = useRef(null);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (gamePhase !== 'playing') return;
    const s = stateRef.current;
    if (!s) return;
    if (dx < -30 && s.playerLane > 0)            { s.playerLane--; triggerHapticVibration([15]); }
    else if (dx > 30 && s.playerLane < LANES - 1) { s.playerLane++; triggerHapticVibration([15]); }
  };

  /* ── lane change buttons ── */
  const changeLane = (dir) => {
    if (gamePhase !== 'playing') return;
    const s = stateRef.current;
    if (!s) return;
    if (dir === -1 && s.playerLane > 0)            { s.playerLane--; triggerHapticVibration([15]); }
    if (dir === 1  && s.playerLane < LANES - 1)    { s.playerLane++; triggerHapticVibration([15]); }
  };

  /* ── nitro activate ── */
  const activateNitro = useCallback(() => {
    const s = stateRef.current;
    if (!s || !nitroReady || s.nitroActive) return;
    s.nitroActive = true;
    s.nitroTimer = NITRO_DURATION;
    setNitroReady(false);
    triggerHapticVibration([60, 30, 60]);
    playTone(1200, 0.15, 'sine', 0.18);
    flash('NITRO!!! 🚀', 'td__flash--nitro');
  }, [nitroReady, flash]);

  const highScore = parseInt(localStorage.getItem('td_hs') || '0', 10);

  return (
    <div className="td">
      {/* ── Top Stats ── */}
      <div className="td__topbar">
        <div className="td__stats">
          <div className="td__stat">
            <span className="td__stat-label">Score</span>
            <span className="td__stat-val">{uiScore}</span>
          </div>
          <div className="td__stat td__stat--hi">
            <span className="td__stat-label">Best</span>
            <span className="td__stat-val">{Math.max(uiHighScore, highScore)}</span>
          </div>
          <div className="td__stat td__stat--combo">
            <span className="td__stat-label">Combo</span>
            <span className="td__stat-val">{uiCombo}×</span>
          </div>
        </div>

        <div className="td__speed-bar">
          <span className="td__speed-label">Speed</span>
          <div className="td__speed-track">
            <div className="td__speed-fill" style={{ width: `${uiSpeedPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Game Canvas ── */}
      <div
        className="td__screen-wrap"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} className="td__canvas" />

        {/* Flash notifications */}
        {flashMsg && (
          <div key={flashMsg.key} className={`td__flash ${flashMsg.cls}`}>
            {flashMsg.text}
          </div>
        )}

        {/* Ready overlay */}
        {gamePhase === 'ready' && (
          <div className="td__overlay">
            <div className="td__overlay-icon">🚗</div>
            <h3 className="td__overlay-title">Turbo Drift</h3>
            <p className="td__overlay-sub">
              Weave through traffic on a neon highway.<br />
              Grab coins, pull near-misses, blast nitro.
            </p>
            <button className="td__start-btn" onClick={startGame}>
              ▶ START
            </button>
          </div>
        )}

        {/* Paused overlay */}
        {gamePhase === 'paused' && (
          <div className="td__overlay">
            <div className="td__overlay-icon">⏸️</div>
            <h3 className="td__overlay-title">Paused</h3>
            <button className="td__start-btn" onClick={togglePause}>
              ▶ RESUME
            </button>
          </div>
        )}

        {/* Game Over overlay */}
        {gamePhase === 'over' && (
          <div className="td__overlay">
            <div className="td__overlay-icon">💥</div>
            <h3 className="td__overlay-title">Wrecked!</h3>
            <div className="td__overlay-score">
              SCORE<strong>{uiScore}</strong>
            </div>
            {uiScore > 0 && uiScore >= Math.max(uiHighScore, highScore) && (
              <span className="td__new-record">🏆 New High Score!</span>
            )}
            <button className="td__start-btn" onClick={startGame}>
              ↺ PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* ── Lane Controls ── */}
      {(gamePhase === 'playing' || gamePhase === 'paused') && (
        <div className="td__controls">
          <button
            className="td__lane-btn"
            onPointerDown={() => changeLane(-1)}
            aria-label="Move left"
          >
            ◀
          </button>
          <button
            className="td__pause-btn"
            onPointerDown={togglePause}
            aria-label="Pause"
          >
            {gamePhase === 'playing' ? '⏸' : '▶'}
          </button>
          <button
            className="td__lane-btn"
            onPointerDown={() => changeLane(1)}
            aria-label="Move right"
          >
            ▶
          </button>
        </div>
      )}

      {/* ── Nitro Button ── */}
      {(gamePhase === 'playing' || gamePhase === 'paused') && (
        <div className="td__nitro-row">
          <button
            className={`td__nitro-btn ${nitroReady ? 'td__nitro-btn--ready' : ''}`}
            onPointerDown={activateNitro}
            disabled={!nitroReady}
            aria-label="Activate nitro boost"
          >
            ⚡ NITRO BOOST
          </button>
        </div>
      )}
    </div>
  );
}

export default TurboDrift;
