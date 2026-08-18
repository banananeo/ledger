import type { AppData } from "./types";

const COOKIE_STORAGE_KEY = "eduwars_session_cookies";
const PROFILE_STORAGE_KEY = "eduwars_student_profile";
const METADATA_STORAGE_KEY = "eduwars_last_sync";

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

export function clearStoredSession() {
  try {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(METADATA_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}

export async function login(payload: LoginPayload): Promise<AppData> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

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

  return data as AppData;
}

export async function refreshSession(payload: RefreshPayload): Promise<AppData> {
  const response = await fetch("/api/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

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
