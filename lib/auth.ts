import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { isRole, type Role } from "./roles";

export type AuthPayload = {
  id: string;
  role: Role;
};

export const authUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  organization: true,
  createdAt: true,
} as const;

type TokenPayload = JwtPayload & {
  id?: unknown;
  role?: unknown;
};

const JWT_SECRET = process.env.JWT_SECRET;

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  return JWT_SECRET;
}

function isAuthPayload(payload: TokenPayload): payload is TokenPayload & AuthPayload {
  return typeof payload.id === "string" && typeof payload.role === "string" && isRole(payload.role);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;

  if (!isAuthPayload(payload)) {
    throw new Error("Invalid token payload");
  }

  return { id: payload.id, role: payload.role };
}

export async function getTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value ?? null;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
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

export async function getAuthenticatedUser() {
  const payload = await getAuthPayload();
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: authUserSelect,
  });

  if (!user || !isRole(user.role)) {
    return null;
  }

  return user;
}

export async function getAuthenticatedUserFromRequest() {
  const user = await getAuthenticatedUser();

  if (!user) {
    await clearAuthCookie();
    return null;
  }

  return user;
}
