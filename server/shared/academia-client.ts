
import { PageDecoder } from "./page-decoder.js";
import { SessionManager } from "./session-manager.js";
import { BASE_URL, URLS, getCalendarUrl } from "../config.js";

export class PortalClient {
  readonly sessionManager: SessionManager;
  private username: string;
  private password: string;

  constructor(username?: string, password?: string, cookies?: Record<string, string>) {
    this.username = username ?? "";
    this.password = password ?? "";
    this.sessionManager = new SessionManager(cookies);
  }

  authenticate(captcha?: string, cdigest?: string): Promise<boolean> {
    return this.sessionManager.signIn(this.username, this.password, captcha, cdigest);
  }

  async fetchPage(
    urlKey: keyof typeof URLS,
    suffix = "",
  ): Promise<string | null> {
    const fullUrl = new URL(`${URLS[urlKey]}${suffix}`, BASE_URL).toString();
    const response = await this.sessionManager.get(fullUrl, { followRedirects: false });
    const location = response.headers.get("location") ?? "";

    if (
      response.status === 301 ||
      response.status === 302 ||
      location.toLowerCase().includes("signin")
    ) {
      return null;
    }

    return PageDecoder.decode(await response.text());
  }

  fetchProfile(): Promise<string | null> {
    return this.fetchPage("profile");
  }

  fetchAttendance(): Promise<string | null> {
    return this.fetchPage("attendance");
  }

  fetchTimetable(batch: string): Promise<string | null> {
    return this.fetchPage("gridBase", `_${batch}`);
  }

  fetchCalendar(plannerType: "ODD" | "EVEN"): Promise<string | null> {
  const url = getCalendarUrl(plannerType);
  const fullUrl = new URL(url, BASE_URL).toString();
  return this.sessionManager
    .get(fullUrl, { followRedirects: false })
    .then(async (response) => {
      const location = response.headers.get("location") ?? "";
      if (response.status === 301 || response.status === 302 || location.toLowerCase().includes("signin")) {
        return null;
      }
      return PageDecoder.decode(await response.text());
    });
  }
}
