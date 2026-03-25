import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function VerifyPage({ params }: { params: { id: string } }) {
  const batch = await prisma.batch.findUnique({
    where: { id: params.id },
    select: {
      medicineName: true,
      batchCode: true,
      origin: true,
      status: true,
      createdAt: true,
    },
  });

  if (!batch) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="rounded-3xl border border-border/70 bg-surface p-10 shadow-[var(--shadow)]">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">ChainTrust Verification</p>
        <h1 className="mt-4 text-3xl font-semibold">{batch.medicineName}</h1>
        <dl className="mt-8 grid gap-4 text-sm">
          <div>
            <dt className="text-muted">Batch code</dt>
            <dd className="text-base font-medium text-foreground">{batch.batchCode}</dd>
          </div>
          <div>
            <dt className="text-muted">Origin</dt>
            <dd className="text-base font-medium text-foreground">{batch.origin}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="text-base font-medium text-foreground">{batch.status}</dd>
          </div>
          <div>
            <dt className="text-muted">Registered</dt>
            <dd className="text-base font-medium text-foreground">
              {new Date(batch.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
