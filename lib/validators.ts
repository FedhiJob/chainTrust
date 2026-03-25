import { z } from "zod";
const signupRoles = ["distributor", "receiver"] as const;

export const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(signupRoles),
  organization: z.string().min(1, "Organization is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const batchCreateSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  batchCode: z.string().min(1, "Batch code is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  expiryDate: z.coerce.date(),
  origin: z.string().min(1, "Origin is required"),
});

export const transferCreateSchema = z.object({
  batchId: z.string().uuid("Invalid batch id"),
  receiverId: z.string().uuid("Invalid receiver id"),
  senderId: z.string().uuid("Invalid sender id").optional(),
  location: z.string().min(1, "Location is required"),
  note: z.string().optional(),
});

export const verifySchema = z.object({
  batchId: z.string().uuid("Invalid batch id"),
});
