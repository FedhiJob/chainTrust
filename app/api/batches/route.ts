import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getAuditContext, writeAuditLog, writeAuditLogSafely } from "@/lib/audit";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { batchCreateSchema, getZodErrorMessage } from "@/lib/validators";
import { sha256 } from "@/lib/hash";

function getCurrentOwnerId(batch: { createdBy: string; transfers: { receiverId: string }[] }) {
  return batch.transfers[0]?.receiverId ?? batch.createdBy;
}

function withCurrentOwnerId<T extends { createdBy: string; transfers: { receiverId: string }[] }>(batch: T) {
  return {
    ...batch,
    currentOwnerId: getCurrentOwnerId(batch),
  };
}

export async function GET() {
  try {
    const auth = await getAuthenticatedUserFromRequest();
    if (!auth) return failure("Unauthorized", 401);

    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: "desc" },
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

    if (auth.role === "admin") {
      return success(batches.map(withCurrentOwnerId));
    }

    const filtered = batches
      .map(withCurrentOwnerId)
      .filter((batch) => batch.currentOwnerId === auth.id);

    return success(filtered);
  } catch {
    return failure("Failed to load batches", 500);
  }
}

export async function POST(request: Request) {
  const requestAudit = getAuditContext(request);

  try {
    if (!assertSameOrigin(request)) {
      await writeAuditLogSafely({
        ...requestAudit,
        action: "batch.create",
        targetType: "batch",
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
        action: "batch.create",
        targetType: "batch",
        status: "blocked",
        detail: { reason: "role_forbidden" },
      });
      return failure("Only distributors can create batches", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = batchCreateSchema.safeParse(body);

    if (!parsed.success) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "batch.create",
        targetType: "batch",
        status: "failure",
        detail: { reason: "invalid_input" },
      });
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const { medicineName, batchCode, quantity, expiryDate, origin } = parsed.data;

    const existing = await prisma.batch.findUnique({ where: { batchCode } });
    if (existing) {
      await writeAuditLogSafely({
        ...requestAudit,
        actorId: auth.id,
        actorRole: auth.role,
        action: "batch.create",
        targetType: "batch",
        targetId: existing.id,
        status: "failure",
        detail: { reason: "batch_code_exists", batchCode },
      });
      return failure("Batch code already exists", 409);
    }

    const timestamp = new Date();
    const batchId = crypto.randomUUID();
    const trustHash = sha256(`${batchCode}${medicineName}${timestamp.toISOString()}`);
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "http";
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const inferredBaseUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : "http://localhost:3000";
    const baseUrl =
      process.env.APP_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      inferredBaseUrl;
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const qrContent = `${normalizedBaseUrl}/verify/${batchId}`;
    const qrCode = await QRCode.toDataURL(qrContent);

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.batch.create({
        data: {
          id: batchId,
          batchCode,
          medicineName,
          quantity,
          expiryDate,
          origin,
          status: "active",
          trustHash,
          qrCode,
          createdBy: auth.id,
          createdAt: timestamp,
        },
      });

      await writeAuditLog(
        {
          ...requestAudit,
          actorId: auth.id,
          actorRole: auth.role,
          action: "batch.create",
          targetType: "batch",
          targetId: created.id,
          status: "success",
          detail: {
            batchCode: created.batchCode,
            medicineName: created.medicineName,
            quantity: created.quantity,
            origin: created.origin,
          },
        },
        tx
      );

      return created;
    });

    return success(batch, 201);
  } catch {
    await writeAuditLogSafely({
      ...requestAudit,
      action: "batch.create",
      targetType: "batch",
      status: "failure",
      detail: { reason: "server_error" },
    });
    return failure("Failed to create batch", 500);
  }
}
