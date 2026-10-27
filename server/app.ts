import express, { Express, Request, Response } from "express";
import { loadLoginData, loadRefreshData, buildLoginResponse, loadCalendarData, loadAttendanceHtml } from "./shared/loader.js";
import { AttendanceParser } from "./parsers/attendance-parser.js";
import { MarksParser } from "./parsers/marks-parser.js";
import { HttpError } from "./shared/errors.js";
import { getDemoData } from "./shared/demo-data.js";
import { generateAIResponse, isGeminiConfigured } from "./ai/gemini.js";
import { checkRateLimit, rateLimitKey } from "./ai/rateLimit.js";
import { getJaawCaptcha, loginWithJaaw, refreshJaawSession } from "./shared/client.js";
import { randomUUID } from "crypto";
const studentPortalSessions = new Map<
  string,
  {
    cdigest: string;
    image: string;
  }
>();
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
      const { cookies, isDemo, source } = req.body || {};

      if (source === "student-portal") {
        if (!cookies || typeof cookies !== "object" || Object.keys(cookies).length === 0) {
          return res.status(401).json({ detail: "No Student Portal session cookies provided" });
        }
        const refreshed = await refreshJaawSession(cookies);
        return res.json({
          success: true,
          attendance: refreshed.attendance,
          marks: refreshed.marks,
          session: { cookies: refreshed.cookies },
          metadata: { loginBy: "student-portal", source: "student-portal" },
        });
      }

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
          detail: req.body?.source === "student-portal"
            ? "Student Portal session service is unreachable or timed out. Please try again."
            : "Academia server is unreachable or timed out. Please try again.",
        });
      }
      // Parsing errors, unexpected page structure, etc. — not an auth problem
      const message = err?.message || "Session refresh failed";
      return res.status(500).json({ detail: message });
    }
  });
  router.get("/student-portal/captcha", async (_req: Request, res: Response) => {
    try {
      const captcha = await getJaawCaptcha();

      const challengeId = randomUUID();

      studentPortalSessions.set(challengeId, {
        cdigest: captcha.cdigest,
        image: captcha.image,
      });

      return res.json({
        success: true,
        challengeId,
        imageUrl: captcha.image.startsWith("data:") || captcha.image.startsWith("http")
          ? captcha.image
          : `data:image/png;base64,${captcha.image}`,
      });
    } catch (err: any) {
      console.error("[Student Portal CAPTCHA]", err);

      return res.status(500).json({
        detail:
          err?.message ||
          "Failed to fetch Student Portal CAPTCHA",
      });
    }
  });
  router.get(
    "/student-portal/captcha-image/:challengeId",
    async (req: Request, res: Response) => {
      try {
        const session = studentPortalSessions.get(
          req.params.challengeId
        );

        if (!session) {
          return res.status(404).json({
            detail:
              "CAPTCHA session not found or expired",
          });
        }

        if (session.image.startsWith("data:") || session.image.startsWith("http")) {
          return res.redirect(session.image);
        }
        res.setHeader("Content-Type", "image/png");
        return res.send(Buffer.from(session.image, "base64"));
      } catch (err: any) {
        console.error(
          "[Student Portal CAPTCHA Image]",
          err
        );

        return res.status(500).json({
          detail:
            err?.message ||
            "Failed to return CAPTCHA image",
        });
      }
    }
  );
  // attendance handler
  // Student Portal attendance handler
  router.post("/attendance", async (req: Request, res: Response) => {
    console.log("[StudentPortal] ATTENDANCE ROUTE HIT");
    try {
      const {
        username,
        password,
        captcha,
        challengeId,
        isDemo,
      } = req.body || {};

      if (isDemo) {
        return res.json({
          success: true,
          attendance: getDemoData().attendance,
        });
      }

      if (!username || !password) {
        return res.status(400).json({
          detail:
            "Student Portal username and password are required",
        });
      }

      if (!captcha) {
        return res.status(400).json({
          detail:
            "Student Portal CAPTCHA is required",
        });
      }

      if (!challengeId) {
        return res.status(400).json({
          detail:
            "Student Portal CAPTCHA session is required",
        });
      }

      const session =
        studentPortalSessions.get(challengeId);

      if (!session) {
        return res.status(400).json({
          detail:
            "Student Portal CAPTCHA session expired. Please request a new CAPTCHA.",
        });
      }

      /*
       * CAPTCHA sessions are single-use.
       */
      studentPortalSessions.delete(challengeId);
      const data = await loginWithJaaw(username, password, captcha, session.cdigest);

      return res.json({
        success: true,
        attendance: data.attendance,
        marks: data.marks,
        session: { cookies: data.cookies },
        metadata: { loginBy: "student-portal", source: "student-portal" },
      });
    } catch (err: any) {
      console.error(
        "[Student Portal Attendance]",
        err
      );

      return res.status(/invalid|credential|captcha|auth/i.test(err?.message || "") ? 401 : 500).json({
        detail:
          err?.message ||
          "Failed to fetch attendance from SRM Student Portal",
      });
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

  // AI health
  router.get("/ai/health", (_req: Request, res: Response) => {
    res.json({ configured: isGeminiConfigured(), model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
  });

  // AI Chat handler (supports streaming via SSE if ?stream=1)
  router.post("/ai/chat", async (req: Request, res: Response) => {
    const key = rateLimitKey(req);
    const rl = checkRateLimit(key);
    if (!rl.allowed) {
      return res.status(429).json({ detail: `Rate limited. Try again in ${Math.ceil((rl.retryAfterMs || 60000) / 1000)}s.` });
    }
    if (!isGeminiConfigured()) {
      return res.status(503).json({ detail: "AI not configured. Set GEMINI_API_KEY on server." });
    }
    try {
      const { message, context, model } = req.body || {};
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ detail: "message is required" });
      }
      if (message.length > 2000) {
        return res.status(400).json({ detail: "message too long (max 2000 chars)" });
      }
      // Sanitize context: only allow known shape, drop cookies/passwords if any
      const safeContext: any = {};
      if (context && typeof context === "object") {
        if (context.profile) safeContext.profile = context.profile;
        if (Array.isArray(context.attendance)) safeContext.attendance = context.attendance.slice(0, 20);
        if (Array.isArray(context.marks)) safeContext.marks = context.marks.slice(0, 20);
        if (Array.isArray(context.schedule)) safeContext.schedule = context.schedule.slice(0, 6);
        if (context.calendar) safeContext.calendar = context.calendar;
      }

      const wantsStream = req.query.stream === "1" || req.body?.stream === true;
      if (wantsStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        let full = "";
        try {
          full = await generateAIResponse({
            message,
            context: safeContext,
            model,
            stream: true,
            onChunk: (chunk) => {
              res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            },
          });
        } catch (e: any) {
          res.write(`data: ${JSON.stringify({ error: e?.message || "AI error" })}\n\n`);
          res.end();
          return;
        }
        res.write(`data: ${JSON.stringify({ done: true, full })}\n\n`);
        res.end();
        return;
      }

      const reply = await generateAIResponse({ message, context: safeContext, model });
      return res.json({ success: true, reply });
    } catch (err: any) {
      return res.status(500).json({ detail: err?.message || "AI request failed" });
    }
  });

  // AI quick summary
  router.post("/ai/summary", async (req: Request, res: Response) => {
    const key = rateLimitKey(req);
    const rl = checkRateLimit(key);
    if (!rl.allowed) return res.status(429).json({ detail: "Rate limited" });
    if (!isGeminiConfigured()) return res.status(503).json({ detail: "AI not configured" });
    try {
      const { context } = req.body || {};
      const safeContext: any = {};
      if (context && typeof context === "object") {
        if (context.profile) safeContext.profile = context.profile;
        if (Array.isArray(context.attendance)) safeContext.attendance = context.attendance.slice(0, 20);
        if (Array.isArray(context.marks)) safeContext.marks = context.marks.slice(0, 20);
        if (Array.isArray(context.schedule)) safeContext.schedule = context.schedule.slice(0, 6);
        if (context.calendar) safeContext.calendar = context.calendar;
      }
      const reply = await generateAIResponse({
        message: "Create a concise academic brief with these Markdown headings: Now, Attendance, Marks, This week. Give one urgent next action, attendance risk or skip margin, marks recovery priority, and a practical plan for the next seven days. Be brief.",
        context: safeContext,
      });
      return res.json({ success: true, reply });
    } catch (err: any) {
      return res.status(500).json({ detail: err?.message || "AI summary failed" });
    }
  });

  app.use("/api", router);
  app.use("/", router);

  return app;
}

