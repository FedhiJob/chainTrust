import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { failure, success } from "@/lib/response";
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
    const auth = await getAuthPayload();
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
  } catch (error) {
    return failure("Failed to load batches", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthPayload();
    if (!auth) return failure("Unauthorized", 401);
    if (auth.role !== "distributor") {
      return failure("Only distributors can create batches", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = batchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const { medicineName, batchCode, quantity, expiryDate, origin } = parsed.data;

    const existing = await prisma.batch.findUnique({ where: { batchCode } });
    if (existing) return failure("Batch code already exists", 409);

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

    const batch = await prisma.batch.create({
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

    return success(batch, 201);
  } catch (error) {
    return failure("Failed to create batch", 500);
  }
}

