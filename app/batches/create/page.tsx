"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/components/toast";

export default function CreateBatchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({
    medicineName: "",
    batchCode: "",
    quantity: "",
    expiryDate: "",
    origin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: form.medicineName,
          batchCode: form.batchCode,
          quantity: Number(form.quantity),
          expiryDate: form.expiryDate,
          origin: form.origin,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.message ?? "Unable to create batch";
        setError(message);
        notify({ title: "Batch creation failed", message, variant: "error" });
        setLoading(false);
        return;
      }

      notify({
        title: "Batch created",
        message: `Batch ${result.data.batchCode} is now active.`,
        variant: "success",
      });
      router.push(`/batches/${result.data.id}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Unable to create batch");
      notify({
        title: "Batch creation failed",
        message: "Unable to create batch",
        variant: "error",
      });
      setLoading(false);
    }
  };

  const isDistributor = user?.role === "distributor";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">New Batch</p>
        <h1 className="text-3xl font-semibold">Register a pharmaceutical batch</h1>
        <p className="text-muted">Capture the origin and core batch metadata before any transfers.</p>
      </header>

      {!authLoading && !isDistributor ? (
        <div className="rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-6 py-4 text-sm text-accent-warm">
          Only distributors can create batches.
        </div>
      ) : null}

      <form
        className="grid gap-5 rounded-3xl border border-border/70 bg-surface p-8 shadow-(--shadow)"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Medicine name
            <input
              value={form.medicineName}
              onChange={(event) => updateField("medicineName", event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              placeholder="Paracetamol 500mg"
              required
              disabled={!isDistributor}
            />
          </label>

          <label className="block text-sm font-medium">
            Batch code
            <input
              value={form.batchCode}
              onChange={(event) => updateField("batchCode", event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              placeholder="ETH-PH-2026-001"
              required
              disabled={!isDistributor}
            />
          </label>

          <label className="block text-sm font-medium">
            Quantity
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => updateField("quantity", event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              placeholder="1000"
              required
              disabled={!isDistributor}
            />
          </label>

          <label className="block text-sm font-medium">
            Expiry date
            <input
              type="date"
              value={form.expiryDate}
              onChange={(event) => updateField("expiryDate", event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              required
              disabled={!isDistributor}
            />
          </label>

          <label className="block text-sm font-medium md:col-span-2">
            Origin
            <input
              value={form.origin}
              onChange={(event) => updateField("origin", event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              placeholder="Addis Ababa"
              required
              disabled={!isDistributor}
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-xl border border-accent-warm/40 bg-accent-warm/10 px-4 py-3 text-sm text-accent-warm">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !isDistributor}
          className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold"
        >
          {loading ? "Creating batch..." : "Create batch"}
        </button>
      </form>
    </div>
  );
}
