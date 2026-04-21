import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "admin") return failure("Forbidden", 403);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? undefined;
    const targetType = searchParams.get("targetType") ?? undefined;
    const targetId = searchParams.get("targetId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limitParam = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

    const logs = await prisma.auditLog.findMany({
      where: {
        action,
        targetType,
        targetId,
        status,
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            organization: true,
          },
        },
      },
    });

    return success(logs);
  } catch {
    return failure("Failed to load audit logs", 500);
  }
}
