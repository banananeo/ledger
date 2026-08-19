import * as cheerio from "cheerio";
import type { CourseSlotLookup, ScheduleDay, ScheduleEntry } from "../types.js";
import { strip } from "../utils/text.js";

function parseTime(time: string): number {
  if (!time) return 0;
  const match = time.trim().match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (!meridiem && hours >= 1 && hours <= 6) hours += 12;
  return hours * 60 + minutes;
}

export class TimetableParser {
  static extract(
    htmlContent: string | null,
    courseSlotLookup: Record<string, CourseSlotLookup>,
  ): ScheduleDay[] {
    if (!htmlContent) return [];
    const $ = cheerio.load(htmlContent);
    const table = $("table[align=center][width=400]").filter((_, el) =>
      $(el).text().toLowerCase().includes("unified time table")
    ).first();

    if (!table.length) return [];

    const rows = table.find("tr").toArray();
    if (rows.length < 3) return [];

    const timeHeaders = $(rows[0])
      .find("td, th")
      .toArray()
      .map((cell) => strip($(cell).text()))
      .filter((text) => text.includes(":") && !text.toLowerCase().includes("from"));

    if (timeHeaders.length === 0) return [];

    const schedule: ScheduleDay[] = [];

    for (const row of rows) {
      const columns = $(row).find("td").toArray();
      if (columns.length < 2) continue;

      const dayText = strip($(columns[0]).text());
      const dayMatch = dayText.match(/Day\s*(\d+)/i);
      if (!dayMatch) continue;

      const entries: ScheduleEntry[] = [];
      let colIndex = 0;

      columns.slice(1).forEach((cell) => {
        const $cell = $(cell);
        const colspan = parseInt($cell.attr("colspan") || "1", 10);
        
        if (colIndex >= timeHeaders.length) {
          colIndex += colspan;
          return;
        }

        const rawSlot = strip($cell.text());
        const slotCode = strip(rawSlot.split("/")[0]);
        const slotDetails = courseSlotLookup[slotCode];

        if (slotCode && slotCode !== "-" && slotDetails) {
          const startLabel = normalizeTimeLabel(timeHeaders[colIndex]);
          const endHeader = timeHeaders[colIndex + colspan - 1] || timeHeaders[colIndex];
          const endLabel = normalizeTimeLabel(endHeader);
          const [startTime] = splitTimeLabel(startLabel);
          const [, endTime] = splitTimeLabel(endLabel);
          const timeLabel = `${startTime} - ${endTime}`;

          entries.push({
            slotCode,
            courseCode: slotDetails.courseCode,
            // Clean up any trailing /t, /T, /p, /P that Academia sometimes appends
            courseTitle: slotDetails.courseTitle.replace(/\s*\/?\s*(t|p)\s*$/i, "").trim(),
            slotType: slotDetails.slotType,
            rawType: slotDetails.rawType,
            room: slotDetails.room || "TBA",
            faculty: slotDetails.faculty || "TBA",
            timeLabel,
            startTime,
            endTime,
          });
        }

        colIndex += colspan;
      });

      // Sort entries chronologically by parsed time
      entries.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

      schedule.push({ dayLabel: `Day ${dayMatch[1]}`, entries });
    }

    return schedule;
  }
}

function normalizeTimeLabel(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
}

function splitTimeLabel(value: string): [string, string] {
  const [start = "", end = ""] = value.split("-").map((part) => strip(part));
  return [start, end];
}

