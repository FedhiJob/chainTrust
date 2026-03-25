import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken, verifyPassword } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return failure(parsed.error.errors[0]?.message ?? "Invalid input", 400);
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return failure("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return failure("Invalid email or password", 401);
    }

    const token = signToken({ id: user.id, role: user.role });

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

    return success({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return failure("Login failed", 500);
  }
}
