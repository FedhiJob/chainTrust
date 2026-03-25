import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Role } from "./roles";

export type AuthPayload = {
  id: string;
  role: Role | string;
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export async function getTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value ?? null;
}

export async function getAuthPayload() {
  const token = await getTokenFromCookies();
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
