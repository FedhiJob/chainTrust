import { clearAuthCookie } from "@/lib/auth";
import { getAuditContext, writeAuditLogSafely } from "@/lib/audit";
import { failure, success } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const requestAudit = getAuditContext(request);

  if (!assertSameOrigin(request)) {
    await writeAuditLogSafely({
      ...requestAudit,
      action: "auth.logout",
      targetType: "session",
      status: "blocked",
      detail: { reason: "cross_site_blocked" },
    });
    return failure("Cross-site request blocked", 403);
  }

  await clearAuthCookie();
  await writeAuditLogSafely({
    ...requestAudit,
    action: "auth.logout",
    targetType: "session",
    status: "success",
  });
  return success({});
}
