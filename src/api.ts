import type { AppData } from "./types";

const COOKIE_STORAGE_KEY = "eduwars_session_cookies";
const PROFILE_STORAGE_KEY = "eduwars_student_profile";
const METADATA_STORAGE_KEY = "eduwars_last_sync";
const CREDS_STORAGE_KEY = "eduwars_user_creds";

export interface StoredCredentials {
  username: string;
  password?: string;
}

export interface LoginPayload {
  username?: string;
  password?: string;
  captcha?: string;
  cdigest?: string;
  isDemo?: boolean;
}

export interface RefreshPayload {
  cookies?: Record<string, string>;
  username?: string;
  password?: string;
  captcha?: string;
  cdigest?: string;
  isDemo?: boolean;
}

export interface CaptchaChallenge {
  type: "CAPTCHA_REQUIRED";
  message: string;
  cdigest: string;
  image: string;
}

export class ApiError extends Error {
  captchaChallenge?: CaptchaChallenge;
  statusCode?: number;

  constructor(message: string, statusCode?: number, challenge?: CaptchaChallenge) {
    super(message);
    this.statusCode = statusCode;
    this.captchaChallenge = challenge;
  }
}

export function getStoredCookies(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCookies(cookies: Record<string, string>) {
  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(cookies));
  } catch (err) {
    console.error("Failed to save cookies to localStorage:", err);
  }
}

export function getStoredCredentials(): StoredCredentials | null {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch {
    return null;
  }
}

export function saveStoredCredentials(creds: StoredCredentials) {
  try {
    if (!creds.username) return;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(creds))));
    localStorage.setItem(CREDS_STORAGE_KEY, encoded);
  } catch (err) {
    console.error("Failed to save credentials to localStorage:", err);
  }
}

export function getStoredData(): AppData | null {
  try {
    const raw = localStorage.getItem('eduwars_dashboard_data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredData(data: AppData) {
  try {
    localStorage.setItem('eduwars_dashboard_data', JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save data to localStorage:", err);
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(METADATA_STORAGE_KEY);
    localStorage.removeItem('eduwars_dashboard_data');
    localStorage.removeItem(CREDS_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}

async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      const snippet = text.replace(/<[^>]*>/g, '').trim();
      throw new ApiError(
        snippet ? `Server error (${response.status}): ${snippet.slice(0, 120)}` : `Server error (${response.status}: ${response.statusText})`,
        response.status
      );
    }
    throw new ApiError(`Invalid server response format (${response.status})`, response.status);
  }
}

export async function login(payload: LoginPayload): Promise<AppData> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const detail = data?.detail;
    if (detail && typeof detail === "object" && detail.type === "CAPTCHA_REQUIRED") {
      throw new ApiError(detail.message || "CAPTCHA verification required", response.status, detail);
    }
    const message = typeof detail === "string" ? detail : (detail?.message || "Failed to log in to Academia");
    throw new ApiError(message, response.status);
  }

  if (data?.session?.cookies) {
    saveStoredCookies(data.session.cookies);
  }

  if (payload.username && payload.password && !payload.isDemo) {
    saveStoredCredentials({
      username: payload.username,
      password: payload.password,
    });
  }

  return data as AppData;
}

export async function refreshSession(payload: RefreshPayload): Promise<AppData> {
  const response = await fetch("/api/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const detail = data?.detail;
    if (detail && typeof detail === "object" && detail.type === "CAPTCHA_REQUIRED") {
      throw new ApiError(detail.message || "CAPTCHA verification required", response.status, detail);
    }
    const message = typeof detail === "string" ? detail : (detail?.message || "Failed to refresh data");
    throw new ApiError(message, response.status);
  }

  if (data?.session?.cookies) {
    saveStoredCookies(data.session.cookies);
  }

  return data as AppData;
}

export interface AIChatPayload {
  message: string;
  context?: Partial<AppData>;
  model?: string;
  stream?: boolean;
}

export async function aiChat(payload: AIChatPayload): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new ApiError(typeof data?.detail === "string" ? data.detail : data?.detail?.message || "AI request failed", res.status);
  }
  return data.reply as string;
}

export async function aiChatStream(
  payload: AIChatPayload,
  onChunk: (chunk: string) => void
): Promise<string> {
  const res = await fetch("/api/ai/chat?stream=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true }),
  });
  if (!res.ok) {
    const data = await parseJsonResponse(res);
    throw new ApiError(typeof data?.detail === "string" ? data.detail : "AI streaming failed", res.status);
  }
  if (!res.body) {
    const data = await parseJsonResponse(res);
    return data.reply || data.full || "";
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const obj = JSON.parse(jsonStr);
        if (obj.chunk) {
          full += obj.chunk;
          onChunk(obj.chunk);
        }
        if (obj.done && obj.full) full = obj.full;
        if (obj.error) throw new Error(obj.error);
      } catch {}
    }
  }
  return full;
}

export async function aiHealth(): Promise<{ configured: boolean; model: string }> {
  const res = await fetch("/api/ai/health");
  const data = await parseJsonResponse(res);
  return data;
}

export async function aiSummary(context?: Partial<AppData>): Promise<string> {
  const res = await fetch("/api/ai/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new ApiError(typeof data?.detail === "string" ? data.detail : "AI summary failed", res.status);
  return data.reply as string;
}

