import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Role } from "./roles";

export type AuditStatus = "success" | "failure" | "blocked";

export type AuditContext = {
  actorId?: string | null;
  actorRole?: Role | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditInput = AuditContext & {
  action: string;
  targetType: string;
  targetId?: string | null;
  status: AuditStatus;
  detail?: Prisma.InputJsonValue | null;
};

type AuditClient = Pick<typeof prisma, "auditLog">;

function normalizeNullableString(value: string | null | undefined) {
  return value ?? null;
}

function buildAuditData(input: AuditInput): Prisma.AuditLogUncheckedCreateInput {
  return {
    actorId: normalizeNullableString(input.actorId),
    actorRole: normalizeNullableString(input.actorRole),
    action: input.action,
    targetType: input.targetType,
    targetId: normalizeNullableString(input.targetId),
    status: input.status,
    ipAddress: normalizeNullableString(input.ipAddress),
    userAgent: normalizeNullableString(input.userAgent),
    detail: input.detail ?? undefined,
  };
}

export function getAuditContext(request: Request, actor?: { id: string; role: string } | null): AuditContext {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");

  return {
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? null,
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function writeAuditLog(input: AuditInput, client: AuditClient = prisma) {
  return client.auditLog.create({
    data: buildAuditData(input),
  });
}

export async function writeAuditLogSafely(input: AuditInput, client: AuditClient = prisma) {
  try {
    return await writeAuditLog(input, client);
  } catch (error) {
    console.error("Audit log write failed", error);
    return null;
  }
}
