export interface GenerateTimetableOptions {
  schedule: any[];
  profile?: any;
  theme?: 'light' | 'dark';
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = String(timeStr).trim().match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  } else if (!meridiem) {
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
  }
  return hours * 60 + minutes;
}

// Standard time slots across SRM schedule
const STANDARD_TIME_SLOTS = [
  { label: 'Hour 1', start: '08:00', end: '08:50', startMin: 480, endMin: 530 },
  { label: 'Hour 2', start: '08:50', end: '09:40', startMin: 530, endMin: 580 },
  { label: 'Hour 3', start: '09:45', end: '10:35', startMin: 585, endMin: 635 },
  { label: 'Hour 4', start: '10:40', end: '11:30', startMin: 640, endMin: 690 },
  { label: 'Hour 5', start: '11:35', end: '12:25', startMin: 695, endMin: 745 },
  { label: 'Hour 6', start: '12:30', end: '01:20', startMin: 750, endMin: 800 },
  { label: 'Hour 7', start: '01:25', end: '02:15', startMin: 805, endMin: 855 },
  { label: 'Hour 8', start: '02:20', end: '03:10', startMin: 860, endMin: 910 },
  { label: 'Hour 9', start: '03:15', end: '04:05', startMin: 915, endMin: 965 },
  { label: 'Hour 10', start: '04:10', end: '05:00', startMin: 970, endMin: 1020 },
];

export function extractSlotsFromSchedule(schedule: any[]) {
  // Collect all unique slots that actually have classes, or fallback to standard hours
  const foundTimes: { start: string; end: string; startMin: number; endMin: number }[] = [];
  
  schedule.forEach((day) => {
    (day.entries || []).forEach((e: any) => {
      const sMin = parseTimeToMinutes(e.startTime);
      const eMin = parseTimeToMinutes(e.endTime) || sMin + 50;
      if (sMin && !foundTimes.some((t) => Math.abs(t.startMin - sMin) < 15)) {
        foundTimes.push({
          start: e.startTime,
          end: e.endTime || '',
          startMin: sMin,
          endMin: eMin,
        });
      }
    });
  });

  if (foundTimes.length >= 4) {
    foundTimes.sort((a, b) => a.startMin - b.startMin);
    return foundTimes.map((t, idx) => ({
      label: `Period ${idx + 1}`,
      start: t.start,
      end: t.end,
      startMin: t.startMin,
      endMin: t.endMin,
    }));
  }

  return STANDARD_TIME_SLOTS;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function generateTimetableCanvas(
  options: GenerateTimetableOptions
): Promise<HTMLCanvasElement> {
  const { schedule, profile, theme = 'light' } = options;
  const isDark = theme === 'dark';

  const timeSlots = extractSlotsFromSchedule(schedule);
  const days = schedule.length > 0 ? schedule : [
    { dayLabel: 'Day 1', entries: [] },
    { dayLabel: 'Day 2', entries: [] },
    { dayLabel: 'Day 3', entries: [] },
    { dayLabel: 'Day 4', entries: [] },
    { dayLabel: 'Day 5', entries: [] },
  ];

  // High Resolution Canvas (Retina 2x)
  const scale = 2;
  const width = 2200;
  const rowHeight = 160;
  const headerHeight = 220;
  const colHeaderHeight = 64;
  const footerHeight = 90;
  const height = headerHeight + colHeaderHeight + days.length * rowHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(scale, scale);

  // Palette
  const colors = isDark
    ? {
        bg: '#0c0d10',
        cardBg: '#16181f',
        border: '#2e323e',
        ink: '#f1f3f9',
        inkSoft: '#9ca3af',
        mute: '#6b7280',
        yellow: '#fbbf24',
        yellowSoft: 'rgba(251, 191, 36, 0.12)',
        sky: '#38bdf8',
        skySoft: 'rgba(56, 189, 248, 0.12)',
        mint: '#34d399',
        mintSoft: 'rgba(52, 211, 153, 0.12)',
        freeCell: '#111318',
        roomBox: '#1e222d',
      }
    : {
        bg: '#fcfcfd',
        cardBg: '#ffffff',
        border: '#121317',
        ink: '#121317',
        inkSoft: '#4b5563',
        mute: '#6b7280',
        yellow: '#f59e0b',
        yellowSoft: '#fef3c7',
        sky: '#0284c7',
        skySoft: '#e0f2fe',
        mint: '#059669',
        mintSoft: '#d1fae5',
        freeCell: '#f8fafc',
        roomBox: '#f1f5f9',
      };

  // Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Inner container background
  const tableX = 36;
  const tableY = 190;
  const tableW = width - 72;
  const dayColW = 150;
  const numSlots = timeSlots.length;
  const slotColW = (tableW - dayColW) / numSlots;

  // ==========================================
  // 1. TOP HEADER & LOGO
  // ==========================================
  const logoX = 40;
  const logoY = 40;
  const logoSize = 64;

  // Draw Logo Badge
  ctx.fillStyle = isDark ? '#1a1c23' : '#ffffff';
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Logo text "L."
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillStyle = colors.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', logoX + 24, logoY + 34);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('.', logoX + 44, logoY + 34);

  // Main Brand & Title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colors.ink;
  ctx.font = 'bold 32px "Space Grotesk", system-ui, -apple-system, sans-serif';
  ctx.fillText('Ledger.', logoX + logoSize + 16, logoY + 32);

  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillStyle = colors.yellow;
  ctx.fillText('WEEKLY ACADEMIC TIMETABLE', logoX + logoSize + 16, logoY + 54);

  // College & Student Information Card
  const profileName = profile?.name || 'Student Timetable';
  const regNumber = profile?.registrationNumber || 'SRM Institute of Science and Technology';

  const infoCardW = 540;
  const infoCardX = width - infoCardW - 40;
  const infoCardY = 40;
  const infoCardH = 68;

  ctx.fillStyle = colors.cardBg;
  roundRect(ctx, infoCardX, infoCardY, infoCardW, infoCardH, 10);
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 17px "Space Grotesk", sans-serif';
  ctx.fillStyle = colors.ink;
  ctx.fillText(profileName, infoCardX + 16, infoCardY + 28);

  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = colors.inkSoft;
  ctx.fillText(regNumber, infoCardX + 16, infoCardY + 50);

  // Subtle divider under header
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(36, 126);
  ctx.lineTo(width - 36, 126);
  ctx.stroke();

  // Subtitle info
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = colors.inkSoft;
  ctx.fillText('DAY ORDER SYSTEM • SRM KATTANKULATHUR CAMPUS', 40, 150);

  const now = new Date();
  const dateStr = `Exported on: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, width - 40, 150);

  // ==========================================
  // 2. TIMETABLE GRID TABLE
  // ==========================================
  ctx.textAlign = 'left';

  // Draw Grid Header Row (Time Slots)
  // Day Order Column Header
  ctx.fillStyle = isDark ? '#1a1d26' : '#f3f4f6';
  roundRect(ctx, tableX, tableY, dayColW, colHeaderHeight, 0);
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tableX, tableY, dayColW, colHeaderHeight);

  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.fillStyle = colors.ink;
  ctx.textAlign = 'center';
  ctx.fillText('DAY ORDER', tableX + dayColW / 2, tableY + 36);

  // Column Headers (Periods)
  timeSlots.forEach((slot, colIdx) => {
    const x = tableX + dayColW + colIdx * slotColW;
    ctx.fillStyle = isDark ? '#161922' : '#f8fafc';
    ctx.fillRect(x, tableY, slotColW, colHeaderHeight);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, tableY, slotColW, colHeaderHeight);

    ctx.font = 'bold 13px "Space Grotesk", sans-serif';
    ctx.fillStyle = colors.ink;
    ctx.textAlign = 'center';
    ctx.fillText(slot.label, x + slotColW / 2, tableY + 26);

    ctx.font = '11.5px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.inkSoft;
    ctx.fillText(`${slot.start} - ${slot.end}`, x + slotColW / 2, tableY + 46);
  });

  // Draw Days and Classes Rows
  days.forEach((dayObj, rowIdx) => {
    const y = tableY + colHeaderHeight + rowIdx * rowHeight;
    const dayLabel = dayObj.dayLabel || `Day ${rowIdx + 1}`;
    const dayMatch = dayLabel.match(/\d+/);
    const dayText = dayMatch ? dayMatch[0] : String(rowIdx + 1);

    // Day label cell
    ctx.fillStyle = isDark ? '#181b24' : '#ffffff';
    ctx.fillRect(tableX, y, dayColW, rowHeight);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, y, dayColW, rowHeight);

    // Day Badge Box
    const badgeSize = 48;
    const badgeX = tableX + (dayColW - badgeSize) / 2;
    const badgeY = y + 36;
    ctx.fillStyle = colors.yellowSoft;
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 22px "Space Grotesk", sans-serif';
    ctx.fillStyle = colors.ink;
    ctx.textAlign = 'center';
    ctx.fillText(String(dayText), badgeX + badgeSize / 2, badgeY + 32);

    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.inkSoft;
    ctx.fillText(dayLabel.toUpperCase(), tableX + dayColW / 2, y + 116);

    // Empty grid cells placeholder background
    timeSlots.forEach((_, colIdx) => {
      const x = tableX + dayColW + colIdx * slotColW;
      ctx.fillStyle = colors.freeCell;
      ctx.fillRect(x, y, slotColW, rowHeight);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, slotColW, rowHeight);

      // Subtle "Free" text
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#333846' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText('—', x + slotColW / 2, y + rowHeight / 2);
    });

    // Populate actual classes inside the matching period slots
    const dayEntries = dayObj.entries || [];
    dayEntries.forEach((entry: any) => {
      const entryStartMin = parseTimeToMinutes(entry.startTime);
      if (!entryStartMin) return;

      // Find closest column matching this entry
      let closestColIdx = -1;
      let minDiff = 999;
      timeSlots.forEach((slot, colIdx) => {
        const diff = Math.abs(slot.startMin - entryStartMin);
        if (diff < minDiff && diff <= 35) {
          minDiff = diff;
          closestColIdx = colIdx;
        }
      });

      if (closestColIdx === -1) {
        // Fallback: estimate by time
        closestColIdx = Math.max(0, Math.min(timeSlots.length - 1, Math.floor((entryStartMin - 480) / 55)));
      }

      const cellX = tableX + dayColW + closestColIdx * slotColW + 4;
      const cellY = y + 4;
      const cellW = slotColW - 8;
      const cellH = rowHeight - 8;

      const isLab = String(entry.slotType || '').toLowerCase().includes('practical') ||
                    String(entry.slotType || '').toLowerCase().includes('lab');

      // Class Card Background
      ctx.fillStyle = isDark ? '#1a1d28' : '#ffffff';
      roundRect(ctx, cellX, cellY, cellW, cellH, 8);
      ctx.fill();

      ctx.strokeStyle = isLab ? colors.yellow : (isDark ? colors.border : '#121317');
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top Tag Bar inside card (Course Code + Type)
      const tagBg = isLab ? colors.yellowSoft : colors.skySoft;
      const tagColor = isLab ? colors.yellow : colors.sky;
      roundRect(ctx, cellX + 5, cellY + 5, cellW - 10, 22, 5);
      ctx.fillStyle = tagBg;
      ctx.fill();

      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = tagColor;
      ctx.textAlign = 'left';
      ctx.fillText(entry.courseCode || 'CLASS', cellX + 10, cellY + 20);

      // Slot type chip right side
      if (entry.slotType) {
        ctx.textAlign = 'right';
        ctx.font = '9.5px "Space Grotesk", sans-serif';
        ctx.fillText(entry.slotType, cellX + cellW - 10, cellY + 20);
      }

      // Course Title (truncated neatly if long)
      ctx.textAlign = 'left';
      ctx.font = 'bold 12.5px "Space Grotesk", sans-serif';
      ctx.fillStyle = colors.ink;
      
      const title = entry.courseTitle || entry.courseCode || 'Lecture';
      let displayTitle = title;
      if (ctx.measureText(displayTitle).width > cellW - 14) {
        while (displayTitle.length > 4 && ctx.measureText(displayTitle + '...').width > cellW - 14) {
          displayTitle = displayTitle.slice(0, -1);
        }
        displayTitle += '...';
      }
      ctx.fillText(displayTitle, cellX + 8, cellY + 48);

      // ROOM NO (Prominent Box)
      const roomBoxW = cellW - 14;
      const roomBoxH = 32;
      const roomBoxY = cellY + 58;

      ctx.fillStyle = colors.roomBox;
      roundRect(ctx, cellX + 7, roomBoxY, roomBoxW, roomBoxH, 6);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = colors.inkSoft;
      ctx.fillText('ROOM', cellX + 12, roomBoxY + 14);

      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.fillStyle = colors.ink;
      ctx.fillText(entry.room || 'TBA', cellX + 12, roomBoxY + 28);

      // Faculty / Timing in footer of card
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.fillStyle = colors.inkSoft;
      const facultyStr = entry.faculty ? entry.faculty.slice(0, 18) : entry.startTime;
      ctx.fillText(facultyStr, cellX + 8, cellY + cellH - 12);

      // Slot name in right corner
      if (entry.slotName) {
        ctx.textAlign = 'right';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillStyle = colors.mute;
        ctx.fillText(entry.slotName, cellX + cellW - 8, cellY + cellH - 12);
      }
    });
  });

  // ==========================================
  // 3. FOOTER LEGEND & BRANDING
  // ==========================================
  const footY = height - 42;

  // Legend
  ctx.textAlign = 'left';
  ctx.font = '12px "Space Grotesk", sans-serif';

  // Theory Pill
  ctx.fillStyle = colors.skySoft;
  roundRect(ctx, 40, footY - 14, 16, 16, 4);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.fillText('Theory Lecture', 64, footY - 1);

  // Lab Pill
  ctx.fillStyle = colors.yellowSoft;
  roundRect(ctx, 180, footY - 14, 16, 16, 4);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.fillText('Practical / Lab', 204, footY - 1);

  // Room Info Pill
  ctx.fillStyle = colors.roomBox;
  roundRect(ctx, 330, footY - 14, 16, 16, 4);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.fillText('Venue / Room Location Included', 354, footY - 1);

  // Watermark
  ctx.textAlign = 'right';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = colors.inkSoft;
  ctx.fillText('Built with Ledger • Academia Suite', width - 40, footY - 1);

  return canvas;
}

export async function downloadTimetableImage(options: GenerateTimetableOptions): Promise<void> {
  const canvas = await generateTimetableCanvas(options);
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  const link = document.createElement('a');
  link.download = `Ledger_Timetable_${options.theme || 'light'}_Weekly.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
