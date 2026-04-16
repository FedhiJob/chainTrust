"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";

type RoleOption = "distributor" | "receiver";

const roleOptions: { value: RoleOption; label: string; description: string }[] = [
  {
    value: "distributor",
    label: "Distributor",
    description: "Create batches and transfer custody to receivers.",
  },
  {
    value: "receiver",
    label: "Receiver",
    description: "Verify receipts and confirm delivered batches.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<RoleOption>("distributor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          organization,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.message ?? "Registration failed";
        setError(message);
        notify({ title: "Registration failed", message, variant: "error" });
        setLoading(false);
        return;
      }

      notify({
        title: "Account created",
        message: "Signing you in now.",
        variant: "success",
      });

      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginResponse.ok) {
        router.push("/dashboard");
        return;
      }

      router.push("/login");
    } catch (err) {
      setError("Unable to create account. Try again.");
      notify({
        title: "Registration failed",
        message: "Unable to create account. Try again.",
        variant: "error",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="hidden w-1/2 flex-col justify-between border-r border-border/60 bg-surface/70 p-12 lg:flex">
        <div className="space-y-6 fade-up">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="ChainTrust logo" width={44} height={44} />
            <p className="text-sm uppercase tracking-[0.2em] text-accent">ChainTrust</p>
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            Create your ChainTrust workspace.
          </h1>
          <p className="text-muted">
            Distributors and receivers can self‑register to start tracking custody and
            verification in minutes.
          </p>
          <div className="rounded-3xl border border-border/60 bg-white/70 p-6 shadow-[var(--shadow)]">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">Why it matters</p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>Prove batch origin, transfer, and receipt with evidence.</li>
              <li>Resolve disputes faster with a shared trust timeline.</li>
              <li>Give hospitals instant visibility into authenticity.</li>
            </ul>
          </div>
        </div>
        <div className="space-y-3 text-sm text-muted">
          <p>Admin accounts are provisioned internally.</p>
          <p>Distributor and receiver roles can onboard themselves.</p>
        </div>
      </section>

      <section className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-surface p-8 shadow-[var(--shadow)]">
          <div className="mb-8 space-y-2">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="ChainTrust logo" width={36} height={36} />
              <p className="text-sm uppercase tracking-[0.3em] text-accent">Register</p>
            </div>
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <p className="text-sm text-muted">
              Choose your role and start using ChainTrust services.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="Jane Tadesse"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Organization
              <input
                type="text"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="Ethiopian Pharma Supply Agency"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as RoleOption)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="name@organization.com"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-accent-warm/40 bg-accent-warm/10 px-4 py-3 text-sm text-accent-warm">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center text-xs text-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
