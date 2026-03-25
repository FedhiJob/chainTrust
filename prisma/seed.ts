import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import QRCode from "qrcode";
import { config } from "dotenv";

config({ override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BASE_URL =
  process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const DEFAULT_PASSWORD = "Password123!";

const sha256 = (input: string) =>
  crypto.createHash("sha256").update(input).digest("hex");

async function ensureUser(params: {
  fullName: string;
  email: string;
  role: string;
  organization: string;
}) {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      fullName: params.fullName,
      role: params.role,
      organization: params.organization,
    },
    create: {
      fullName: params.fullName,
      email: params.email,
      password: hashed,
      role: params.role,
      organization: params.organization,
    },
  });
}

async function ensureBatch(params: {
  batchCode: string;
  medicineName: string;
  quantity: number;
  expiryDate: Date;
  origin: string;
  status: string;
  createdBy: string;
  createdAt: Date;
}) {
  const existing = await prisma.batch.findUnique({ where: { batchCode: params.batchCode } });

  if (existing) {
    const updateData: Record<string, unknown> = {
      status: params.status,
    };

    if (!existing.trustHash) {
      updateData.trustHash = sha256(
        `${params.batchCode}${params.medicineName}${params.createdAt.toISOString()}`
      );
    }

    if (!existing.qrCode) {
      const qrContent = `${BASE_URL.replace(/\/$/, "")}/verify/${existing.id}`;
      updateData.qrCode = await QRCode.toDataURL(qrContent);
    }

    await prisma.batch.update({ where: { id: existing.id }, data: updateData });
    return prisma.batch.findUnique({ where: { id: existing.id } });
  }

  const id = crypto.randomUUID();
  const trustHash = sha256(
    `${params.batchCode}${params.medicineName}${params.createdAt.toISOString()}`
  );
  const qrContent = `${BASE_URL.replace(/\/$/, "")}/verify/${id}`;
  const qrCode = await QRCode.toDataURL(qrContent);

  return prisma.batch.create({
    data: {
      id,
      batchCode: params.batchCode,
      medicineName: params.medicineName,
      quantity: params.quantity,
      expiryDate: params.expiryDate,
      origin: params.origin,
      status: params.status,
      trustHash,
      qrCode,
      createdBy: params.createdBy,
      createdAt: params.createdAt,
    },
  });
}

async function ensureTransfer(params: {
  batchId: string;
  senderId: string;
  receiverId: string;
  location: string;
  note?: string;
  verified: boolean;
  createdAt: Date;
  finalStatus: "transferred" | "delivered";
}) {
  const existing = await prisma.transfer.findFirst({ where: { batchId: params.batchId } });
  if (existing) return existing;

  const hash = sha256(
    `${params.batchId}${params.senderId}${params.receiverId}${params.createdAt.toISOString()}`
  );

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.create({
      data: {
        batchId: params.batchId,
        senderId: params.senderId,
        receiverId: params.receiverId,
        location: params.location,
        note: params.note,
        verified: params.verified,
        hash,
        createdAt: params.createdAt,
      },
    });

    await tx.batch.update({
      where: { id: params.batchId },
      data: { status: params.finalStatus },
    });

    return transfer;
  });
}

async function main() {
  await ensureUser({
    fullName: "ChainTrust Admin",
    email: "admin@chaintrust.et",
    role: "admin",
    organization: "ChainTrust HQ",
  });

  const distributor = await ensureUser({
    fullName: "Distributor Operator",
    email: "distributor@chaintrust.et",
    role: "distributor",
    organization: "Ethiopian Pharma Supply Agency",
  });

  const receiver = await ensureUser({
    fullName: "Receiver Pharmacist",
    email: "receiver@chaintrust.et",
    role: "receiver",
    organization: "Adama General Hospital",
  });

  const expiryDate = new Date("2027-01-15T00:00:00.000Z");

  const activeBatch = await ensureBatch({
    batchCode: "ETH-PH-2026-001",
    medicineName: "Paracetamol 500mg",
    quantity: 5000,
    expiryDate,
    origin: "Addis Ababa",
    status: "active",
    createdBy: distributor.id,
    createdAt: new Date("2026-03-20T08:30:00.000Z"),
  });

  const transferredBatch = await ensureBatch({
    batchCode: "ETH-PH-2026-002",
    medicineName: "Paracetamol 500mg",
    quantity: 3200,
    expiryDate,
    origin: "Addis Ababa",
    status: "transferred",
    createdBy: distributor.id,
    createdAt: new Date("2026-03-18T08:30:00.000Z"),
  });

  const deliveredBatch = await ensureBatch({
    batchCode: "ETH-PH-2026-003",
    medicineName: "Paracetamol 500mg",
    quantity: 2800,
    expiryDate,
    origin: "Addis Ababa",
    status: "delivered",
    createdBy: distributor.id,
    createdAt: new Date("2026-03-15T08:30:00.000Z"),
  });

  if (transferredBatch) {
    await ensureTransfer({
      batchId: transferredBatch.id,
      senderId: distributor.id,
      receiverId: receiver.id,
      location: "Adama",
      note: "Sealed cold-chain shipment",
      verified: false,
      createdAt: new Date("2026-03-19T10:00:00.000Z"),
      finalStatus: "transferred",
    });
  }

  if (deliveredBatch) {
    await ensureTransfer({
      batchId: deliveredBatch.id,
      senderId: distributor.id,
      receiverId: receiver.id,
      location: "Adama",
      note: "Delivered to pharmacy store",
      verified: true,
      createdAt: new Date("2026-03-16T14:30:00.000Z"),
      finalStatus: "delivered",
    });
  }

  console.log("Seed complete.");
  console.log("Login credentials:");
  console.log("- admin@chaintrust.et / Password123!");
  console.log("- distributor@chaintrust.et / Password123!");
  console.log("- receiver@chaintrust.et / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });