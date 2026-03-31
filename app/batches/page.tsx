"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";

type BatchRow = {
  id: string;
  batchCode: string;
  medicineName: string;
  status: string;
  currentOwnerId?: string;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export default function BatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/batches", { cache: "no-store" });
        const result: ApiResponse<BatchRow[]> = await response.json();

        if (!response.ok || !result.success || !result.data) {
          setError(result.message ?? "Unable to load batches");
          return;
        }

        setBatches(result.data);
      } catch (err) {
        setError("Unable to load batches");
      }
    };

    load();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Batches</p>
        <h1 className="text-3xl font-semibold">
          {user?.role === "receiver" ? "Incoming batches" : "Owned batches"}
        </h1>
        <p className="text-muted">
          {user?.role === "receiver"
            ? "Review batches awaiting verification and confirmed deliveries."
            : "Review active and transferred batches in your custody."}
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-6 py-4 text-sm text-accent-warm">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-border/70 bg-surface p-6 shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2">Batch code</th>
                <th className="py-2">Medicine</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="py-3 font-medium">{batch.batchCode}</td>
                  <td className="py-3">{batch.medicineName}</td>
                  <td className="py-3 text-muted">{batch.status}</td>
                  <td className="py-3">
                    <a
                      href={`/batches/${batch.id}`}
                      className="rounded-full border border-border px-4 py-1 text-xs font-semibold"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
