const WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 5;
const REGISTER_LIMIT = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getBaseOrigin(request: Request) {
  const appBaseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (appBaseUrl) {
    try {
      return new URL(appBaseUrl).origin;
    } catch {
      return null;
    }
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!forwardedHost) return null;

  return `${forwardedProto ?? "https"}://${forwardedHost}`;
}

function getRequestOrigin(request: Request) {
  return request.headers.get("origin") ?? request.headers.get("referer");
}

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [ip] = forwardedFor.split(",");
    return ip?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function now() {
  return Date.now();
}

function consumeRateLimit(key: string, limit: number) {
  const currentTime = now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= currentTime) {
    rateLimitStore.set(key, { count: 1, resetAt: currentTime + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: currentTime + WINDOW_MS };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export function assertSameOrigin(request: Request) {
  const baseOrigin = getBaseOrigin(request);
  const requestOrigin = getRequestOrigin(request);

  if (!baseOrigin || !requestOrigin) {
    return false;
  }

  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedRequestOrigin) {
    return false;
  }

  return normalizedRequestOrigin === baseOrigin;
}

export function rateLimitLogin(request: Request, email: string) {
  const clientIp = getClientIp(request);
  return consumeRateLimit(`login:${clientIp}:${email.toLowerCase()}`, LOGIN_LIMIT);
}

export function rateLimitRegistration(request: Request, email: string) {
  const clientIp = getClientIp(request);
  return consumeRateLimit(`register:${clientIp}:${email.toLowerCase()}`, REGISTER_LIMIT);
}

export function getRateLimitHeaders(resetAt: number, remaining: number) {
  const resetAfterSeconds = Math.max(0, Math.ceil((resetAt - now()) / 1000));

  return {
    "Retry-After": String(resetAfterSeconds),
    "X-RateLimit-Remaining": String(remaining),
  };
}

export function getSecurityHeaders() {
  return {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
