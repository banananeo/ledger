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

function extractPageMessages($: cheerio.CheerioAPI): string[] {
    const messages = new Set<string>();

    $(
        '.alert, .error, .text-danger, .invalid-feedback, [id*="rror"], [class*="rror"], [class*="alert"]',
    ).each((_, el) => {
        const msg = $(el).text().replace(/\s+/g, " ").trim();

        if (msg && msg.length <= 200) {
            messages.add(msg);
        }
    });

    return Array.from(messages);
}

export class StudentPortalClient {
    private cookies = new Map<string, string>();

    /**
     * The login page used to obtain the CAPTCHA.
     * We keep it so the CAPTCHA and login request use the same session.
     */
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

    /**
     * Loads the Student Portal login page.
     *
     * This establishes the session that will later be used
     * for the CAPTCHA and login request.
     */
    async initialize(): Promise<string> {
        const response = await this.request(LOGIN_PAGE_URL);

        if (!response.ok) {
            throw new Error(
                `Student Portal login page failed: HTTP ${response.status}`,
            );
        }

        const html = await response.text();

        this.lastLoginPage = html;

        return html;
    }

    /**
     * Login using the CAPTCHA entered by the user.
     *
     * We only submit values that are actually provided by the
     * Student Portal login page. We do not generate or spoof
     * security/fingerprint tokens.
     */
    async login(
        username: string,
        password: string,
        captcha: string,
        telemetryPayload = "",
    ): Promise<boolean> {
        const loginPage =
            this.lastLoginPage ?? (await this.initialize());

        this.lastLoginPage = null;

        console.log("[StudentPortal] LOGIN METHOD STARTED");

        const $ = cheerio.load(loginPage);

        const form = $('input[name="password"]')
            .first()
            .closest("form");

        if (!form.length) {
            throw new Error(
                "Could not find Student Portal login form",
            );
        }

        const payload = new URLSearchParams();

        /*
         * Copy the fields that the portal itself exposes.
         */
        form.find("input[name]").each((_, el) => {
            const input = $(el);

            const name = input.attr("name");
            const type = (
                input.attr("type") || "text"
            ).toLowerCase();

            if (!name) return;

            if (
                ["submit", "button", "image", "reset", "file"].includes(
                    type,
                )
            ) {
                return;
            }

            if (
                (type === "checkbox" || type === "radio") &&
                input.attr("checked") === undefined
            ) {
                return;
            }

            payload.set(
                name,
                input.attr("value") ?? "",
            );
        });

        /*
         * Some fields can be outside the form.
         * We preserve them exactly as provided by the page.
         */
        $('input[name^="dtoken_"], input[name^="cptoken_"]').each(
            (_, el) => {
                const name = $(el).attr("name");

                if (name && !payload.has(name)) {
                    payload.set(
                        name,
                        $(el).attr("value") ?? "",
                    );
                }
            },
        );

        /*
         * These are the only values supplied by the user/application.
         */
        payload.set("username", username);
        payload.set("password", password);
        payload.set("captcha", captcha);

        /*
         * Keep telemetry support if the frontend already sends it,
         * but don't manufacture fingerprint/security values.
         */
        if (telemetryPayload) {
            payload.set(
                "telemetryPayload",
                telemetryPayload,
            );
        }

        console.log(
            "[StudentPortal] Login form fields:",
            Array.from(payload.keys()),
        );

        const action = form.attr("action");

        const postUrl = action
            ? new URL(
                action,
                LOGIN_PAGE_URL,
            ).toString()
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
        );

        /*
         * LoginServlet can return HTTP 200 even when authentication
         * fails. Therefore HTTP status alone isn't enough.
         */
        const $res = cheerio.load(text);

        const stillOnLogin =
            $res('input[name="password"]').length > 0 ||
            $res("#secure_captcha").length > 0;

        if (!stillOnLogin && response.ok) {
            console.log(
                "[StudentPortal] Login appears successful",
            );

            return true;
        }

        const baseline = new Set(
            extractPageMessages($),
        );

        const allMessages =
            extractPageMessages($res);

        const newMessages = allMessages.filter(
            (message) => !baseline.has(message),
        );

        console.error(
            "[StudentPortal] Login rejected:",
            response.status,
            response.url,
            "| messages:",
            newMessages,
        );

        return false;
    }

    /**
     * Fetch attendance using the authenticated session.
     */
    async fetchAttendance(): Promise<string> {
        const payload = new URLSearchParams();

        payload.set("iden", "9");
        payload.set("filter", "");
        payload.set("hdnFormDetails", "1");
        payload.set("csrfPreventionSalt", "");

        const response = await this.request(
            ATTENDANCE_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8",

                    Accept:
                        "text/html, */*; q=0.01",

                    Origin:
                        STUDENT_PORTAL_BASE_URL,

                    Referer:
                        `${STUDENT_PORTAL_BASE_URL}/srmiststudentportal/students/template/HRDSystem.jsp`,

                    "X-Requested-With":
                        "XMLHttpRequest",
                },

                body: payload,
            },
        );

        if (!response.ok) {
            throw new Error(
                `Student Portal attendance request failed: HTTP ${response.status}`,
            );
        }

        return await response.text();
    }

    /**
     * Return cookies so the server can keep the authenticated
     * Student Portal session.
     */
    getCookieObject(): Record<string, string> {
        return Object.fromEntries(
            this.cookies,
        );
    }

    /**
     * Load a fresh login page and retrieve its CAPTCHA.
     */
    async getCaptchaImage(): Promise<Buffer> {
        const loginPage =
            await this.initialize();

        const $ =
            cheerio.load(loginPage);

        const captchaSrc =
            $("#secure_captcha").attr(
                "data-src",
            );

        if (!captchaSrc) {
            throw new Error(
                "Could not find Student Portal CAPTCHA URL",
            );
        }

        const captchaUrl =
            new URL(
                captchaSrc,
                STUDENT_PORTAL_BASE_URL,
            ).toString();

        const response =
            await this.request(
                captchaUrl,
                {
                    headers: {
                        Accept:
                            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",

                        Referer:
                            LOGIN_PAGE_URL,
                    },
                },
            );

        if (!response.ok) {
            throw new Error(
                `Student Portal CAPTCHA request failed: HTTP ${response.status}`,
            );
        }

        const arrayBuffer =
            await response.arrayBuffer();

        return Buffer.from(
            arrayBuffer,
        );
    }
}