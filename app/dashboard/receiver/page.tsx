"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/components/toast";

type DashboardData = {
  receivedBatches: number;
  pendingConfirmations: number;
};

type DashboardResponse = {
  success: boolean;
  data?: DashboardData;
  message?: string;
};

type TransferRow = {
  id: string;
  verified: boolean;
  createdAt: string;
  location: string;
  batch: { id: string; batchCode: string; medicineName: string } | null;
  sender: { fullName: string; organization: string } | null;
};

type TransferResponse = {
  success: boolean;
  data?: TransferRow[];
  message?: string;
};

export default function ReceiverDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notify } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.role !== "receiver") {
        router.replace("/dashboard");
        return;
      }

      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const result: DashboardResponse = await response.json();

        if (!response.ok || !result.success || !result.data) {
          setError(result.message ?? "Unable to load dashboard");
          return;
        }

        setData(result.data);
      } catch (err) {
        setError("Unable to load dashboard");
      }
    };

    load();
  }, [authLoading, router, user]);

  const loadDashboard = async () => {
    if (authLoading) return;
    if (!user || user.role !== "receiver") return;

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result: DashboardResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setError(result.message ?? "Unable to load dashboard");
        return;
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      setError("Unable to load dashboard");
    }
  };

  const loadTransfers = async () => {
    if (authLoading) return;
    if (!user || user.role !== "receiver") return;

    try {
      const response = await fetch("/api/transfers", { cache: "no-store" });
      const result: TransferResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setTransferError(result.message ?? "Unable to load incoming transfers");
        return;
      }

      setTransfers(result.data);
      setTransferError(null);
    } catch (err) {
      setTransferError("Unable to load incoming transfers");
    }
  };

  const handleVerify = async (batchId: string, transferId: string) => {
    setVerifyingId(transferId);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        const message = result.message ?? "Unable to verify batch";
        notify({ title: "Verification failed", message, variant: "error" });
        setVerifyingId(null);
        return;
      }

      notify({
        title: "Batch verified",
        message: "Receipt confirmed and batch marked delivered.",
        variant: "success",
      });

      await Promise.all([loadDashboard(), loadTransfers()]);
    } catch (err) {
      notify({
        title: "Verification failed",
        message: "Unable to verify batch",
        variant: "error",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    const loadTransfers = async () => {
      if (authLoading) return;
      if (!user || user.role !== "receiver") return;

      try {
        const response = await fetch("/api/transfers", { cache: "no-store" });
        const result: TransferResponse = await response.json();

        if (!response.ok || !result.success || !result.data) {
          setTransferError(result.message ?? "Unable to load incoming transfers");
          return;
        }

        setTransfers(result.data);
      } catch (err) {
        setTransferError("Unable to load incoming transfers");
      }
    };

    loadTransfers();
  }, [authLoading, user]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Received batches", value: data.receivedBatches },
      { label: "Pending confirmations", value: data.pendingConfirmations },
    ];
  }, [data]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-2 fade-up">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Receiver Dashboard</p>
        <h1 className="text-3xl font-semibold">Verification workload</h1>
        <p className="text-muted">
          Track which batches are waiting for verification and what is fully received.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-6 py-4 text-sm text-accent-warm">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-border/70 bg-surface p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Incoming batches</h2>
            <p className="text-sm text-muted">
              Verify receipt to complete custody transfer.
            </p>
          </div>
          <a
            href="/history"
            className="rounded-full border border-border px-4 py-1 text-xs font-semibold"
          >
            View history
          </a>
        </div>

        {transferError ? (
          <div className="mt-4 rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-4 py-3 text-sm text-accent-warm">
            {transferError}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2">Batch</th>
                <th className="py-2">Sender</th>
                <th className="py-2">Location</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {transfers.map((transfer) => {
                const isPending = !transfer.verified;
                return (
                  <tr key={transfer.id}>
                    <td className="py-3 font-medium">
                      {transfer.batch?.batchCode ?? "-"}
                      <div className="text-xs text-muted">
                        {transfer.batch?.medicineName ?? ""}
                      </div>
                    </td>
                    <td className="py-3">
                      {transfer.sender?.fullName ?? "-"}
                      <div className="text-xs text-muted">
                        {transfer.sender?.organization ?? ""}
                      </div>
                    </td>
                    <td className="py-3">{transfer.location}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isPending
                            ? "bg-accent-warm/15 text-accent-warm"
                            : "bg-accent/15 text-accent"
                        }`}
                      >
                        {isPending ? "Pending" : "Verified"}
                      </span>
                    </td>
                    <td className="py-3">
                      {transfer.batch?.id ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/batches/${transfer.batch.id}`}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                          >
                            View
                          </a>
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => handleVerify(transfer.batch!.id, transfer.id)}
                              disabled={verifyingId === transfer.id}
                              className="rounded-full bg-accent-strong px-3 py-1 text-xs font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {verifyingId === transfer.id ? "Verifying..." : "Verify"}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!transferError && transfers.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No incoming transfers yet.</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {(cards.length ? cards : [1, 2]).map((card, index) => (
          <div
            key={typeof card === "number" ? card : card.label}
            className="rounded-3xl border border-border/60 bg-surface p-6 shadow-[var(--shadow)] transition hover:-translate-y-1"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {typeof card === "number" ? (
              <div className="space-y-3">
                <div className="h-3 w-20 rounded-full bg-border/60" />
                <div className="h-8 w-16 rounded-xl bg-border/40" />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">{card.label}</p>
                <p className="text-3xl font-semibold text-foreground">{card.value}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <a
          href="/history"
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
        >
          View Transfer History
        </a>
      </section>
    </div>
  );
}
