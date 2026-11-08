const JAAW_API_BASE_URL = "https://api.jaaw.tosh.cc.cd";

interface JaawCaptchaResponse {
  success: boolean;
  cdigest: string;
  image: string;
}

interface JaawLoginResponse {
  success: boolean;
  source: "sp";
  attendance: unknown[];
  marks: unknown[];
  session: { cookies: Record<string, string> };
  detail?: unknown;
  message?: string;
}

export interface StudentPortalData {
  attendance: unknown[];
  marks: unknown[];
  cookies: Record<string, string>;
}

/** Friendly text for the error codes the Student Portal API can return. */
const JAAW_CODE_MESSAGES: Record<string, string> = {
  WRONG_CAPTCHA: "Invalid CAPTCHA. Please request a new one and try again.",
  CAPTCHA_REQUIRED: "The CAPTCHA is required.",
  INVALID_CAPTCHA: "Invalid CAPTCHA. Please try again.",
  INVALID_CREDENTIALS: "Invalid SRM Net ID or password.",
  INVALID_LOGIN: "Invalid SRM Net ID or password.",
  AUTH_FAILED: "SRM Student Portal authentication failed.",
  SESSION_EXPIRED: "Student Portal session expired. Please log in again.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
};

function messageFrom(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parts = value.map(messageFrom).filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(" ") : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const direct = messageFrom(record.message) || messageFrom(record.msg) || messageFrom(record.error);
    if (direct) return direct;

    const nested = messageFrom(record.detail);
    if (nested) return nested;

    if (typeof record.type === "string") {
      const code = record.type.trim().toUpperCase();
      if (JAAW_CODE_MESSAGES[code]) return JAAW_CODE_MESSAGES[code];
      return code
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (char) => char.toUpperCase());
    }
  }

  return null;
}

/**
 * Turns any Student Portal API error payload into a human string.
 * The service can answer with detail as a string, object or array, so never
 * let a raw object reach `new Error()` (it would display as "[object Object]").
 */
export function describeJaawError(payload: unknown, fallback = "The SRM Student Portal request failed."): string {
  return messageFrom(payload) || fallback;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${JAAW_API_BASE_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as T & Record<string, unknown>;
  if (!response.ok) {
    throw new Error(describeJaawError(result, `jaaw API request failed (${response.status})`));
  }
  return result;
}

export async function getJaawCaptcha(): Promise<JaawCaptchaResponse> {
  const result = await request<JaawCaptchaResponse>("/sp/captcha");
  if (!result.success || !result.cdigest || !result.image) {
    throw new Error(
      describeJaawError(result, "The Student Portal CAPTCHA service returned an invalid response."),
    );
  }
  return result;
}

export async function loginWithJaaw(
  username: string,
  password: string,
  captcha: string,
  cdigest: string,
): Promise<StudentPortalData> {
  const result = await request<JaawLoginResponse>("/sp/login", {
    username,
    password,
    captcha,
    cdigest,
  });
  if (!result.success || !Array.isArray(result.attendance) || !Array.isArray(result.marks)) {
    throw new Error(
      describeJaawError(result, "SRM Student Portal could not authenticate with those credentials."),
    );
  }
  return {
    attendance: result.attendance,
    marks: result.marks,
    cookies: result.session?.cookies || {},
  };
}

export async function refreshJaawSession(cookies: Record<string, string>): Promise<StudentPortalData> {
  const result = await request<JaawLoginResponse>("/sp/refresh", { cookies });
  if (!result.success || !Array.isArray(result.attendance) || !Array.isArray(result.marks)) {
    throw new Error(
      describeJaawError(result, "SRM Student Portal could not refresh this session."),
    );
  }
  return {
    attendance: result.attendance,
    marks: result.marks,
    cookies: result.session?.cookies || cookies,
  };
}
