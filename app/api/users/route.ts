import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { failure, success } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const auth = await getAuthPayload();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "distributor") {
      return failure("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? undefined;

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
  } catch (error) {
    return failure("Failed to load users", 500);
  }
}
