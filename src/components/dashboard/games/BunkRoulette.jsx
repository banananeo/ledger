import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SparklesIcon, DiceIcon, TrophyIcon, FlameIcon, CheckIcon } from '../Icons.jsx';
import { triggerHapticVibration, unlockAudioContext } from '../../../utils/mobilePush';
import { todayISO, findEntryForDate } from '../../../utils/calendar.js';
import './BunkRoulette.css';

const SLICE_COLORS = [
  '#fbbf24', // yellow
  '#38bdf8', // sky
  '#34d399', // mint
  '#fb7185', // pink
  '#a78bfa', // purple
  '#f97316', // orange
  '#60a5fa', // blue
  '#4ade80', // green
];

// Play ticking sound when passing a wheel slice
function playTickSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Ignore audio restriction
  }
}

// Play celebration win fanfare
function playWinFanfare() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch {
    // Ignore
  }
}

function parseDayNum(str) {
  const match = String(str || '').match(/\d+/);
  return match ? match[0] : String(str || '');
}

export function BunkRoulette({ schedule = [], attendance = [], calendar }) {
  // Determine today's day order
  const todayEntry = findEntryForDate(calendar, todayISO());
  const todayDayOrder = todayEntry?.dayOrder ? String(todayEntry.dayOrder) : '1';

  const [selectedDayOrder, setSelectedDayOrder] = useState(() => {
    return todayDayOrder && ['1', '2', '3', '4', '5'].includes(todayDayOrder) ? todayDayOrder : '1';
  });

  const [filterType, setFilterType] = useState('all'); // 'all' | 'theory' | 'practical'
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedClass, setSelectedClass] = useState(null);
  const [bunkHistory, setBunkHistory] = useState([]);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Extract all available day orders from schedule
  const availableDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 5; i++) {
      const dayStr = String(i);
      const dayObj = schedule.find((d) => parseDayNum(d.dayLabel) === dayStr);
      const count = dayObj?.entries?.length || 0;
      days.push({
        id: dayStr,
        label: `Day ${dayStr}`,
        count,
        isToday: dayStr === todayDayOrder,
      });
    }
    return days;
  }, [schedule, todayDayOrder]);

  // Classes for the active Day Order
  const activeClasses = useMemo(() => {
    let classes = [];
    if (selectedDayOrder === 'all') {
      schedule.forEach((d) => {
        if (d.entries) {
          d.entries.forEach((e) => {
            classes.push({ ...e, dayLabel: d.dayLabel });
          });
        }
      });
    } else {
      const dayObj = schedule.find((d) => parseDayNum(d.dayLabel) === String(selectedDayOrder));
      if (dayObj?.entries) {
        classes = dayObj.entries.map((e) => ({ ...e, dayLabel: dayObj.dayLabel }));
      }
    }

    if (filterType === 'theory') {
      classes = classes.filter((c) => c.slotType !== 'Practical');
    } else if (filterType === 'practical') {
      classes = classes.filter((c) => c.slotType === 'Practical');
    }

    // Default fallback if no classes exist in schedule
    if (classes.length === 0) {
      classes = [
        { courseCode: '18CSC302J', courseTitle: 'Compiler Design', room: 'TP-401', faculty: 'Dr. S. K. Raman', slotType: 'Theory', startTime: '08:50 AM', endTime: '09:40 AM' },
        { courseCode: '18CSC303J', courseTitle: 'Computer Networks', room: 'UB-602', faculty: 'Prof. Ananya Sen', slotType: 'Theory', startTime: '09:45 AM', endTime: '10:35 AM' },
        { courseCode: '18CSC304J', courseTitle: 'Network Security Lab', room: 'TP-Lab 3', faculty: 'Dr. Ramesh Kumar', slotType: 'Practical', startTime: '11:35 AM', endTime: '01:15 PM' },
        { courseCode: '18LEM101T', courseTitle: 'Constitution of India', room: 'TP-203', faculty: 'Guest Faculty', slotType: 'Theory', startTime: '02:20 PM', endTime: '03:10 PM' },
      ];
    }

    return classes;
  }, [schedule, selectedDayOrder, filterType]);

  // Draw Roulette Wheel on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    const scale = window.devicePixelRatio || 2;
    canvas.width = size * scale;
    canvas.height = size * scale;
    ctx.scale(scale, scale);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 12;
    const numSlices = activeClasses.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // Save context for rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Outer shadow ring
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#121317';
    ctx.fill();

    // Draw Slices
    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#121317';
      ctx.stroke();

      // Slice label
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#121317';
      ctx.font = 'bold 12px "Space Grotesk", sans-serif';

      const item = activeClasses[i];
      const title = item.courseTitle || item.courseCode || `Class ${i + 1}`;
      const truncated = title.length > 14 ? title.substring(0, 13) + '…' : title;

      ctx.fillText(truncated, radius - 24, 4);

      // Room small badge
      if (item.room) {
        ctx.font = '600 10px "IBM Plex Mono", monospace';
        ctx.fillStyle = 'rgba(18, 19, 23, 0.75)';
        ctx.fillText(item.room, radius - 24, 18);
      }

      ctx.restore();
    }

    // Outer Rim border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#121317';
    ctx.stroke();

    // Decorative studs on the rim
    const numStuds = numSlices * 2;
    for (let i = 0; i < numStuds; i++) {
      const studAngle = (i * 2 * Math.PI) / numStuds;
      const sx = Math.cos(studAngle) * (radius - 4);
      const sy = Math.sin(studAngle) * (radius - 4);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#121317';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Center Hub
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#121317';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Center Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BUNK', 0, -4);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 9px "IBM Plex Mono", monospace';
    ctx.fillText('SPIN', 0, 8);

    ctx.restore();
  }, [activeClasses, rotation]);

  // Spin the wheel with physics ease-out
  const handleSpin = () => {
    if (isSpinning || activeClasses.length === 0) return;
    unlockAudioContext();
    triggerHapticVibration([100]);
    setIsSpinning(true);
    setSelectedClass(null);

    const numSlices = activeClasses.length;
    const sliceAngleDeg = 360 / numSlices;

    // Pick a random target index
    const targetIndex = Math.floor(Math.random() * numSlices);
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full 360 rotations

    // Top pointer is at -90 deg (270 deg). The selected slice is at rotation angle.
    const targetSliceCenter = targetIndex * sliceAngleDeg + sliceAngleDeg / 2;
    const finalRotation = rotation + fullSpins * 360 + (270 - (rotation % 360) - targetSliceCenter + 360) % 360;

    const startRot = rotation;
    const totalDelta = finalRotation - startRot;
    const duration = 4000; // ms
    const startTime = performance.now();
    let lastTickSlice = -1;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic Ease-Out curve for realistic mechanical deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3.6);
      const currentRot = startRot + totalDelta * easeOut;
      setRotation(currentRot);

      // Play tick sound when slice boundary crosses top indicator
      const normalizedAngle = (currentRot + 90) % 360;
      const currentSliceIdx = Math.floor(normalizedAngle / sliceAngleDeg);
      if (currentSliceIdx !== lastTickSlice) {
        lastTickSlice = currentSliceIdx;
        playTickSound();
        triggerHapticVibration([15]);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const won = activeClasses[targetIndex];
        setSelectedClass(won);
        playWinFanfare();
        triggerHapticVibration([200, 100, 200]);
        setBunkHistory((prev) => [won, ...prev.slice(0, 4)]);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Attendance margin calculation for the selected class
  const attendanceImpact = useMemo(() => {
    if (!selectedClass) return null;

    // Find course in student's attendance records
    const record = attendance.find(
      (a) =>
        a.courseCode?.toLowerCase() === selectedClass.courseCode?.toLowerCase() ||
        a.courseTitle?.toLowerCase() === selectedClass.courseTitle?.toLowerCase()
    );

    let attended = 26;
    let total = 30;
    let currentPct = 86.6;

    if (record) {
      if (record.classesConducted != null && record.classesConducted > 0) {
        total = Number(record.classesConducted) || 30;
        const absent = Number(record.classesAbsent) || 0;
        attended = Math.max(0, total - absent);
      } else if (record.attendedHours != null || record.totalHours != null) {
        attended = record.attendedHours ?? record.attended ?? 26;
        total = record.totalHours ?? record.total ?? 30;
      }
      currentPct = Number(record.attendancePercentage) || ((attended / (total || 1)) * 100);
    }

    // After 1 bunk: attended remains same, total increases by 1 (or 2 if lab)
    const bunkHours = selectedClass.slotType === 'Practical' ? 2 : 1;
    const newTotal = total + bunkHours;
    const newPct = (attended / newTotal) * 100;
    const pctDrop = currentPct - newPct;

    // Margin to 75%
    const maxBunkable = Math.max(0, Math.floor((attended - 0.75 * total) / 0.75));

    let safetyStatus = 'safe';
    let safetyTitle = 'Safe Bunk! Chill Out';
    let safetyDesc = `Your attendance remains at ${newPct.toFixed(1)}%, well above the 75% cutoff.`;
    let safetyTone = 'good';

    if (newPct < 75.0) {
      safetyStatus = 'danger';
      safetyTitle = 'CRITICAL: Debarment Zone!';
      safetyDesc = `Bunking drops you to ${newPct.toFixed(1)}% (< 75%). You will be debarred!`;
      safetyTone = 'danger';
    } else if (newPct < 78.0) {
      safetyStatus = 'risky';
      safetyTitle = 'High Risk Bunk!';
      safetyDesc = `You will hover right at ${newPct.toFixed(1)}%. No more skips allowed!`;
      safetyTone = 'warning';
    }

    return {
      currentPct: currentPct.toFixed(1),
      newPct: newPct.toFixed(1),
      pctDrop: pctDrop.toFixed(1),
      attended,
      total,
      newTotal,
      maxBunkable,
      safetyStatus,
      safetyTitle,
      safetyDesc,
      safetyTone,
    };
  }, [selectedClass, attendance]);

  return (
    <div className="bunk-roulette">
      {/* Top Header & Day Order Filter Bar */}
      <div className="bunk-roulette__controls">
        <div className="bunk-roulette__day-selector">
          <span className="bunk-roulette__label eyebrow">Select Day Order</span>
          <div className="bunk-roulette__day-pills">
            {availableDays.map((d) => (
              <button
                key={d.id}
                className={`bbtn ${
                  selectedDayOrder === d.id ? 'bbtn--good' : 'bbtn--outline'
                } bunk-roulette__day-btn`}
                onClick={() => {
                  setSelectedDayOrder(d.id);
                  setSelectedClass(null);
                }}
                disabled={isSpinning}
              >
                <span>{d.label}</span>
                {d.isToday && <span className="bunk-roulette__today-badge">Today</span>}
              </button>
            ))}
            <button
              className={`bbtn ${
                selectedDayOrder === 'all' ? 'bbtn--good' : 'bbtn--outline'
              } bunk-roulette__day-btn`}
              onClick={() => {
                setSelectedDayOrder('all');
                setSelectedClass(null);
              }}
              disabled={isSpinning}
            >
              <span>All Classes</span>
            </button>
          </div>
        </div>

        <div className="bunk-roulette__filter-row">
          <div className="bunk-roulette__class-count num">
            {activeClasses.length} options on {selectedDayOrder === 'all' ? 'Schedule' : `Day ${selectedDayOrder}`}
          </div>

          <div className="bunk-roulette__type-toggles">
            <button
              className={`bbtn bbtn--xs ${filterType === 'all' ? 'bbtn--active' : 'bbtn--outline'}`}
              onClick={() => setFilterType('all')}
              disabled={isSpinning}
            >
              All
            </button>
            <button
              className={`bbtn bbtn--xs ${filterType === 'theory' ? 'bbtn--active' : 'bbtn--outline'}`}
              onClick={() => setFilterType('theory')}
              disabled={isSpinning}
            >
              Lectures Only
            </button>
            <button
              className={`bbtn bbtn--xs ${filterType === 'practical' ? 'bbtn--active' : 'bbtn--outline'}`}
              onClick={() => setFilterType('practical')}
              disabled={isSpinning}
            >
              Labs Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Roulette Arena */}
      <div className="bunk-roulette__arena">
        <div className="bunk-roulette__wheel-container">
          {/* Top Ticker Pointer Needle */}
          <div className="bunk-roulette__pointer">
            <div className="bunk-roulette__pointer-arrow" />
          </div>

          <canvas
            ref={canvasRef}
            className="bunk-roulette__canvas"
            onClick={handleSpin}
            style={{ cursor: isSpinning ? 'not-allowed' : 'pointer' }}
          />

          <button
            className={`bbtn bunk-roulette__spin-btn ${isSpinning ? 'bunk-roulette__spin-btn--spinning' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning}
          >
            <DiceIcon width={18} height={18} />
            <span>{isSpinning ? 'Spinning Destiny...' : 'SPIN THE ROULETTE'}</span>
          </button>
        </div>

        {/* Landed Result Card & Attendance Margin Engine */}
        <div className="bunk-roulette__result-panel">
          {selectedClass && attendanceImpact ? (
            <motion.div
              className="bcard bunk-roulette__result-card"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            >
              <div className="bunk-roulette__result-head">
                <div className="bunk-roulette__verdict-tag">
                  <span className={`bchip bchip--${attendanceImpact.safetyTone}`}>
                    {attendanceImpact.safetyTitle}
                  </span>
                  <span className="bchip num">{selectedClass.dayLabel || `Day ${selectedDayOrder}`}</span>
                </div>
                <p className="bunk-roulette__selected-room num">
                  Room: <strong>{selectedClass.room || 'TBA'}</strong>
                </p>
              </div>

              <h3 className="bunk-roulette__course-name">{selectedClass.courseTitle}</h3>
              <p className="bunk-roulette__course-meta">
                <span className="num">{selectedClass.courseCode}</span> • {selectedClass.startTime} – {selectedClass.endTime} • {selectedClass.faculty}
              </p>

              {/* Attendance Impact Metric Box */}
              <div className="bunk-roulette__impact-box">
                <div className="bunk-roulette__impact-grid">
                  <div className="bunk-roulette__impact-item">
                    <span className="bunk-roulette__impact-label">Current Attendance</span>
                    <span className="bunk-roulette__impact-val num">{attendanceImpact.currentPct}%</span>
                  </div>
                  <div className="bunk-roulette__impact-item bunk-roulette__impact-item--after">
                    <span className="bunk-roulette__impact-label">After This Bunk</span>
                    <span className={`bunk-roulette__impact-val num bunk-roulette__impact-val--${attendanceImpact.safetyTone}`}>
                      {attendanceImpact.newPct}%
                    </span>
                  </div>
                </div>

                <p className="bunk-roulette__advice-text">
                  💡 {attendanceImpact.safetyDesc}
                </p>
              </div>

              <div className="bunk-roulette__result-actions">
                <button
                  className="bbtn bbtn--outline bunk-roulette__action-btn"
                  onClick={handleSpin}
                  disabled={isSpinning}
                >
                  <SparklesIcon width={16} height={16} />
                  <span>Spin Again</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bcard bunk-roulette__placeholder-card">
              <div className="bunk-roulette__placeholder-icon">🎰</div>
              <h4 className="bunk-roulette__placeholder-title">Ready to Test Your Luck?</h4>
              <p className="bunk-roulette__placeholder-desc">
                Select your Day Order, tap the wheel or hit <strong>SPIN</strong> to decide which lecture you're skipping today with live 75% attendance margin protection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BunkRoulette;
