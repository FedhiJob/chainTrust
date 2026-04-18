import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";

export async function GET() {
  try {
    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);

    if (auth.role === "admin") {
      const [totalUsers, totalBatches, totalTransfers] = await prisma.$transaction([
        prisma.user.count(),
        prisma.batch.count(),
        prisma.transfer.count(),
      ]);

      return success({ totalUsers, totalBatches, totalTransfers });
    }

    if (auth.role === "distributor") {
      const [activeBatches, transferredBatches, deliveredBatches] = await prisma.$transaction([
        prisma.batch.count({ where: { createdBy: auth.id, status: "active" } }),
        prisma.batch.count({ where: { createdBy: auth.id, status: "transferred" } }),
        prisma.batch.count({ where: { createdBy: auth.id, status: "delivered" } }),
      ]);

      return success({ activeBatches, transferredBatches, deliveredBatches });
    }

    const receivedBatches = await prisma.transfer.count({
      where: { receiverId: auth.id, verified: true },
    });

    const pendingConfirmations = await prisma.transfer.count({
      where: { receiverId: auth.id, verified: false },
    });

    return success({ receivedBatches, pendingConfirmations });
  } catch {
    return failure("Failed to load dashboard", 500);
  }
}
