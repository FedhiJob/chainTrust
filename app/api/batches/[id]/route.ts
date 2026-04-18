import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";

function canAccessBatch(userId: string, batch: { createdBy: string; transfers: { senderId: string; receiverId: string }[] }) {
  return (
    batch.createdBy === userId ||
    batch.transfers.some((transfer) => transfer.senderId === userId || transfer.receiverId === userId)
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);

    const { id } = await params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        transfers: {
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, fullName: true, organization: true } },
            receiver: { select: { id: true, fullName: true, organization: true } },
          },
        },
      },
    });

    if (!batch) return failure("Batch not found", 404);
    if (auth.role !== "admin" && !canAccessBatch(auth.id, batch)) {
      return failure("Forbidden", 403);
    }

    return success(batch);
  } catch {
    return failure("Failed to load batch", 500);
  }
}
