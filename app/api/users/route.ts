import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { isRole } from "@/lib/roles";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "distributor") {
      return failure("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const requestedRole = searchParams.get("role");

    if (requestedRole && !isRole(requestedRole)) {
      return failure("Invalid role filter", 400);
    }

    if (auth.role === "distributor" && requestedRole && requestedRole !== "receiver") {
      return failure("Distributors can only access receivers", 403);
    }

    const role = auth.role === "distributor" ? "receiver" : requestedRole ?? undefined;

    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organization: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return success(users);
  } catch {
    return failure("Failed to load users", 500);
  }
}
