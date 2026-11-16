import type { WrappedAnalytics } from './wrappedAnalytics';

export type WrappedCardTheme = 'cobalt' | 'midnight';

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 3 && ctx.measureText(result + '…').width > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + '…';
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (lines.length === maxLines - 1) {
        const rest = words.slice(i).join(' ');
        lines.push(truncateText(ctx, rest, maxWidth));
        return lines;
      }
      current = word;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(truncateText(ctx, current, maxWidth));
  }
  return lines;
}

/**
 * Generates a high-DPI (3x scale of the 345x365 Figma receipt node 75:164 -> 1035x1095)
 * shareable receipt image matching the exact Figma design.
 */
export async function generateWrappedCanvas(
  stats: WrappedAnalytics,
  theme: WrappedCardTheme = 'cobalt'
): Promise<HTMLCanvasElement> {
  const baseW = 345;
  const baseH = 365;
  const scale = 3; // 1035 x 1095 crisp retina output

  const canvas = document.createElement('canvas');
  canvas.width = baseW * scale;
  canvas.height = baseH * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize canvas context');

  ctx.scale(scale, scale);

  const isMidnight = theme === 'midnight';
  const bg = isMidnight ? '#10151F' : '#2349EB';
  const paperInk = '#FAFAF5';
  const lime = '#EBF581';
  const stripInk = isMidnight ? '#10151F' : '#1534A6';

  // 1. Receipt Background (75:164)
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, baseW, baseH);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // 2. Top Brand & Meta (75:165, 75:166)
  ctx.fillStyle = paperInk;
  ctx.font = '700 19px "Space Grotesk", "Manrope", sans-serif';
  ctx.fillText('ledger / wrapped', 16, 16);

  ctx.font = '400 9px "IBM Plex Mono", monospace';
  ctx.fillText(`${stats.semesterTag}  /  ${stats.firstName.toUpperCase()}`, 16, 45);

  // Header rule (75:167)
  ctx.fillStyle = 'rgba(250, 250, 245, 0.3)';
  ctx.fillRect(16, 68, 313, 1);

  // 3. Attendance & Bunks Hero Section (75:168 .. 75:174)
  ctx.fillStyle = paperInk;
  ctx.font = '400 9px "IBM Plex Mono", monospace';
  ctx.fillText('ATTENDANCE', 16, 86);
  ctx.fillText('BUNKS', 236, 86);

  ctx.fillStyle = lime;
  ctx.font = '700 48px "Space Grotesk", "Manrope", sans-serif';
  ctx.fillText(`${stats.overallPercentage.toFixed(1)}%`, 12, 102);

  ctx.font = '700 43px "Space Grotesk", "Manrope", sans-serif';
  ctx.fillText(stats.hasCountData ? String(stats.totalBunked) : '0', 233, 105);

  ctx.fillStyle = paperInk;
  ctx.font = '400 10px "IBM Plex Mono", monospace';
  ctx.fillText(
    stats.hasCountData
      ? `${stats.totalAttended}/${stats.totalConducted} · ${stats.minutesInClass.toLocaleString()} mins`
      : `${stats.coursesCount} courses tracked`,
    16,
    163
  );
  ctx.fillText(stats.hasCountData ? `${stats.hoursBunked}h free` : '—', 236, 163);
  ctx.fillText(`+${stats.safeBunkBank} safe skips left`, 16, 183);

  // Middle rule (75:175)
  ctx.fillStyle = 'rgba(250, 250, 245, 0.3)';
  ctx.fillRect(16, 207, 313, 1);

  // 4. #1 Most Bunked & #1 Most Loyal (75:176 .. 75:181)
  ctx.fillStyle = paperInk;
  ctx.font = '400 8px "IBM Plex Mono", monospace';
  ctx.fillText('#1 MOST BUNKED', 16, 224);
  ctx.fillText('#1 MOST LOYAL', 187, 224);

  ctx.font = '700 11.5px "Space Grotesk", "Manrope", sans-serif';
  const bunkLines = wrapLines(
    ctx,
    stats.mostBunkedCourse?.courseTitle || 'None Skipped',
    155,
    2
  );
  bunkLines.forEach((line, idx) => {
    ctx.fillText(line, 16, 242 + idx * 14);
  });

  const loyalLines = wrapLines(
    ctx,
    stats.mostLoyalCourse?.courseTitle || 'All Courses',
    143,
    2
  );
  loyalLines.forEach((line, idx) => {
    ctx.fillText(line, 187, 242 + idx * 14);
  });

  ctx.font = '400 9px "IBM Plex Mono", monospace';
  ctx.fillText(
    stats.mostBunkedCourse
      ? stats.mostBunkedCourse.hasCounts
        ? `${stats.mostBunkedCourse.absent} bunks · ${stats.mostBunkedCourse.percentage.toFixed(1)}%`
        : `${stats.mostBunkedCourse.percentage.toFixed(1)}%`
      : '0 bunks',
    16,
    280
  );

  ctx.fillText(
    stats.mostLoyalCourse
      ? `${stats.mostLoyalCourse.percentage.toFixed(1)}% attended`
      : '100.0% attended',
    187,
    280
  );

  // 5. Bottom Archetype Strip (75:182 .. 75:184)
  ctx.fillStyle = lime;
  ctx.fillRect(0, 307, baseW, 58);

  ctx.fillStyle = stripInk;
  ctx.font = '400 9px "IBM Plex Mono", monospace';
  ctx.fillText(
    truncateText(
      ctx,
      `${stats.archetype.badge} / ${stats.archetype.title.toUpperCase()}`,
      baseW - 32
    ),
    16,
    318
  );

  ctx.font = '700 12px "Space Grotesk", "Manrope", sans-serif';
  ctx.fillText(
    truncateText(ctx, `“${stats.archetype.tagline}”`, baseW - 32),
    16,
    338
  );

  return canvas;
}

export async function downloadWrappedImage(
  stats: WrappedAnalytics,
  theme: WrappedCardTheme = 'cobalt'
): Promise<void> {
  const canvas = await generateWrappedCanvas(stats, theme);
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  const link = document.createElement('a');
  const cleanName = stats.firstName.replace(/[^a-z0-9]/gi, '') || 'Student';
  link.download = `Ledger_Wrapped_${cleanName}_${theme}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareWrappedImage(
  stats: WrappedAnalytics,
  theme: WrappedCardTheme = 'cobalt'
): Promise<'shared' | 'downloaded'> {
  const canvas = await generateWrappedCanvas(stats, theme);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
  );

  if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const cleanName = stats.firstName.replace(/[^a-z0-9]/gi, '') || 'Student';
    const file = new File([blob], `Ledger_Wrapped_${cleanName}.png`, { type: 'image/png' });
    const shareData = {
      title: `${stats.firstName}'s Semester Wrapped · Ledger`,
      text: `${stats.overallPercentage.toFixed(1)}% attendance · ${stats.totalBunked} bunks bunked (${stats.hoursBunked}h free) · ${stats.archetype.title}`,
      files: [file],
    };
    if (navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return 'shared';
    }
  }

  await downloadWrappedImage(stats, theme);
  return 'downloaded';
}
