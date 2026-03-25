import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { failure, success } from "@/lib/response";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return failure("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
      },
    });

    if (!user) {
      return failure("User not found", 404);
    }

    return success(user);
  } catch (error) {
    return failure("Failed to fetch user", 500);
  }
}
