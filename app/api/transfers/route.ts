import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { transferCreateSchema } from "@/lib/validators";
import { sha256 } from "@/lib/hash";

function getCurrentOwnerId(batch: { createdBy: string; transfers: { receiverId: string }[] }) {
  return batch.transfers[0]?.receiverId ?? batch.createdBy;
}

export async function GET() {
  try {
    const auth = await getAuthPayload();
    if (!auth) return failure("Unauthorized", 401);

    const transfers = await prisma.transfer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        batch: { select: { id: true, batchCode: true, medicineName: true } },
        sender: { select: { id: true, fullName: true, organization: true } },
        receiver: { select: { id: true, fullName: true, organization: true } },
      },
    });

    if (auth.role === "admin") return success(transfers);

    const filtered = transfers.filter((transfer) =>
      auth.role === "receiver" ? transfer.receiverId === auth.id : transfer.senderId === auth.id
    );

    return success(filtered);
  } catch (error) {
    return failure("Failed to load transfers", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthPayload();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "distributor") {
      return failure("Only distributors can create transfers", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = transferCreateSchema.safeParse(body);

    if (!parsed.success) {
      return failure(parsed.error.errors[0]?.message ?? "Invalid input", 400);
    }

    const { batchId, receiverId, senderId, location, note } = parsed.data;

    if (senderId && senderId !== auth.id) {
      return failure("Sender does not match authenticated user", 403);
    }
    if (receiverId === auth.id) {
      return failure("Cannot transfer a batch to yourself", 400);
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { transfers: { orderBy: { createdAt: "desc" } } },
    });

    if (!batch) return failure("Batch not found", 404);
    if (batch.status === "delivered") {
      return failure("Batch already delivered", 400);
    }

    const currentOwnerId = getCurrentOwnerId(batch);
    if (currentOwnerId !== auth.id) {
      return failure("You do not own this batch", 403);
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return failure("Receiver not found", 404);
    if (receiver.role !== "receiver") {
      return failure("Receiver must have receiver role", 400);
    }

    const timestamp = new Date();
    const hash = sha256(`${batchId}${auth.id}${receiverId}${timestamp.toISOString()}`);

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.transfer.create({
        data: {
          batchId,
          senderId: auth.id,
          receiverId,
          location,
          note,
          hash,
          createdAt: timestamp,
        },
      });

      await tx.batch.update({
        where: { id: batchId },
        data: { status: "transferred" },
      });

      return created;
    });

    return success(transfer, 201);
  } catch (error) {
    return failure("Failed to create transfer", 500);
  }
}
