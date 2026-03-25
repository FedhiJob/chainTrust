"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/components/toast";

type BatchOption = { id: string; batchCode: string; medicineName: string };

type UserOption = { id: string; fullName: string; organization: string };

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export default function CreateTransferPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notify } = useToast();
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [receivers, setReceivers] = useState<UserOption[]>([]);
  const [form, setForm] = useState({
    batchId: "",
    receiverId: "",
    location: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [batchRes, receiverRes] = await Promise.all([
          fetch("/api/batches", { cache: "no-store" }),
          fetch("/api/users?role=receiver", { cache: "no-store" }),
        ]);

        const batchJson: ApiResponse<BatchOption[]> = await batchRes.json();
        const receiverJson: ApiResponse<UserOption[]> = await receiverRes.json();

        if (batchRes.ok && batchJson.success && batchJson.data) {
          setBatches(batchJson.data);
          if (!form.batchId && batchJson.data.length) {
            setForm((prev) => ({ ...prev, batchId: batchJson.data[0].id }));
          }
        }

        if (receiverRes.ok && receiverJson.success && receiverJson.data) {
          setReceivers(receiverJson.data);
          if (!form.receiverId && receiverJson.data.length) {
            setForm((prev) => ({ ...prev, receiverId: receiverJson.data[0].id }));
          }
        }
      } catch (err) {
        setError("Unable to load transfer data");
      }
    };

    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: form.batchId,
          receiverId: form.receiverId,
          location: form.location,
          note: form.note || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        const message = result.message ?? "Unable to create transfer";
        setError(message);
        notify({ title: "Transfer failed", message, variant: "error" });
        setLoading(false);
        return;
      }

      notify({
        title: "Transfer logged",
        message: "Custody transfer recorded successfully.",
        variant: "success",
      });
      router.push(`/batches/${form.batchId}`);
    } catch (err) {
      setError("Unable to create transfer");
      notify({
        title: "Transfer failed",
        message: "Unable to create transfer",
        variant: "error",
      });
      setLoading(false);
    }
  };

  const isDistributor = user?.role === "distributor";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">New Transfer</p>
        <h1 className="text-3xl font-semibold">Transfer batch custody</h1>
        <p className="text-muted">Select the batch and receiver to continue the trust chain.</p>
      </header>

      {!authLoading && !isDistributor ? (
        <div className="rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-6 py-4 text-sm text-accent-warm">
          Only distributors can create transfers.
        </div>
      ) : null}

      <form
        className="grid gap-5 rounded-3xl border border-border/70 bg-surface p-8 shadow-[var(--shadow)]"
        onSubmit={handleSubmit}
      >
        <label className="block text-sm font-medium">
          Batch
          <select
            value={form.batchId}
            onChange={(event) => setForm((prev) => ({ ...prev, batchId: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
            required
            disabled={!isDistributor}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchCode} - {batch.medicineName}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Receiver
          <select
            value={form.receiverId}
            onChange={(event) => setForm((prev) => ({ ...prev, receiverId: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
            required
            disabled={!isDistributor}
          >
            {receivers.map((receiver) => (
              <option key={receiver.id} value={receiver.id}>
                {receiver.fullName} - {receiver.organization}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Location
          <input
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
            placeholder="Adama"
            required
            disabled={!isDistributor}
          />
        </label>

        <label className="block text-sm font-medium">
          Note (optional)
          <textarea
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            className="mt-2 min-h-[120px] w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
            placeholder="Conditions, handling, or remarks"
            disabled={!isDistributor}
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-accent-warm/40 bg-accent-warm/10 px-4 py-3 text-sm text-accent-warm">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !isDistributor}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating transfer..." : "Create transfer"}
        </button>
      </form>
    </div>
  );
}