import { prisma } from "@/lib/prisma";
import { getAuditContext, writeAuditLog, writeAuditLogSafely } from "@/lib/audit";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { getZodErrorMessage, transferCreateSchema } from "@/lib/validators";
import { sha256 } from "@/lib/hash";

function getCurrentOwnerId(batch: { createdBy: string; transfers: { receiverId: string }[] }) {
  return batch.transfers[0]?.receiverId ?? batch.createdBy;
}

export async function GET() {
  try {
    const auth = await getAuthenticatedUserFromRequest();
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
  } catch {
    return failure("Failed to load transfers", 500);
  }
}

export async function POST(request: Request) {
  const requestAudit = getAuditContext(request);

  try {
    if (!assertSameOrigin(request)) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "transfer.create",
        targetType: "transfer",
        status: "blocked",
        detail: { reason: "cross_site_blocked" },
      });
      return failure("Cross-site request blocked", 403);
    }

    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "distributor") {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "transfer",
        status: "blocked",
        detail: { reason: "role_forbidden" },
      });
      return failure("Only distributors can create transfers", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = transferCreateSchema.safeParse(body);

    if (!parsed.success) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "transfer",
        status: "failure",
        detail: { reason: "invalid_input" },
      });
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const { batchId, receiverId, senderId, location, note } = parsed.data;

    if (senderId && senderId !== auth.id) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "transfer",
        status: "blocked",
        detail: { reason: "sender_mismatch", batchId, receiverId },
      });
      return failure("Sender does not match authenticated user", 403);
    }
    if (receiverId === auth.id) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "transfer",
        status: "failure",
        detail: { reason: "self_transfer", batchId, receiverId },
      });
      return failure("Cannot transfer a batch to yourself", 400);
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { transfers: { orderBy: { createdAt: "desc" } } },
    });

    if (!batch) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "batch",
        targetId: batchId,
        status: "failure",
        detail: { reason: "batch_not_found", receiverId },
      });
      return failure("Batch not found", 404);
    }
    if (batch.status === "delivered") {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "batch",
        targetId: batch.id,
        status: "blocked",
        detail: { reason: "batch_already_delivered", receiverId },
      });
      return failure("Batch already delivered", 400);
    }

    const currentOwnerId = getCurrentOwnerId(batch);
    if (currentOwnerId !== auth.id) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "batch",
        targetId: batch.id,
        status: "blocked",
        detail: { reason: "ownership_mismatch", receiverId, currentOwnerId },
      });
      return failure("You do not own this batch", 403);
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "user",
        targetId: receiverId,
        status: "failure",
        detail: { reason: "receiver_not_found", batchId },
      });
      return failure("Receiver not found", 404);
    }
    if (receiver.role !== "receiver") {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.create",
        targetType: "user",
        targetId: receiver.id,
        status: "blocked",
        detail: { reason: "receiver_role_invalid", batchId, receiverRole: receiver.role },
      });
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

      await writeAuditLog(
        {
          ...requestAudit,
          actorId: auth.id,
          actorRole: auth.role,
          action: "transfer.create",
          targetType: "transfer",
          targetId: created.id,
          status: "success",
          detail: {
            batchId,
            receiverId,
            location,
          },
        },
        tx
      );

      return created;
    });

    return success(transfer, 201);
  } catch {
    await writeAuditLogSafely({
      ...requestAudit,
      action: "transfer.create",
      targetType: "transfer",
      status: "failure",
      detail: { reason: "server_error" },
    });
    return failure("Failed to create transfer", 500);
  }
}
