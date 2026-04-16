"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

type DashboardData = {
  activeBatches: number;
  transferredBatches: number;
  deliveredBatches: number;
};

type DashboardResponse = {
  success: boolean;
  data?: DashboardData;
  message?: string;
};

export default function DistributorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.role !== "distributor") {
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

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Active batches", value: data.activeBatches },
      { label: "Transferred", value: data.transferredBatches },
      { label: "Delivered", value: data.deliveredBatches },
    ];
  }, [data]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-2 fade-up">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Distributor Dashboard</p>
        <h1 className="text-3xl font-semibold">Custody performance</h1>
        <p className="text-muted">
          Track how many batches are active, transferred, and fully delivered.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-warm/30 bg-accent-warm/10 px-6 py-4 text-sm text-accent-warm">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {(cards.length ? cards : [1, 2, 3]).map((card, index) => (
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
          href="/batches/create"
          className="btn-primary rounded-full px-5 py-2 text-sm font-semibold"
        >
          Create Batch
        </a>
        <a
          href="/transfers/create"
          className="rounded-full border border-accent/30 bg-surface px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10"
        >
          Create Transfer
        </a>
        <a
          href="/history"
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
        >
          View History
        </a>
      </section>
    </div>
  );
}
