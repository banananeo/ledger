import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayIcon, PauseIcon, RefreshIcon, TrophyIcon, SparklesIcon } from '../Icons.jsx';
import { triggerHapticVibration, unlockAudioContext } from '../../../utils/mobilePush';
import './RetroSnake.css';

const GRID_SIZE = 20; // 20x20 cells
const CELL_SIZE = 15; // 300x300 canvas

const FOOD_TYPES = [
  { type: 'apple', emoji: '🍎', label: 'Apple', pts: 10, color: '#ef4444' },
  { type: 'golden_apple', emoji: '⭐', label: 'Golden Apple', pts: 30, color: '#fbbf24' },
];

const SPEEDS = {
  chill: 150,
  normal: 110,
  rush: 75,
};

function playSound(freq, duration = 0.05, type = 'square', gainVal = 0.08) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore audio policies
  }
}

export function RetroSnake() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('ledger_snake_highscore') || '0', 10);
  });
  const [speedLevel, setSpeedLevel] = useState('normal'); // 'chill' | 'normal' | 'rush'
  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'paused' | 'gameover'
  const [lastEatenItem, setLastEatenItem] = useState(null);

  const canvasRef = useRef(null);

  // Snake coordinates [{x, y}]
  const snakeRef = useRef([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const dirRef = useRef({ x: 0, y: -1 }); // moving up
  const nextDirRef = useRef({ x: 0, y: -1 });
  const foodRef = useRef({ x: 10, y: 5, type: FOOD_TYPES[0] });
  const gameLoopRef = useRef(null);

  // Spawn random food
  const spawnFood = useCallback(() => {
    let newX, newY;
    let collision = true;
    while (collision) {
      newX = Math.floor(Math.random() * GRID_SIZE);
      newY = Math.floor(Math.random() * GRID_SIZE);
      collision = snakeRef.current.some((part) => part.x === newX && part.y === newY);
    }
    // 80% regular apple (+10 pts), 20% golden bonus (+30 pts)
    const rand = Math.random();
    const selectedFood = rand > 0.8 ? FOOD_TYPES[1] : FOOD_TYPES[0];

    foodRef.current = { x: newX, y: newY, type: selectedFood };
  }, []);

  // Draw board on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = GRID_SIZE * CELL_SIZE;
    const height = GRID_SIZE * CELL_SIZE;

    // Background
    ctx.fillStyle = '#101216';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Food
    const food = foodRef.current;
    if (food) {
      ctx.fillStyle = food.type.color;
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 1,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Food highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2 - 2,
        food.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        2,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    // Draw Snake
    const snake = snakeRef.current;
    snake.forEach((part, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#fbbf24' : '#34d399';
      ctx.fillRect(part.x * CELL_SIZE + 1, part.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      ctx.strokeStyle = '#101216';
      ctx.lineWidth = 1;
      ctx.strokeRect(part.x * CELL_SIZE + 1, part.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      // Snake eyes on head
      if (isHead) {
        ctx.fillStyle = '#101216';
        const eyeRadius = 1.5;
        const cx = part.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = part.y * CELL_SIZE + CELL_SIZE / 2;

        if (dirRef.current.x === 1) {
          ctx.beginPath(); ctx.arc(cx + 3, cy - 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 3, cy + 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
        } else if (dirRef.current.x === -1) {
          ctx.beginPath(); ctx.arc(cx - 3, cy - 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.arc(cx - 3, cy + 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
        } else if (dirRef.current.y === 1) {
          ctx.beginPath(); ctx.arc(cx - 3, cy + 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 3, cy + 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(cx - 3, cy - 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 3, cy - 3, eyeRadius, 0, 2 * Math.PI); ctx.fill();
        }
      }
    });
  }, []);

  // Update Game Step
  const step = useCallback(() => {
    const snake = [...snakeRef.current];
    dirRef.current = nextDirRef.current;
    const dir = dirRef.current;

    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y,
    };

    // Wall Collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState('gameover');
      playSound(180, 0.3, 'sawtooth', 0.2);
      triggerHapticVibration([300, 100, 300]);
      return;
    }

    // Self Collision
    if (snake.some((part) => part.x === head.x && part.y === head.y)) {
      setGameState('gameover');
      playSound(150, 0.3, 'sawtooth', 0.2);
      triggerHapticVibration([300, 100, 300]);
      return;
    }

    snake.unshift(head);

    // Food Collision Check
    const food = foodRef.current;
    if (head.x === food.x && head.y === food.y) {
      const earned = food.type.pts;
      setScore((prev) => {
        const next = prev + earned;
        if (next > highScore) {
          setHighScore(next);
          localStorage.setItem('ledger_snake_highscore', String(next));
        }
        return next;
      });

      setLastEatenItem(food.type);
      playSound(food.type.pts >= 50 ? 880 : 540, 0.08, 'sine', 0.15);
      triggerHapticVibration([40]);
      spawnFood();
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
    draw();
  }, [draw, highScore, spawnFood]);

  // Main Game Loop Timer
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    const interval = SPEEDS[speedLevel] || 110;
    gameLoopRef.current = setInterval(step, interval);
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, speedLevel, step]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused' || gameState === 'ready') setGameState('playing');
        return;
      }

      if (gameState !== 'playing') return;

      const cur = dirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && cur.y !== 1) {
        nextDirRef.current = { x: 0, y: -1 };
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && cur.y !== -1) {
        nextDirRef.current = { x: 0, y: 1 };
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && cur.x !== 1) {
        nextDirRef.current = { x: -1, y: 0 };
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && cur.x !== -1) {
        nextDirRef.current = { x: 1, y: 0 };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Reset Game
  const resetGame = () => {
    unlockAudioContext();
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    setScore(0);
    setLastEatenItem(null);
    spawnFood();
    setGameState('playing');
    playSound(440, 0.08, 'triangle', 0.1);
  };

  // Touch Direction Helper
  const handleTouchDir = (newDir) => {
    unlockAudioContext();
    triggerHapticVibration([15]);
    const cur = dirRef.current;
    if (newDir.x !== 0 && cur.x === 0) {
      nextDirRef.current = newDir;
    } else if (newDir.y !== 0 && cur.y === 0) {
      nextDirRef.current = newDir;
    }
  };

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="retro-snake">
      {/* Top Game Bar */}
      <div className="retro-snake__topbar">
        <div className="retro-snake__stats">
          <div className="retro-snake__stat-pill">
            <span className="retro-snake__stat-label">SCORE</span>
            <span className="retro-snake__stat-val num">{score}</span>
          </div>

          <div className="retro-snake__stat-pill retro-snake__stat-pill--high">
            <TrophyIcon width={14} height={14} />
            <span className="retro-snake__stat-label">BEST</span>
            <span className="retro-snake__stat-val num">{highScore}</span>
          </div>
        </div>

        <div className="retro-snake__speed-pills">
          <button
            className={`bbtn bbtn--xs ${speedLevel === 'chill' ? 'bbtn--active' : 'bbtn--outline'}`}
            onClick={() => setSpeedLevel('chill')}
            disabled={gameState === 'playing'}
          >
            Chill
          </button>
          <button
            className={`bbtn bbtn--xs ${speedLevel === 'normal' ? 'bbtn--active' : 'bbtn--outline'}`}
            onClick={() => setSpeedLevel('normal')}
            disabled={gameState === 'playing'}
          >
            Normal
          </button>
          <button
            className={`bbtn bbtn--xs ${speedLevel === 'rush' ? 'bbtn--active' : 'bbtn--outline'}`}
            onClick={() => setSpeedLevel('rush')}
            disabled={gameState === 'playing'}
          >
            Rush ⚡
          </button>
        </div>
      </div>

      {/* Main Game Screen & Controls */}
      <div className="retro-snake__arena">
        <div className="retro-snake__screen-wrap">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="retro-snake__canvas"
          />

          {/* Overlays for Ready / Paused / GameOver */}
          {gameState === 'ready' && (
            <div className="retro-snake__overlay">
              <span className="retro-snake__overlay-emoji">🐍</span>
              <h3 className="retro-snake__overlay-title">Retro Snake</h3>
              <p className="retro-snake__overlay-desc">
                Eat apples to grow. Avoid walls and yourself!
              </p>
              <button className="bbtn bbtn--good retro-snake__start-btn" onClick={resetGame}>
                <PlayIcon width={16} height={16} />
                <span>START GAME</span>
              </button>
            </div>
          )}

          {gameState === 'paused' && (
            <div className="retro-snake__overlay">
              <span className="retro-snake__overlay-emoji">⏸️</span>
              <h3 className="retro-snake__overlay-title">Game Paused</h3>
              <button className="bbtn bbtn--good retro-snake__start-btn" onClick={() => setGameState('playing')}>
                <PlayIcon width={16} height={16} />
                <span>RESUME</span>
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="retro-snake__overlay">
              <span className="retro-snake__overlay-emoji">💥</span>
              <h3 className="retro-snake__overlay-title">Game Over!</h3>
              <p className="retro-snake__overlay-score num">Score: <strong>{score}</strong></p>
              {score >= highScore && score > 0 && (
                <span className="bchip bchip--good retro-snake__new-record">🎉 NEW HIGH SCORE!</span>
              )}
              <button className="bbtn bbtn--good retro-snake__start-btn" onClick={resetGame}>
                <RefreshIcon width={16} height={16} />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Tactile D-Pad Controls & Rules */}
        <div className="retro-snake__side-panel">
          <div className="retro-snake__legend bcard">
            <span className="eyebrow">Controls & Items</span>
            <div className="retro-snake__legend-items">
              <div className="retro-snake__legend-row">
                <span>🍎 Apple</span>
                <span className="num">+10 pts</span>
              </div>
              <div className="retro-snake__legend-row">
                <span>⭐ Golden Apple</span>
                <span className="num">+30 pts</span>
              </div>
              <div className="retro-snake__legend-row retro-snake__legend-row--dim">
                <span>Keys: Arrows / WASD / Space</span>
              </div>
            </div>
          </div>

          <div className="retro-snake__dpad">
            <div className="retro-snake__dpad-row">
              <button
                className="bbtn bbtn--outline retro-snake__dpad-btn"
                onClick={() => handleTouchDir({ x: 0, y: -1 })}
                aria-label="Up"
              >
                ▲
              </button>
            </div>
            <div className="retro-snake__dpad-row">
              <button
                className="bbtn bbtn--outline retro-snake__dpad-btn"
                onClick={() => handleTouchDir({ x: -1, y: 0 })}
                aria-label="Left"
              >
                ◀
              </button>
              <button
                className="bbtn bbtn--outline retro-snake__dpad-btn retro-snake__dpad-pause"
                onClick={() => {
                  if (gameState === 'playing') setGameState('paused');
                  else if (gameState === 'paused' || gameState === 'ready') setGameState('playing');
                }}
                aria-label="Pause"
              >
                {gameState === 'playing' ? '⏸' : '▶'}
              </button>
              <button
                className="bbtn bbtn--outline retro-snake__dpad-btn"
                onClick={() => handleTouchDir({ x: 1, y: 0 })}
                aria-label="Right"
              >
                ▶
              </button>
            </div>
            <div className="retro-snake__dpad-row">
              <button
                className="bbtn bbtn--outline retro-snake__dpad-btn"
                onClick={() => handleTouchDir({ x: 0, y: 1 })}
                aria-label="Down"
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RetroSnake;
