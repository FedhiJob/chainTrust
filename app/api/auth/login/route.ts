import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import { getAuditContext, writeAuditLogSafely } from "@/lib/audit";
import { failure, success } from "@/lib/response";
import { isRole } from "@/lib/roles";
import { assertSameOrigin, getRateLimitHeaders, rateLimitLogin } from "@/lib/security";
import { getZodErrorMessage, loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const requestAudit = getAuditContext(request);

  try {
    if (!assertSameOrigin(request)) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.login",
        targetType: "session",
        status: "blocked",
        detail: { reason: "cross_site_blocked" },
      });
      return failure("Cross-site request blocked", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.login",
        targetType: "session",
        status: "failure",
        detail: { reason: "invalid_input" },
      });
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const password = parsed.data.password;
    const email = parsed.data.email.trim().toLowerCase();
    const rateLimit = rateLimitLogin(request, email);
    if (!rateLimit.allowed) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.login",
        targetType: "session",
        status: "blocked",
        detail: { reason: "rate_limited", email },
      });
      return failure("Too many login attempts. Please try again later.", 429, getRateLimitHeaders(rateLimit.resetAt, rateLimit.remaining));
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.login",
        targetType: "user",
        status: "failure",
        detail: { reason: "user_not_found", email },
      });
      return failure("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.login",
        targetType: "user",
        targetId: user.id,
        status: "failure",
        detail: { reason: "invalid_password", email },
      });
      return failure("Invalid email or password", 401);
    }

    if (!isRole(user.role)) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.login",
        targetType: "user",
        targetId: user.id,
        status: "blocked",
        detail: { reason: "invalid_role", email, role: user.role },
      });
      return failure("Account role is invalid", 403);
    }

    const token = signToken({ id: user.id, role: user.role });
    await setAuthCookie(token);
    await writeAuditLogSafely({
      ...requestAudit,
      actorId: user.id,
      actorRole: user.role,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
      status: "success",
      detail: { email },
    });

    return success({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt,
    });
  } catch {
    await writeAuditLogSafely({
      ...requestAudit,
      action: "auth.login",
      targetType: "session",
      status: "failure",
      detail: { reason: "server_error" },
    });
    return failure("Login failed", 500);
  }
}
