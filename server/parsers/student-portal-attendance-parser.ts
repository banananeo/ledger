import * as cheerio from "cheerio";
import type { AttendanceRecord } from "../types.js";
import { strip } from "../utils/text.js";

const COURSE_CODE_PATTERN = /^[A-Z0-9]{8,12}$/;

export class StudentPortalAttendanceParser {
    static extract(htmlContent: string | null): AttendanceRecord[] {
        if (!htmlContent) return [];

        const $ = cheerio.load(htmlContent);
        const courses: AttendanceRecord[] = [];

        $("table").each((_, table) => {
            const headers = $(table)
                .find("tr")
                .first()
                .find("th, td")
                .map((_, cell) => strip($(cell).text()).toLowerCase())
                .get();

            const hasAttendanceTable =
                headers.includes("code") &&
                headers.includes("description") &&
                headers.includes("max. hours") &&
                headers.includes("att. hours") &&
                headers.includes("absent hours") &&
                headers.includes("total percentage");

            if (!hasAttendanceTable) return;

            $(table)
                .find("tr")
                .slice(1)
                .each((_, row) => {
                    const columns = $(row)
                        .find("td")
                        .map((_, cell) => strip($(cell).text()))
                        .get();

                    if (columns.length < 6) return;

                    const code = columns[0].trim();

                    if (!COURSE_CODE_PATTERN.test(code)) return;

                    const title = columns[1].trim();

                    const conducted = Number.parseInt(columns[3], 10);
                    const absent = Number.parseInt(columns[4], 10);

                    const percentageText = columns[5]
                        .replace("%", "")
                        .trim();

                    const percentage = Number.parseFloat(
                        percentageText
                    );

                    if (
                        Number.isNaN(conducted) ||
                        Number.isNaN(absent) ||
                        Number.isNaN(percentage)
                    ) {
                        return;
                    }

                    courses.push({
                        courseCode: code,
                        courseTitle: title,
                        courseType: "",
                        slot: "",
                        classesConducted: conducted,
                        classesAbsent: absent,
                        attendancePercentage: percentage,
                    });
                });
        });

        return courses;
    }
}