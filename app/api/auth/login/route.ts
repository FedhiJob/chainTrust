import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { isRole } from "@/lib/roles";
import { getZodErrorMessage, loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const password = parsed.data.password;
    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return failure("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return failure("Invalid email or password", 401);
    }

    if (!isRole(user.role)) {
      return failure("Account role is invalid", 403);
    }

    const token = signToken({ id: user.id, role: user.role });
    await setAuthCookie(token);

    return success({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt,
    });
  } catch {
    return failure("Login failed", 500);
  }
}
