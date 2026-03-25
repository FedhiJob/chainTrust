"use client";

import { useEffect, useState } from "react";

type TransferRow = {
  id: string;
  verified: boolean;
  createdAt: string;
  batch: { batchCode: string } | null;
  sender: { fullName: string } | null;
  receiver: { fullName: string } | null;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export default function HistoryPage() {
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/transfers", { cache: "no-store" });
        const result: ApiResponse<TransferRow[]> = await response.json();

        if (!response.ok || !result.success || !result.data) {
          setError(result.message ?? "Unable to load history");
          return;
        }

        setRows(result.data);
      } catch (err) {
        setError("Unable to load history");
      }
    };

    load();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">History</p>
        <h1 className="text-3xl font-semibold">Transfer history</h1>
        <p className="text-muted">Trace every custody movement recorded in ChainTrust.</p>
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
                <th className="py-2">Sender</th>
                <th className="py-2">Receiver</th>
                <th className="py-2">Verified</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-medium">
                    {row.batch?.batchCode ?? "-"}
                  </td>
                  <td className="py-3">{row.sender?.fullName ?? "-"}</td>
                  <td className="py-3">{row.receiver?.fullName ?? "-"}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.verified
                          ? "bg-accent/15 text-accent"
                          : "bg-accent-warm/15 text-accent-warm"
                      }`}
                    >
                      {row.verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="py-3 text-muted">
                    {new Date(row.createdAt).toLocaleDateString()}
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
