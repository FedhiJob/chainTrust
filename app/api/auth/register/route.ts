import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getZodErrorMessage, registerSchema } from "@/lib/validators";
import { failure, success } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return failure(getZodErrorMessage(parsed.error), 400);
    }

    const fullName = parsed.data.fullName.trim();
    const email = parsed.data.email.trim().toLowerCase();
    const organization = parsed.data.organization.trim();
    const { password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return failure("Email already in use", 409);
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashed,
        role,
        organization,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
      },
    });

    return success(user, 201);
  } catch {
    return failure("Registration failed", 500);
  }
}
