import * as cheerio from "cheerio";

const STUDENT_PORTAL_BASE_URL = "https://sp.srmist.edu.in";

const LOGIN_PAGE_URL =
    `${STUDENT_PORTAL_BASE_URL}/srmiststudentportal/students/loginManager/youLogin.jsp`;

const LOGIN_URL =
    `${STUDENT_PORTAL_BASE_URL}/srmiststudentportal/LoginServlet`;

const ATTENDANCE_URL =
    `${STUDENT_PORTAL_BASE_URL}/srmiststudentportal/students/report/studentAttendanceDetails.jsp`;

const DEFAULT_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/153.0.0.0 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export interface StudentPortalCaptcha {
    type: "STUDENT_PORTAL_CAPTCHA_REQUIRED";
    image: string;
}

export class StudentPortalClient {
    private cookies = new Map<string, string>();
    private lastLoginPage: string | null = null;

    constructor(initialCookies?: Record<string, string>) {
        if (initialCookies) {
            for (const [name, value] of Object.entries(initialCookies)) {
                this.cookies.set(name, value);
            }
        }
    }

    private captureCookies(response: Response) {
        const headers = response.headers as any;

        let setCookies: string[] = [];

        if (typeof headers.getSetCookie === "function") {
            setCookies = headers.getSetCookie() || [];
        } else {
            const raw = response.headers.get("set-cookie");

            if (raw) {
                setCookies = raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
            }
        }

        for (const header of setCookies) {
            const [cookiePart] = header.split(";");
            const separator = cookiePart.indexOf("=");

            if (separator < 1) continue;

            const name = cookiePart.slice(0, separator).trim();
            const value = cookiePart.slice(separator + 1).trim();

            this.cookies.set(name, value);
        }
    }

    private cookieHeader(): string {
        return Array.from(this.cookies.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
    }

    private async request(
        url: string,
        init: RequestInit = {},
    ): Promise<Response> {
        const headers = new Headers(DEFAULT_HEADERS);

        if (init.headers) {
            new Headers(init.headers).forEach((value, key) => {
                headers.set(key, value);
            });
        }

        const cookies = this.cookieHeader();

        if (cookies) {
            headers.set("Cookie", cookies);
        }

        const response = await fetch(url, {
            ...init,
            headers,
        });

        this.captureCookies(response);

        return response;
    }

    async initialize(): Promise<string> {
        const response = await this.request(LOGIN_PAGE_URL);

        if (!response.ok) {
            throw new Error(
                `Student Portal login page failed: HTTP ${response.status}`,
            );
        }

        return await response.text();
    }
    async login(
        username: string,
        password: string,
        captcha: string,
        telemetryPayload = "",
    ): Promise<boolean> {
        /*
         * Reuse the login page that rendered the CAPTCHA (if any) so the
         * hidden tokens match the CAPTCHA the user solved. Falls back to
         * a fresh page load.
         */
        const loginPage = this.lastLoginPage ?? (await this.initialize());
        this.lastLoginPage = null;

        console.log("[StudentPortal] LOGIN METHOD STARTED");

        const $ = cheerio.load(loginPage);

        /*
         * Locate the login form via its password field, then read every
         * named input straight from the HTML. This avoids guessing the
         * dynamic field names (ph_*, dtoken_*, cptoken_*).
         */
        const form = $('input[name="password"]').first().closest("form");

        if (!form.length) {
            throw new Error("Could not find Student Portal login form");
        }

        const payload = new URLSearchParams();
        const emptyHidden: string[] = [];

        form.find("input[name]").each((_, el) => {
            const input = $(el);
            const name = input.attr("name");
            const type = (input.attr("type") || "text").toLowerCase();

            if (!name) return;
            if (["submit", "button", "image", "reset", "file"].includes(type)) return;
            if (
                (type === "checkbox" || type === "radio") &&
                input.attr("checked") === undefined
            ) {
                return;
            }

            const value = input.attr("value") ?? "";
            payload.set(name, value);

            if (type === "hidden" && !value && /^(dtoken_|cptoken_)/.test(name)) {
                emptyHidden.push(name);
            }
        });

        /* Values we control. The honeypot (ph_*) is left as read: empty. */
        payload.set("username", username);
        payload.set("password", password);
        payload.set("captcha", captcha);
        payload.set("telemetryPayload", telemetryPayload);

        /* Log field names only, never values. */
        console.log(
            "[StudentPortal] Login form fields:",
            Array.from(payload.keys()),
        );

        if (emptyHidden.length > 0) {
            console.warn(
                "[StudentPortal] Security fields have no value in the HTML " +
                "(likely filled by guardlogin.js at submit time):",
                emptyHidden,
            );
        }

        const action = form.attr("action");
        const postUrl = action
            ? new URL(action, LOGIN_PAGE_URL).toString()
            : LOGIN_URL;

        const response = await this.request(postUrl, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
                Origin: STUDENT_PORTAL_BASE_URL,
                Referer: LOGIN_PAGE_URL,
            },
            body: payload,
            redirect: "follow",
        });

        const text = await response.text();

        console.log(
            "[StudentPortal] Login response:",
            response.status,
            response.url,
            Array.from(this.cookies.keys()),
        );

        /*
         * A failed login re-renders the login page at LoginServlet with
         * HTTP 200, so the URL cannot be used to detect success. If the
         * password field or CAPTCHA image is still present, we are still
         * on the login page.
         */
        const $res = cheerio.load(text);
        const stillOnLogin =
            $res('input[name="password"]').length > 0 ||
            $res("#secure_captcha").length > 0;

        if (!stillOnLogin && response.ok) {
            return true;
        }

        const messages = new Set<string>();
        $res(
            '.alert, .error, .text-danger, .invalid-feedback, [id*="rror"], [class*="rror"], [class*="alert"]',
        ).each((_, el) => {
            const msg = $res(el).text().replace(/\s+/g, " ").trim();
            if (msg && msg.length <= 200) messages.add(msg);
        });

        console.error(
            "[StudentPortal] Login rejected:",
            response.status,
            response.url,
            "| page messages:",
            Array.from(messages).slice(0, 5),
        );

        return false;
    }

    async fetchAttendance(): Promise<string> {
        const payload = new URLSearchParams();

        payload.set("iden", "9");
        payload.set("filter", "");
        payload.set("hdnFormDetails", "1");
        payload.set("csrfPreventionSalt", "");

        const response = await this.request(ATTENDANCE_URL, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                Accept: "text/html, */*; q=0.01",
                Origin: STUDENT_PORTAL_BASE_URL,
                Referer:
                    `${STUDENT_PORTAL_BASE_URL}/srmiststudentportal/students/template/HRDSystem.jsp`,
                "X-Requested-With": "XMLHttpRequest",
            },
            body: payload,
        });

        if (!response.ok) {
            throw new Error(
                `Student Portal attendance request failed: HTTP ${response.status}`,
            );
        }

        return await response.text();
    }

    getCookieObject(): Record<string, string> {
        return Object.fromEntries(this.cookies);
    }

    async getCaptchaImage(): Promise<Buffer> {
        /*
         * initialize() loads the login page and establishes
         * the Student Portal session.
         */
        const loginPage = await this.initialize();
        this.lastLoginPage = loginPage;

        const $ = cheerio.load(loginPage);

        /*
         * The Student Portal stores the CAPTCHA URL in:
         *
         * <img id="secure_captcha" data-src="...">
         *
         * The ts and token values are dynamically generated,
         * so we extract them instead of hard-coding them.
         */
        const captchaSrc = $("#secure_captcha").attr("data-src");

        if (!captchaSrc) {
            throw new Error(
                "Could not find Student Portal CAPTCHA URL",
            );
        }

        const captchaUrl = new URL(
            captchaSrc,
            STUDENT_PORTAL_BASE_URL,
        ).toString();

        const response = await this.request(captchaUrl, {
            headers: {
                Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                Referer: LOGIN_PAGE_URL,
            },
        });

        if (!response.ok) {
            throw new Error(
                `Student Portal CAPTCHA request failed: HTTP ${response.status}`,
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        return Buffer.from(arrayBuffer);
    }

}