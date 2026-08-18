import React from 'react';
import { getStatusTone } from '../utils/attendance.js';

function ProgressRing({ percentage = 0, size = 64, stroke = 6 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
  const offset = circumference - (clamped / 100) * circumference;
  const tone = getStatusTone(clamped);

  const strokeColors = {
    good: '#4b5d46',
    warning: '#a6790a',
    danger: '#9a3b2b',
  };

  const color = strokeColors[tone] || strokeColors.good;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          display: 'block',
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#cfcfcb"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.6s ease',
          }}
        />
      </svg>
      <span
        className="num"
        style={{
          position: 'absolute',
          fontSize: size <= 60 ? '12px' : '14px',
          fontWeight: 700,
          color: 'var(--ink)',
          fontFamily: 'var(--mono)',
        }}
      >
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

export default ProgressRing;
