import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { failure, success } from "@/lib/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthPayload();
    if (!auth) return failure("Unauthorized", 401);

    const { id } = await params;

    const batch = await prisma.batch.findUnique({
      where: { id },
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

    if (!batch) return failure("Batch not found", 404);

    return success(batch);
  } catch (error) {
    return failure("Failed to load batch", 500);
  }
}

