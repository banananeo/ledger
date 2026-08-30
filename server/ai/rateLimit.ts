type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (e.count < MAX_REQUESTS) {
    e.count += 1;
    return { allowed: true };
  }
  return { allowed: false, retryAfterMs: e.windowStart + WINDOW_MS - now };
}

export function rateLimitKey(req: any): string {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
  const jsession = req.body?.cookies?.JSESSIONID || req.body?.session?.cookies?.JSESSIONID || "";
  const user = req.body?.username || "";
  return `${ip}:${jsession || user || "anon"}`;
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.windowStart > WINDOW_MS * 2) store.delete(k);
  }
}, WINDOW_MS).unref?.();
