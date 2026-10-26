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
  detail?: string;
  message?: string;
}

export interface StudentPortalData {
  attendance: unknown[];
  marks: unknown[];
  cookies: Record<string, string>;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${JAAW_API_BASE_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as T & { detail?: string; message?: string };
  if (!response.ok) {
    throw new Error(result.detail || result.message || `jaaw API request failed (${response.status})`);
  }
  return result;
}

export async function getJaawCaptcha(): Promise<JaawCaptchaResponse> {
  const result = await request<JaawCaptchaResponse>("/sp/captcha");
  if (!result.success || !result.cdigest || !result.image) {
    throw new Error("jaaw returned an invalid CAPTCHA response");
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
    throw new Error(result.detail || result.message || "jaaw could not authenticate with the Student Portal");
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
    throw new Error(result.detail || result.message || "jaaw could not refresh the Student Portal session");
  }
  return {
    attendance: result.attendance,
    marks: result.marks,
    cookies: result.session?.cookies || cookies,
  };
}
