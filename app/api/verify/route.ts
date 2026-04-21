import { prisma } from "@/lib/prisma";
import { getAuditContext, writeAuditLog, writeAuditLogSafely } from "@/lib/audit";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { getZodErrorMessage, verifySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const requestAudit = getAuditContext(request);

  try {
    if (!assertSameOrigin(request)) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "transfer.verify",
        targetType: "transfer",
        status: "blocked",
        detail: { reason: "cross_site_blocked" },
      });
      return failure("Cross-site request blocked", 403);
    }

    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "receiver") {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.verify",
        targetType: "transfer",
        status: "blocked",
        detail: { reason: "role_forbidden" },
      });
      return failure("Only receivers can verify batches", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.verify",
        targetType: "transfer",
        status: "failure",
        detail: { reason: "invalid_input" },
      });
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const { batchId } = parsed.data;

    const transfer = await prisma.transfer.findFirst({
      where: { batchId, receiverId: auth.id },
      orderBy: { createdAt: "desc" },
      include: { batch: { select: { status: true } } },
    });

    if (!transfer) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.verify",
        targetType: "batch",
        targetId: batchId,
        status: "failure",
        detail: { reason: "transfer_not_found" },
      });
      return failure("Transfer not found", 404);
    }
    if (transfer.verified) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.verify",
        targetType: "transfer",
        targetId: transfer.id,
        status: "blocked",
        detail: { reason: "already_verified", batchId },
      });
      return failure("Transfer already verified", 400);
    }
    if (transfer.batch.status === "delivered") {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "transfer.verify",
        targetType: "batch",
        targetId: batchId,
        status: "blocked",
        detail: { reason: "batch_already_delivered", transferId: transfer.id },
      });
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

      await writeAuditLog(
        {
          ...requestAudit,
          actorId: auth.id,
          actorRole: auth.role,
          action: "transfer.verify",
          targetType: "transfer",
          targetId: transfer.id,
          status: "success",
          detail: { batchId },
        },
        tx
      );

      return verifiedTransfer;
    });

    return success(updated);
  } catch {
    await writeAuditLogSafely({
      ...requestAudit,
      action: "transfer.verify",
      targetType: "transfer",
      status: "failure",
      detail: { reason: "server_error" },
    });
    return failure("Failed to verify transfer", 500);
  }
}
