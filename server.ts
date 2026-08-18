import express, { Express, Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { loadLoginData, loadRefreshData, buildLoginResponse, loadCalendarData, loadAttendanceHtml } from "./server/shared/loader";
import { AttendanceParser } from "./server/parsers/attendance-parser";
import { MarksParser } from "./server/parsers/marks-parser";
import { HttpError } from "./server/shared/errors";
import { getDemoData } from "./server/shared/demo-data";

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

  // Health check
  const handleHealth = (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };
  app.get("/api/health", handleHealth);
  app.get("/health", handleHealth);

  // Login handler
  const handleLogin = async (req: Request, res: Response) => {
    try {
      const { username, password, captcha, cdigest, isDemo } = req.body || {};

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
  };
  app.post("/api/login", handleLogin);
  app.post("/login", handleLogin);

  // Refresh handler
  const handleRefresh = async (req: Request, res: Response) => {
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

      if (!cookies || Object.keys(cookies).length === 0) {
        return res.status(401).json({ detail: "No session cookies provided" });
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
        return res.status(err.statusCode).json({ detail: err.detail });
      }
      const message = err?.message || "Session refresh failed";
      return res.status(401).json({ detail: message });
    }
  };
  app.post("/api/refresh", handleRefresh);
  app.post("/refresh", handleRefresh);

  // Attendance handler
  const handleAttendance = async (req: Request, res: Response) => {
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
  };
  app.post("/api/attendance", handleAttendance);
  app.post("/attendance", handleAttendance);

  // Marks handler
  const handleMarks = async (req: Request, res: Response) => {
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
  };
  app.post("/api/marks", handleMarks);
  app.post("/marks", handleMarks);

  // Calendar handler
  const handleCalendar = async (req: Request, res: Response) => {
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
  };
  app.post("/api/calendar", handleCalendar);
  app.post("/calendar", handleCalendar);

  return app;
}

const app = createApp();

async function startServer() {
  const PORT = 3000;

  // Vite middleware in dev / Static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduWars Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the standalone server listener when not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

export default app;

