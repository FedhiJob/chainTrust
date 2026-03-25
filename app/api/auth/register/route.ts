import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return failure(parsed.error.errors[0]?.message ?? "Invalid input", 400);
    }

    const { fullName, email, password, role, organization } = parsed.data;

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
  } catch (error) {
    return failure("Registration failed", 500);
  }
}
