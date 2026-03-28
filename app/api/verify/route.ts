import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { getZodErrorMessage, verifySchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const auth = await getAuthPayload();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "receiver") {
      return failure("Only receivers can verify batches", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const { batchId } = parsed.data;

    const transfer = await prisma.transfer.findFirst({
      where: { batchId, receiverId: auth.id },
      orderBy: { createdAt: "desc" },
      include: { batch: { select: { status: true } } },
    });

    if (!transfer) return failure("Transfer not found", 404);
    if (transfer.verified) return failure("Transfer already verified", 400);
    if (transfer.batch.status === "delivered") {
      return failure("Batch already delivered", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const verifiedTransfer = await tx.transfer.update({
        where: { id: transfer.id },
        data: { verified: true },
      });

      await tx.batch.update({
        where: { id: batchId },
        data: { status: "delivered" },
      });

      return verifiedTransfer;
    });

    return success(updated);
  } catch (error) {
    return failure("Failed to verify transfer", 500);
  }
}
