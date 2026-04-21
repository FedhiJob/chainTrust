import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getAuditContext, writeAuditLogSafely } from "@/lib/audit";
import { getZodErrorMessage, registerSchema } from "@/lib/validators";
import { failure, success } from "@/lib/response";
import { assertSameOrigin, getRateLimitHeaders, rateLimitRegistration } from "@/lib/security";

export async function POST(request: Request) {
  const requestAudit = getAuditContext(request);

  try {
    if (!assertSameOrigin(request)) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.register",
        targetType: "user",
        status: "blocked",
        detail: { reason: "cross_site_blocked" },
      });
      return failure("Cross-site request blocked", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.register",
        targetType: "user",
        status: "failure",
        detail: { reason: "invalid_input" },
      });
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const fullName = parsed.data.fullName.trim();
    const email = parsed.data.email.trim().toLowerCase();
    const organization = parsed.data.organization.trim();
    const { password, role } = parsed.data;
    const rateLimit = rateLimitRegistration(request, email);
    if (!rateLimit.allowed) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.register",
        targetType: "user",
        status: "blocked",
        detail: { reason: "rate_limited", email },
      });
      return failure("Too many registration attempts. Please try again later.", 429, getRateLimitHeaders(rateLimit.resetAt, rateLimit.remaining));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "auth.register",
        targetType: "user",
        targetId: existing.id,
        status: "failure",
        detail: { reason: "email_in_use", email },
      });
      return failure("Email already in use", 409);
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashed,
        role,
        organization,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
      },
    });

    await writeAuditLogSafely({
      ...requestAudit,
      actorId: user.id,
      actorRole: user.role,
      action: "auth.register",
      targetType: "user",
      targetId: user.id,
      status: "success",
      detail: { email, role: user.role, organization: user.organization },
    });

    return success(user, 201);
  } catch {
    await writeAuditLogSafely({
      ...requestAudit,
      action: "auth.register",
      targetType: "user",
      status: "failure",
      detail: { reason: "server_error" },
    });
    return failure("Registration failed", 500);
  }
}
