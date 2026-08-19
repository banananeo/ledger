import express, { Express, Request, Response } from "express";
import { loadLoginData, loadRefreshData, buildLoginResponse, loadCalendarData, loadAttendanceHtml } from "./shared/loader.js";
import { AttendanceParser } from "./parsers/attendance-parser.js";
import { MarksParser } from "./parsers/marks-parser.js";
import { HttpError } from "./shared/errors.js";
import { getDemoData } from "./shared/demo-data.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  const router = express.Router();

  // Health check
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Login handler
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { username, password, isDemo } = req.body || {};

      // Demo login support
      if (
        isDemo ||
        username?.toLowerCase() === "demo" ||
        username?.toLowerCase() === "test" ||
        username === "RA2311003010482"
      ) {
        return res.json(getDemoData());
      }

      if (!username || !password) {
        return res.status(400).json({
          detail: "Username and password are required",
        });
      }

      const loginData = await loadLoginData(req.body);
      const response = buildLoginResponse(loginData);
      return res.json(response);
    } catch (err: any) {
      if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ detail: err.detail });
      }
      if (err instanceof TypeError) {
        return res.status(503).json({
          detail: "Academia server is unreachable or timed out. Please try again or explore with Demo Mode.",
        });
      }
      const message = err?.message || "Login failed. Please check your credentials.";
      return res.status(400).json({ detail: message });
    }
  });

  // Refresh handler
  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      const { cookies, isDemo } = req.body || {};

      if (isDemo || cookies?.JSESSIONID === "DEMO_SESSION_ID_XYZ") {
        const demo = getDemoData();
        return res.json({
          success: true,
          attendance: demo.attendance,
          marks: demo.marks,
          courses: demo.courses,
          schedule: demo.schedule,
          calendar: demo.calendar,
          session: demo.session,
          metadata: demo.metadata,
        });
      }

      const hasCookies = cookies && Object.keys(cookies).length > 0;
      const hasCreds = req.body?.username && req.body?.password;

      if (!hasCookies && !hasCreds) {
        return res.status(401).json({ detail: "No session cookies or login credentials provided" });
      }

      const data = await loadRefreshData(req.body);
      return res.json({
        success: true,
        attendance: AttendanceParser.extract(data.attendanceHtml),
        marks: MarksParser.extract(data.attendanceHtml),
        courses: data.courses,
        schedule: data.schedule,
        calendar: data.calendar,
        session: { cookies: data.client.sessionManager.getCookieObject() },
        metadata: data.metadata,
      });
    } catch (err: any) {
      if (err instanceof HttpError) {
        // Genuine auth problems (invalid/expired cookies with no fallback creds)
        return res.status(err.statusCode).json({ detail: err.detail });
      }
      if (err instanceof TypeError) {
        // Network-level failure reaching Academia — not an auth problem
        return res.status(503).json({
          detail: "Academia server is unreachable or timed out. Please try again.",
        });
      }
      // Parsing errors, unexpected page structure, etc. — not an auth problem
      const message = err?.message || "Session refresh failed";
      return res.status(500).json({ detail: message });
    }
  });

  // Attendance handler
  router.post("/attendance", async (req: Request, res: Response) => {
    try {
      const { cookies } = req.body || {};
      if (cookies?.JSESSIONID === "DEMO_SESSION_ID_XYZ") {
        return res.json({
          success: true,
          attendance: getDemoData().attendance,
        });
      }
      const result = await loadAttendanceHtml(req.body);
      return res.json({
        success: true,
        attendance: AttendanceParser.extract(result.attendanceHtml),
        session: { cookies: result.client.sessionManager.getCookieObject() },
        metadata: result.metadata,
      });
    } catch (err: any) {
      if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ detail: err.detail });
      }
      return res.status(500).json({ detail: err?.message || "Failed to fetch attendance" });
    }
  });

  // Marks handler
  router.post("/marks", async (req: Request, res: Response) => {
    try {
      const { cookies } = req.body || {};
      if (cookies?.JSESSIONID === "DEMO_SESSION_ID_XYZ") {
        return res.json({
          success: true,
          marks: getDemoData().marks,
        });
      }
      const result = await loadAttendanceHtml(req.body);
      return res.json({
        success: true,
        marks: MarksParser.extract(result.attendanceHtml),
        session: { cookies: result.client.sessionManager.getCookieObject() },
        metadata: result.metadata,
      });
    } catch (err: any) {
      if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ detail: err.detail });
      }
      return res.status(500).json({ detail: err?.message || "Failed to fetch marks" });
    }
  });

  // Calendar handler
  router.post("/calendar", async (req: Request, res: Response) => {
    try {
      const { cookies } = req.body || {};
      if (cookies?.JSESSIONID === "DEMO_SESSION_ID_XYZ") {
        return res.json({
          success: true,
          calendar: getDemoData().calendar,
        });
      }
      const result = await loadCalendarData(req.body);
      return res.json({
        success: true,
        calendar: result.calendar,
        session: { cookies: result.client.sessionManager.getCookieObject() },
        metadata: result.metadata,
      });
    } catch (err: any) {
      if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ detail: err.detail });
      }
      return res.status(500).json({ detail: err?.message || "Failed to fetch calendar" });
    }
  });

  app.use("/api", router);
  app.use("/", router);

  return app;
}

