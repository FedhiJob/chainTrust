"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/components/toast";

type Transfer = {
  id: string;
  sender: { id: string; fullName: string; organization: string } | null;
  receiver: { id: string; fullName: string; organization: string } | null;
  location: string;
  verified: boolean;
  createdAt: string;
};

type BatchDetail = {
  id: string;
  batchCode: string;
  medicineName: string;
  quantity: number;
  expiryDate: string;
  origin: string;
  status: string;
  trustHash: string;
  qrCode?: string | null;
  createdAt: string;
  transfers: Transfer[];
};

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { notify } = useToast();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/batches/${id}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) {
          setError(result.message ?? "Unable to load batch");
          return;
        }
        setBatch(result.data);
      } catch (err) {
        setError("Unable to load batch");
      }
    };
    load();
  }, [id]);

  const latestTransfer = batch?.transfers[0];
  const verifiedTransfer = useMemo(
    () => batch?.transfers.find((transfer) => transfer.verified),
    [batch]
  );

  const canVerify =
    user?.role === "receiver" &&
    latestTransfer &&
    !latestTransfer.verified &&
    latestTransfer.receiver?.id === user.id;

  const handleVerify = async () => {
    if (!batch) return;
    setNotice(null);
    setVerifying(true);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const message = result.message ?? "Unable to verify";
        setNotice(message);
        notify({ title: "Verification failed", message, variant: "error" });
        setVerifying(false);
        return;
      }
      setNotice("Verification recorded.");
      notify({
        title: "Batch verified",
        message: "Receipt confirmed and batch marked delivered.",
        variant: "success",
      });
      setVerifying(false);
      const refreshed = await fetch(`/api/batches/${batch.id}`, { cache: "no-store" });
      const refreshedResult = await refreshed.json();
      if (refreshed.ok && refreshedResult.success) {
        setBatch(refreshedResult.data);
      }
    } catch (err) {
      setNotice("Unable to verify");
      notify({
        title: "Verification failed",
        message: "Unable to verify",
        variant: "error",
      });
      setVerifying(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
        <div className="rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-6 py-4 text-sm text-accent-warm">
          {error}
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-12">
        <div className="h-6 w-48 rounded-full bg-border/60" />
        <div className="h-10 w-full rounded-2xl bg-border/40" />
      </div>
    );
  }

  const timeline = [
    {
      title: "Created",
      detail: batch.origin,
      date: batch.createdAt,
      status: "done",
    },
    {
      title: "Transferred",
      detail: latestTransfer
        ? `${latestTransfer.receiver?.organization ?? "Receiver"} · ${latestTransfer.location}`
        : "Pending",
      date: latestTransfer?.createdAt,
      status: latestTransfer ? "done" : "pending",
    },
    {
      title: "Verified",
      detail: verifiedTransfer
        ? `${verifiedTransfer.receiver?.organization ?? "Receiver"}`
        : "Pending",
      date: verifiedTransfer?.createdAt,
      status: verifiedTransfer ? "done" : "pending",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Batch detail</p>
        <h1 className="text-3xl font-semibold">{batch.medicineName}</h1>
        <p className="text-muted">Batch code: {batch.batchCode}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border/70 bg-surface p-6 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold">Batch information</h2>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted">Quantity</dt>
              <dd className="text-base font-medium text-foreground">{batch.quantity}</dd>
            </div>
            <div>
              <dt className="text-muted">Expiry date</dt>
              <dd className="text-base font-medium text-foreground">
                {new Date(batch.expiryDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Origin</dt>
              <dd className="text-base font-medium text-foreground">{batch.origin}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="text-base font-medium text-foreground">{batch.status}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-2xl border border-border/60 bg-accent/5 px-4 py-3 text-xs font-mono text-accent-strong">
            Trust hash: {batch.trustHash}
          </div>
          {canVerify ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="rounded-full bg-accent-strong px-5 py-2 text-xs font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
              >
                {verifying ? "Verifying..." : "Verify receipt"}
              </button>
              {notice ? <span className="text-xs text-muted">{notice}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-border/70 bg-surface p-6 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold">QR Traceability</h2>
          <p className="mt-2 text-sm text-muted">
            Scan to view the public verification page.
          </p>
          {batch.qrCode ? (
            <img
              src={batch.qrCode}
              alt="Batch QR"
              className="mt-6 w-48 rounded-2xl border border-border/60 bg-white p-3"
            />
          ) : (
            <div className="mt-6 h-48 w-48 rounded-2xl border border-border/60 bg-border/30" />
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold">Trust timeline</h2>
        <div className="mt-4 space-y-4">
          {timeline.map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <span
                className={`mt-1 h-3 w-3 rounded-full ${
                  item.status === "done" ? "bg-accent" : "bg-border"
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <span className="text-xs text-muted">
                    {item.date ? new Date(item.date).toLocaleDateString() : "Pending"}
                  </span>
                </div>
                <p className="text-sm text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-surface p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transfer history</h2>
          <span className="text-sm text-muted">{batch.transfers.length} transfers</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2">Sender</th>
                <th className="py-2">Receiver</th>
                <th className="py-2">Location</th>
                <th className="py-2">Verified</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {batch.transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="py-3">
                    {transfer.sender?.fullName ?? "-"}
                    <div className="text-xs text-muted">
                      {transfer.sender?.organization ?? ""}
                    </div>
                  </td>
                  <td className="py-3">
                    {transfer.receiver?.fullName ?? "-"}
                    <div className="text-xs text-muted">
                      {transfer.receiver?.organization ?? ""}
                    </div>
                  </td>
                  <td className="py-3">{transfer.location}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        transfer.verified
                          ? "bg-accent/15 text-accent"
                          : "bg-accent-warm/15 text-accent-warm"
                      }`}
                    >
                      {transfer.verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="py-3 text-muted">
                    {new Date(transfer.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
