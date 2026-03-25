"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

const slides = [
  {
    title: "Trust proof at every handoff",
    description:
      "ChainTrust captures sender, receiver, time, and location so custody disputes turn into evidence.",
    accent: "Digital custody trail",
  },
  {
    title: "Instant authenticity checks",
    description:
      "Scan a QR to see the full batch history — origin, transfers, and verification in one view.",
    accent: "Verify in seconds",
  },
  {
    title: "Designed for institutional workflows",
    description:
      "No new habits — just a clean digital layer on top of existing batch and handover practices.",
    accent: "Works with current processes",
  },
  {
    title: "Confidence across organizations",
    description:
      "Distributors prove what they sent. Receivers confirm what they received. Everyone shares trust.",
    accent: "Shared accountability",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5200);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.message ?? "Login failed";
        setError(message);
        notify({ title: "Login failed", message, variant: "error" });
        setLoading(false);
        return;
      }

      notify({
        title: "Welcome back",
        message: "Redirecting to your dashboard.",
        variant: "success",
      });
      router.push("/dashboard");
    } catch (err) {
      setError("Unable to login. Try again.");
      notify({
        title: "Login failed",
        message: "Unable to login. Try again.",
        variant: "error",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-stretch">
      <section className="hidden w-1/2 flex-col justify-between border-r border-border/60 bg-surface/70 p-12 lg:flex">
        <div className="space-y-5 fade-up">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="ChainTrust logo" width={44} height={44} />
            <p className="text-sm uppercase tracking-[0.2em] text-accent">ChainTrust</p>
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            Trusted custody history for every batch.
          </h1>
          <p className="text-muted">
            Record transfers, verify receipts, and prove provenance across Ethiopian pharmaceutical supply chains.
          </p>

          <div className="relative mt-6 overflow-hidden rounded-3xl border border-border/60 bg-white/70 p-6 shadow-[var(--shadow)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(31,123,212,0.18),_transparent_55%)]" />
            <div className="relative min-h-[150px]">
              {slides.map((slide, index) => (
                <div
                  key={slide.title}
                  className={`absolute inset-0 transition-all duration-700 ${
                    index === activeSlide
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4 pointer-events-none"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-accent">
                    {slide.accent}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-foreground">{slide.title}</h3>
                  <p className="mt-3 text-sm text-muted">{slide.description}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-6 flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  aria-label={`Slide ${index + 1}`}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 w-2 rounded-full transition ${
                    index === activeSlide ? "bg-accent" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3 text-sm text-muted">
          <p>Built for distributors, receivers, and regulators.</p>
          <p>Secure JWT access, traceable transfers, QR verification.</p>
        </div>
      </section>

      <section className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-surface p-8 shadow-[var(--shadow)]">
          <div className="mb-8 space-y-2">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="ChainTrust logo" width={36} height={36} />
              <p className="text-sm uppercase tracking-[0.3em] text-accent">Login</p>
            </div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted">Use your organization credentials to continue.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                placeholder="••••••••"
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
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-xs text-muted">
              Need an account?{" "}
              <Link href="/register" className="font-semibold text-accent">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
