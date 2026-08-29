import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  RefreshIcon, 
  TrophyIcon, 
  SparklesIcon, 
  BookOpenIcon, 
  XIcon 
} from '../Icons.jsx';
import { triggerHapticVibration, unlockAudioContext } from '../../../utils/mobilePush';
import './CampusRush.css';

// Audio Synthesizer helper using Web Audio API
function playSound(freq, duration = 0.08, type = 'sine', gainVal = 0.12, slideFreq = null) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore audio policy
  }
}

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 380;
const GROUND_Y = 290;
const GRAVITY = 0.68;
const JUMP_FORCE = -12.8;
const DOUBLE_JUMP_FORCE = -11.2;

const SNACK_TYPES = [
  { id: 'chai', emoji: '☕', name: 'Java Chai', pts: 15, color: '#f59e0b' },
  { id: 'samosa', emoji: '🥟', name: 'Hot Samosa', pts: 25, color: '#ea580c' },
  { id: 'attendance', emoji: '💯', name: 'Attendance Badge', pts: 50, color: '#10b981' },
  { id: 'shield', emoji: '🛡️', name: 'Proxy Shield', pts: 30, isShield: true, color: '#6366f1' },
];

const OBSTACLES = [
  { id: 'barrier', label: 'Boom Barrier', emoji: '🚧', width: 30, height: 46, yOffset: 0 },
  { id: 'proctor', label: 'Strict Proctor', emoji: '👨‍🏫', width: 34, height: 54, yOffset: 0, quote: 'ID Card?!' },
  { id: 'freshers', label: 'Freshers Crowd', emoji: '🚶‍♂️', width: 36, height: 48, yOffset: 0 },
  { id: 'assignment', label: 'Assignment Deadline', emoji: '📚', width: 28, height: 42, yOffset: 0 },
];

const TUTORIAL_PAGES = [
  {
    id: 'controls',
    title: 'Game Controls & Acrobatics',
    emoji: '🎮',
    badge: 'Guide 1 of 3: How to Move',
    items: [
      {
        icon: '🦘',
        title: 'Single Jump',
        keys: 'SPACE / W / Tap Game Screen',
        desc: 'Jump over proctors, freshers, and barriers on the walkway.',
        color: '#fbbf24',
      },
      {
        icon: '🚀',
        title: 'Double Jump',
        keys: 'Tap or Press Again Mid-Air',
        desc: 'Air-flip higher to grab floating canteen snacks and clear tall hurdles.',
        color: '#f59e0b',
      },
      {
        icon: '🏃',
        title: 'Slide & Duck',
        keys: 'Hold S / Hold SLIDE Button',
        desc: 'Duck low under high obstacles and rapid deadline hurdles.',
        color: '#38bdf8',
      },
    ],
    tip: '💡 Tip: You can tap anywhere directly on the game screen to jump instantly!',
  },
  {
    id: 'snacks',
    title: 'Canteen Snacks & Power-ups',
    emoji: '☕',
    badge: 'Guide 2 of 3: Boosts & Scores',
    items: [
      {
        icon: '☕',
        title: 'Java Chai (+15 Pts)',
        keys: 'Stamina Boost',
        desc: 'Fresh cutting chai from SRM Java canteen for a quick stamina surge.',
        color: '#f59e0b',
      },
      {
        icon: '🥟',
        title: 'Hot Samosa (+25 Pts)',
        keys: 'Score Booster',
        desc: 'Crispy campus canteen snack for high sprint points.',
        color: '#ea580c',
      },
      {
        icon: '💯',
        title: '100% Attendance Badge (+50 Pts)',
        keys: 'Dean List Honor',
        desc: 'Major score bonus for true attendance champions.',
        color: '#10b981',
      },
      {
        icon: '🛡️',
        title: 'Proxy Shield (5s Invulnerability)',
        keys: '+30 Pts & 1 Free Hit',
        desc: 'Neon energy aura that absorbs 1 obstacle hit safely without losing!',
        color: '#818cf8',
      },
    ],
    tip: '💡 Tip: Grab the Proxy Shield to safely smash through proctors without ending your run!',
  },
  {
    id: 'hazards',
    title: 'Campus Hazards & Final Ranks',
    emoji: '🚧',
    badge: 'Guide 3 of 3: Hazards & Ranks',
    items: [
      {
        icon: '🚧',
        title: 'Boom Barrier (Main Gate)',
        keys: 'Ground Barrier',
        desc: 'Jump over the barrier before it clips your sprint.',
        color: '#f87171',
      },
      {
        icon: '👨‍🏫',
        title: 'Strict Proctor (ID Check)',
        keys: 'Demands ID Card',
        desc: 'Jump over or activate a Proxy Shield to bypass safely.',
        color: '#f87171',
      },
      {
        icon: '🚶‍♂️',
        title: 'Freshers Crowd (Java Walkway)',
        keys: 'Morning Crowd',
        desc: 'Clear the busy morning walkway with a double jump.',
        color: '#f87171',
      },
      {
        icon: '📚',
        title: 'Assignment Deadline Stack',
        keys: 'Heavy Deadline',
        desc: 'Jump clean over assignment piles on the road.',
        color: '#f87171',
      },
    ],
    ranks: [
      { pts: '400+ Pts', name: 'Tech Park Legend', emoji: '🏆' },
      { pts: '250+ Pts', name: 'Attendance Saver (75.1%)', emoji: '⚡' },
      { pts: '120+ Pts', name: 'Backbencher Sprinter', emoji: '🏃' },
      { pts: '<120 Pts', name: 'Late Comer (Detained)', emoji: '😴' },
    ],
    tip: '💡 Tip: Reach 400+ points to earn the prestigious Tech Park Legend title!',
  },
];

export function CampusRush() {
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0); // in meters
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('ledger_campusrush_highscore') || '0', 10);
  });
  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'paused' | 'gameover'
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0);
  const [difficulty, setDifficulty] = useState('normal'); // 'chill' | 'normal' | 'rush'
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); // 0: Controls, 1: Power-ups, 2: Hazards & Ranks

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Player physics state
  const playerRef = useRef({
    x: 80,
    y: GROUND_Y - 50,
    width: 34,
    height: 50,
    vy: 0,
    isGrounded: true,
    jumpCount: 0,
    isSliding: false,
    slideTimer: 0,
    runFrame: 0,
    shieldUntil: 0,
  });

  // Game world objects
  const worldRef = useRef({
    speed: 5.2,
    baseSpeed: 5.2,
    distanceRun: 0,
    obstacles: [],
    snacks: [],
    particles: [],
    bgOffset: 0,
    nextObstacleDist: 100,
    nextSnackDist: 45,
  });

  // Helper to spawn obstacles
  const spawnObstacle = useCallback((world) => {
    const obsType = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
    world.obstacles.push({
      x: CANVAS_WIDTH + 20,
      y: GROUND_Y - obsType.height,
      width: obsType.width,
      height: obsType.height,
      type: obsType,
      passed: false,
    });
  }, []);

  // Helper to spawn snacks / powerups
  const spawnSnack = useCallback((world) => {
    const rand = Math.random();
    let snackType;
    if (rand < 0.5) snackType = SNACK_TYPES[0]; // 50% Chai
    else if (rand < 0.8) snackType = SNACK_TYPES[1]; // 30% Samosa
    else if (rand < 0.93) snackType = SNACK_TYPES[2]; // 13% Attendance 100%
    else snackType = SNACK_TYPES[3]; // 7% Proxy Shield

    // Spawn at jump height or ground height
    const isAirborne = Math.random() > 0.45;
    const yPos = isAirborne ? GROUND_Y - 95 - Math.random() * 40 : GROUND_Y - 45;

    world.snacks.push({
      x: CANVAS_WIDTH + 20,
      y: yPos,
      size: 24,
      type: snackType,
      collected: false,
      floatOffset: Math.random() * Math.PI,
    });
  }, []);

  // Spawn particle explosions
  const addParticles = useCallback((x, y, color, count = 8) => {
    const world = worldRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      world.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        life: 25 + Math.random() * 15,
      });
    }
  }, []);

  // Action: Jump
  const handleJump = useCallback(() => {
    unlockAudioContext();
    if (gameState !== 'playing') {
      if (gameState === 'ready' || gameState === 'gameover') {
        startGame();
      }
      return;
    }

    const p = playerRef.current;
    if (p.isGrounded) {
      p.vy = JUMP_FORCE;
      p.isGrounded = false;
      p.jumpCount = 1;
      p.isSliding = false;
      playSound(320, 0.1, 'sine', 0.12, 600);
      triggerHapticVibration([20]);
    } else if (p.jumpCount === 1) {
      p.vy = DOUBLE_JUMP_FORCE;
      p.jumpCount = 2;
      addParticles(p.x + p.width / 2, p.y + p.height, '#fbbf24', 6);
      playSound(480, 0.12, 'sine', 0.14, 880);
      triggerHapticVibration([35]);
    }
  }, [gameState]);

  // Action: Slide
  const handleSlide = useCallback((active) => {
    unlockAudioContext();
    if (gameState !== 'playing') return;
    const p = playerRef.current;
    if (p.isGrounded) {
      p.isSliding = active;
      if (active) {
        playSound(220, 0.08, 'triangle', 0.08);
        triggerHapticVibration([15]);
      }
    }
  }, [gameState]);

  // Start / Reset Game
  const startGame = useCallback(() => {
    unlockAudioContext();
    const speedMap = { chill: 4.4, normal: 5.5, rush: 6.8 };
    const baseSpd = speedMap[difficulty] || 5.5;

    playerRef.current = {
      x: 80,
      y: GROUND_Y - 50,
      width: 34,
      height: 50,
      vy: 0,
      isGrounded: true,
      jumpCount: 0,
      isSliding: false,
      slideTimer: 0,
      runFrame: 0,
      shieldUntil: 0,
    };

    worldRef.current = {
      speed: baseSpd,
      baseSpeed: baseSpd,
      distanceRun: 0,
      obstacles: [],
      snacks: [],
      particles: [],
      bgOffset: 0,
      nextObstacleDist: 80,
      nextSnackDist: 35,
    };

    setScore(0);
    setDistance(0);
    setShieldActive(false);
    setShieldTimeLeft(0);
    setGameState('playing');
    playSound(440, 0.1, 'sine', 0.15, 880);
  }, [difficulty]);

  // Main Game Loop Engine
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 16.66, 2); // normalize to ~60fps
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const p = playerRef.current;
      const world = worldRef.current;

      // Update shield status
      const now = Date.now();
      const hasShield = p.shieldUntil > now;
      setShieldActive(hasShield);
      if (hasShield) {
        setShieldTimeLeft(Math.ceil((p.shieldUntil - now) / 1000));
      }

      // Update world distance & speed scaling
      world.distanceRun += (world.speed * dt) / 10;
      setDistance(Math.floor(world.distanceRun));
      world.bgOffset = (world.bgOffset + world.speed * 0.4 * dt) % CANVAS_WIDTH;

      // Slowly increase speed as you sprint further
      world.speed = world.baseSpeed + Math.min(world.distanceRun / 180, 3.5);

      // Player Physics
      if (!p.isGrounded) {
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y >= GROUND_Y - p.height) {
          p.y = GROUND_Y - p.height;
          p.vy = 0;
          p.isGrounded = true;
          p.jumpCount = 0;
        }
      }

      // Running animation frame counter
      p.runFrame += dt * 0.25 * (world.speed / 4);

      // Spawning Obstacles
      world.nextObstacleDist -= world.speed * dt;
      if (world.nextObstacleDist <= 0) {
        spawnObstacle(world);
        // Random spacing between obstacles (130 to 240px)
        world.nextObstacleDist = 130 + Math.random() * 110 - (world.speed * 4);
      }

      // Spawning Snacks
      world.nextSnackDist -= world.speed * dt;
      if (world.nextSnackDist <= 0) {
        spawnSnack(world);
        world.nextSnackDist = 65 + Math.random() * 75;
      }

      // Update Obstacles & Collision Check
      for (let i = world.obstacles.length - 1; i >= 0; i--) {
        const obs = world.obstacles[i];
        obs.x -= world.speed * dt;

        // Player hitbox
        const pLeft = p.x + 4;
        const pRight = p.x + p.width - 4;
        const pTop = p.isSliding ? p.y + p.height / 2 : p.y + 4;
        const pBottom = p.y + p.height;

        // Obstacle hitbox
        const oLeft = obs.x + 4;
        const oRight = obs.x + obs.width - 4;
        const oTop = obs.y + 4;
        const oBottom = obs.y + obs.height;

        // Overlap test
        if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
          if (hasShield) {
            // Shield destroys obstacle
            addParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#818cf8', 12);
            playSound(600, 0.15, 'triangle', 0.2, 200);
            triggerHapticVibration([40, 30, 40]);
            world.obstacles.splice(i, 1);
            continue;
          } else {
            // Crash! Game Over
            setGameState('gameover');
            playSound(150, 0.4, 'sawtooth', 0.25, 60);
            triggerHapticVibration([300, 100, 300]);
            addParticles(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 16);
            return;
          }
        }

        // Score bonus for jumping over
        if (!obs.passed && obs.x < p.x) {
          obs.passed = true;
          setScore((prev) => {
            const next = prev + 5;
            if (next > highScore) {
              setHighScore(next);
              localStorage.setItem('ledger_campusrush_highscore', String(next));
            }
            return next;
          });
        }

        // Clean up offscreen
        if (obs.x < -60) {
          world.obstacles.splice(i, 1);
        }
      }

      // Update Snacks & Pickup Check
      for (let i = world.snacks.length - 1; i >= 0; i--) {
        const snk = world.snacks[i];
        snk.x -= world.speed * dt;
        snk.floatOffset += 0.08 * dt;

        const pCx = p.x + p.width / 2;
        const pCy = p.y + p.height / 2;
        const sCx = snk.x + snk.size / 2;
        const sCy = snk.y + Math.sin(snk.floatOffset) * 4;

        const dist = Math.hypot(pCx - sCx, pCy - sCy);
        if (dist < 34) {
          // Collect snack!
          const pts = snk.type.pts;
          if (snk.type.isShield) {
            p.shieldUntil = Date.now() + 6500; // 6.5s shield
            playSound(700, 0.25, 'sine', 0.2, 1200);
            triggerHapticVibration([50, 50, 80]);
          } else {
            playSound(snk.type.pts >= 50 ? 980 : 580, 0.1, 'sine', 0.16, 1200);
            triggerHapticVibration([30]);
          }

          addParticles(sCx, sCy, snk.type.color, 10);
          setScore((prev) => {
            const next = prev + pts;
            if (next > highScore) {
              setHighScore(next);
              localStorage.setItem('ledger_campusrush_highscore', String(next));
            }
            return next;
          });

          world.snacks.splice(i, 1);
          continue;
        }

        if (snk.x < -40) {
          world.snacks.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = world.particles.length - 1; i >= 0; i--) {
        const pt = world.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 0.15 * dt;
        pt.alpha -= 0.03 * dt;
        if (pt.alpha <= 0) {
          world.particles.splice(i, 1);
        }
      }

      // ================= DRAW CANVAS =================
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Sky Gradient & Morning Sun
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, '#0b1120');
      skyGrad.addColorStop(0.65, '#1e293b');
      skyGrad.addColorStop(1, '#334155');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Morning Sun behind Tech Park
      ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 140, 90, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 140, 90, 26, 0, Math.PI * 2);
      ctx.fill();

      // 2. Parallax Campus Skyline: SRM UB Building & Tech Park Silhouettes
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      const bgX = -world.bgOffset * 0.3;
      for (let i = 0; i < 3; i++) {
        const offset = bgX + i * 440;
        // UB Tower
        ctx.fillRect(offset + 30, GROUND_Y - 140, 50, 140);
        ctx.fillRect(offset + 48, GROUND_Y - 170, 16, 30);
        // Clock circle
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(offset + 55, GROUND_Y - 120, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';

        // Tech Park block
        ctx.fillRect(offset + 130, GROUND_Y - 190, 90, 190);
        ctx.fillRect(offset + 240, GROUND_Y - 110, 55, 110);
        // Java Canteen Awning
        ctx.fillRect(offset + 315, GROUND_Y - 80, 80, 80);
      }

      // 3. Campus Palm Trees & Streetlamps
      ctx.fillStyle = '#1e293b';
      const fgTreeX = -world.bgOffset * 0.7;
      for (let i = 0; i < 4; i++) {
        const offset = fgTreeX + i * 240;
        // Palm trunk
        ctx.fillRect(offset + 80, GROUND_Y - 90, 4.5, 90);
        // Palm leaves
        ctx.beginPath();
        ctx.arc(offset + 82, GROUND_Y - 90, 22, 0, Math.PI);
        ctx.fill();
      }

      // 4. Ground Walkway & Tiled Track
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // High-contrast neon track line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Walking tiles stripe
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      const tileOffset = world.bgOffset % 32;
      for (let x = -tileOffset; x < CANVAS_WIDTH; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x - 22, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // 5. Draw Snacks / Powerups
      world.snacks.forEach((snk) => {
        const floatY = snk.y + Math.sin(snk.floatOffset) * 4;
        // Glow aura
        ctx.fillStyle = snk.type.color + '33';
        ctx.beginPath();
        ctx.arc(snk.x + snk.size / 2, floatY + snk.size / 2, snk.size * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(snk.type.emoji, snk.x + snk.size / 2, floatY + snk.size / 2);
      });

      // 6. Draw Obstacles
      world.obstacles.forEach((obs) => {
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(obs.type.emoji, obs.x + obs.width / 2, obs.y + obs.height);

        // Proctor speech bubble if it's the proctor
        if (obs.type.quote && obs.x < CANVAS_WIDTH - 60 && obs.x > 40) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(obs.x - 24, obs.y - 30, 72, 20, 5);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 9.5px sans-serif';
          ctx.fillText(obs.type.quote, obs.x + 12, obs.y - 16);
        }
      });

      // 7. Draw Player (Student Sprinting)
      const isSliding = p.isSliding && p.isGrounded;
      const curHeight = isSliding ? p.height / 2 : p.height;
      const curY = isSliding ? p.y + p.height / 2 : p.y;

      // Shield Bubble Aura
      if (hasShield) {
        ctx.save();
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, curY + curHeight / 2, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Draw Student Runner Sprite
      ctx.save();
      ctx.fillStyle = '#fbbf24'; // Yellow hoodie
      if (isSliding) {
        // Slide pose
        ctx.fillRect(p.x - 6, curY + 6, p.width + 14, curHeight - 6);
        // Head
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(p.x + p.width + 5, curY + curHeight / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Upright running pose
        // Legs cycling
        const legPhase = Math.sin(p.runFrame);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        // Front leg
        ctx.moveTo(p.x + 12, curY + 30);
        ctx.lineTo(p.x + 12 + legPhase * 14, curY + curHeight);
        // Back leg
        ctx.moveTo(p.x + 22, curY + 30);
        ctx.lineTo(p.x + 22 - legPhase * 14, curY + curHeight);
        ctx.stroke();

        // Torso / Hoodie
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.roundRect(p.x + 6, curY + 13, 22, 20, 5);
        ctx.fill();

        // Backpack on back
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(p.x - 3, curY + 15, 9, 16);

        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(p.x + 17, curY + 7, 8, 0, Math.PI * 2);
        ctx.fill();

        // Hair / Cap
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(p.x + 17, curY + 5, 8, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();

      // 8. Draw Particles
      world.particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameState, highScore, addParticles, spawnObstacle, spawnSnack]);

  // Keyboard controls listener (Space / Up to Jump, Down to Slide)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        handleJump();
      } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        handleSlide(true);
      } else if (e.key === 'p' || e.key === 'P') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e) => {
      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        handleSlide(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleJump, handleSlide, gameState]);

  // Compute Rank Title based on score
  const getRank = (sc) => {
    if (sc >= 400) return { title: '🏆 Tech Park Legend (100% Attendance)', tone: 'good' };
    if (sc >= 250) return { title: '⚡ Attendance Saver (75.1% Safe!)', tone: 'good' };
    if (sc >= 120) return { title: '🏃 Backbencher Sprinter', tone: 'warning' };
    return { title: '😴 Late Comer (Detained at Java)', tone: 'danger' };
  };

  const rank = getRank(score);

  return (
    <div className="campus-rush">
      {/* Game HUD Bar */}
      <div className="campus-rush__topbar">
        <div className="campus-rush__stats">
          <div className="campus-rush__stat-pill">
            <span className="campus-rush__stat-label">SCORE</span>
            <span className="campus-rush__stat-val num">{score}</span>
          </div>

          <div className="campus-rush__stat-pill">
            <span className="campus-rush__stat-label">SPRINTED</span>
            <span className="campus-rush__stat-val num">{distance}m</span>
          </div>

          <div className="campus-rush__stat-pill campus-rush__stat-pill--high">
            <TrophyIcon width={14} height={14} />
            <span className="campus-rush__stat-label">BEST</span>
            <span className="campus-rush__stat-val num">{highScore}</span>
          </div>
        </div>

        {shieldActive && (
          <div className="campus-rush__shield-badge bchip bchip--good animate-pulse">
            🛡️ Proxy Shield: {shieldTimeLeft}s
          </div>
        )}

        <div className="campus-rush__topbar-actions">
          <button
            className="bbtn bbtn--xs bbtn--outline campus-rush__tutorial-btn"
            onClick={() => {
              setTutorialStep(0);
              setShowTutorial(true);
            }}
            title="Learn how to play, controls, power-ups and ranks"
          >
            <BookOpenIcon width={13} height={13} />
            <span>How to Play</span>
          </button>

          <div className="campus-rush__difficulty-group">
            <button
              className={`bbtn bbtn--xs ${difficulty === 'chill' ? 'bbtn--active' : 'bbtn--outline'}`}
              onClick={() => setDifficulty('chill')}
              disabled={gameState === 'playing'}
            >
              Chill
            </button>
            <button
              className={`bbtn bbtn--xs ${difficulty === 'normal' ? 'bbtn--active' : 'bbtn--outline'}`}
              onClick={() => setDifficulty('normal')}
              disabled={gameState === 'playing'}
            >
              Normal
            </button>
            <button
              className={`bbtn bbtn--xs ${difficulty === 'rush' ? 'bbtn--active' : 'bbtn--outline'}`}
              onClick={() => setDifficulty('rush')}
              disabled={gameState === 'playing'}
            >
              Rush ⚡
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Stage (One-Tap Jump anywhere) */}
      <div className="campus-rush__stage-wrap" onClick={handleJump}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="campus-rush__canvas"
        />

        {/* Ready Overlay */}
        {gameState === 'ready' && !showTutorial && (
          <div className="campus-rush__overlay" onClick={(e) => e.stopPropagation()}>
            <span className="campus-rush__overlay-emoji">🏃‍♂️💨</span>
            <h3 className="campus-rush__overlay-title">Campus Rush: 8 AM Sprint</h3>
            <p className="campus-rush__overlay-desc">
              It is 7:58 AM! Sprint across the walkway to Tech Park before 8:00 AM. 
              Jump over proctors, barriers, and assignment piles to save your attendance!
            </p>

            {/* Quick Preview Chips (No Arrow Symbols) */}
            <div className="campus-rush__ready-quick-tips">
              <span className="campus-rush__quick-chip">Jump: Space / Tap</span>
              <span className="campus-rush__quick-chip">Double Jump: Mid-air</span>
              <span className="campus-rush__quick-chip">Slide: S / Hold</span>
              <span className="campus-rush__quick-chip">Proxy Shield: Invulnerable</span>
            </div>

            <div className="campus-rush__ready-btn-group">
              <button className="bbtn bbtn--good campus-rush__start-btn" onClick={startGame}>
                <PlayIcon width={18} height={18} />
                <span>START SPRINT (TAP ANYWHERE)</span>
              </button>
              <button 
                className="bbtn bbtn--outline campus-rush__how-to-play-btn"
                onClick={() => {
                  setTutorialStep(0);
                  setShowTutorial(true);
                }}
              >
                <BookOpenIcon width={16} height={16} />
                <span>HOW TO PLAY (TUTORIAL)</span>
              </button>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && !showTutorial && (
          <div className="campus-rush__overlay" onClick={(e) => e.stopPropagation()}>
            <span className="campus-rush__overlay-emoji">⏸️</span>
            <h3 className="campus-rush__overlay-title">Sprint Paused</h3>
            <div className="campus-rush__ready-btn-group">
              <button className="bbtn bbtn--good campus-rush__start-btn" onClick={() => setGameState('playing')}>
                <PlayIcon width={18} height={18} />
                <span>RESUME SPRINT</span>
              </button>
              <button 
                className="bbtn bbtn--outline campus-rush__how-to-play-btn"
                onClick={() => {
                  setTutorialStep(0);
                  setShowTutorial(true);
                }}
              >
                <BookOpenIcon width={16} height={16} />
                <span>VIEW HOW TO PLAY</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && !showTutorial && (
          <div className="campus-rush__overlay" onClick={(e) => e.stopPropagation()}>
            <span className="campus-rush__overlay-emoji">💥</span>
            <h3 className="campus-rush__overlay-title">Caught by Proctor!</h3>
            <div className="campus-rush__overlay-stats">
              <span className="num">Score: <strong>{score}</strong></span>
              <span className="num">Distance: <strong>{distance}m</strong></span>
            </div>
            <div className={`bchip bchip--${rank.tone} campus-rush__rank-badge`}>
              {rank.title}
            </div>
            {score >= highScore && score > 0 && (
              <span className="bchip bchip--good campus-rush__new-record">🎉 NEW CAMPUS RECORD!</span>
            )}
            <div className="campus-rush__ready-btn-group">
              <button className="bbtn bbtn--good campus-rush__start-btn" onClick={startGame}>
                <RefreshIcon width={18} height={18} />
                <span>SPRINT AGAIN</span>
              </button>
              <button 
                className="bbtn bbtn--outline campus-rush__how-to-play-btn"
                onClick={() => {
                  setTutorialStep(0);
                  setShowTutorial(true);
                }}
              >
                <BookOpenIcon width={16} height={16} />
                <span>HOW TO PLAY</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile One-Touch Tactile Action Controls (No Arrow Symbols) */}
      <div className="campus-rush__controls-bar">
        <div className="campus-rush__mobile-btns">
          <button
            className="campus-rush__action-btn campus-rush__action-btn--slide"
            onTouchStart={(e) => { e.preventDefault(); handleSlide(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleSlide(false); }}
            onMouseDown={() => handleSlide(true)}
            onMouseUp={() => handleSlide(false)}
          >
            <span>SLIDE (DUCK)</span>
          </button>

          <button
            className="campus-rush__action-btn campus-rush__action-btn--jump"
            onClick={(e) => { e.stopPropagation(); handleJump(); }}
          >
            <span>JUMP / AIR-FLIP</span>
          </button>
        </div>

        {/* Legend / Items guide */}
        <div className="campus-rush__snack-legend">
          <span className="campus-rush__legend-item">☕ Chai (+15)</span>
          <span className="campus-rush__legend-item">🥟 Samosa (+25)</span>
          <span className="campus-rush__legend-item">🛡️ Proxy Shield</span>
          <span className="campus-rush__legend-item">💯 100% Badge (+50)</span>
        </div>
      </div>

      {/* Full Tutorial Modal Dialog (Outside canvas so all text and cards are 100% visible, large, and scrollable) */}
      {showTutorial && (
        <div className="campus-rush__tutorial-modal-backdrop" onClick={() => setShowTutorial(false)}>
          <div className="campus-rush__tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="campus-rush__tutorial-modal-header">
              <div className="campus-rush__tutorial-title-wrap">
                <span className="campus-rush__tutorial-icon">{TUTORIAL_PAGES[tutorialStep].emoji}</span>
                <div className="campus-rush__tutorial-headings">
                  <span className="campus-rush__tutorial-badge">{TUTORIAL_PAGES[tutorialStep].badge}</span>
                  <h3 className="campus-rush__tutorial-title">{TUTORIAL_PAGES[tutorialStep].title}</h3>
                </div>
              </div>
              <button 
                className="campus-rush__tutorial-close-btn"
                onClick={() => setShowTutorial(false)}
                aria-label="Close tutorial"
                title="Close tutorial"
              >
                <XIcon width={20} height={20} />
              </button>
            </div>

            {/* Direct Step Category Switchers (Large & Clear, No Arrows) */}
            <div className="campus-rush__tutorial-tabs">
              {TUTORIAL_PAGES.map((page, idx) => (
                <button
                  key={page.id}
                  className={`campus-rush__tutorial-tab ${tutorialStep === idx ? 'campus-rush__tutorial-tab--active' : ''}`}
                  onClick={() => setTutorialStep(idx)}
                >
                  <span className="campus-rush__tutorial-tab-emoji">{page.emoji}</span>
                  <span className="campus-rush__tutorial-tab-text">
                    {idx + 1}. {page.id === 'controls' ? 'Controls' : page.id === 'snacks' ? 'Snacks & Shield' : 'Hazards & Ranks'}
                  </span>
                </button>
              ))}
            </div>

            {/* Tutorial Cards & Explanations (High Contrast, Large Legible Typography) */}
            <div className="campus-rush__tutorial-modal-body">
              <div className="campus-rush__tutorial-grid">
                {TUTORIAL_PAGES[tutorialStep].items.map((item, idx) => (
                  <div key={idx} className="campus-rush__tutorial-card">
                    <div className="campus-rush__tutorial-card-top">
                      <span className="campus-rush__tutorial-card-emoji">{item.icon}</span>
                      <div className="campus-rush__tutorial-card-info">
                        <strong className="campus-rush__tutorial-card-title">{item.title}</strong>
                        {item.keys && (
                          <span className="campus-rush__tutorial-card-keys">{item.keys}</span>
                        )}
                      </div>
                    </div>
                    <p className="campus-rush__tutorial-card-desc">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Ranks list for step 3 */}
              {TUTORIAL_PAGES[tutorialStep].ranks && (
                <div className="campus-rush__tutorial-ranks">
                  <div className="campus-rush__tutorial-ranks-title">Target Score Milestones &amp; Ranks:</div>
                  <div className="campus-rush__tutorial-ranks-list">
                    {TUTORIAL_PAGES[tutorialStep].ranks.map((r, i) => (
                      <span key={i} className="campus-rush__tutorial-rank-pill">
                        {r.emoji} <strong>{r.pts}</strong> — {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tip Box */}
              <div className="campus-rush__tutorial-tip">
                {TUTORIAL_PAGES[tutorialStep].tip}
              </div>
            </div>

            {/* Tutorial Footer */}
            <div className="campus-rush__tutorial-modal-footer">
              <button
                className="bbtn bbtn--outline campus-rush__tutorial-dismiss-btn"
                onClick={() => setShowTutorial(false)}
              >
                Close Guide
              </button>

              <button
                className="bbtn bbtn--good campus-rush__tutorial-start-btn"
                onClick={() => {
                  setShowTutorial(false);
                  startGame();
                }}
              >
                <PlayIcon width={16} height={16} />
                <span>START SPRINT NOW</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampusRush;
