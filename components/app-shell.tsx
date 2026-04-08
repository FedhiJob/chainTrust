"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ToastProvider } from "@/components/toast";
import { useAuth } from "@/lib/use-auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const hideChrome =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify");
  const showChrome = mounted && !hideChrome;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = useMemo(() => {
    if (!user) return [];
    const links = [{ label: "Dashboard", href: "/dashboard" }];

    if (user.role === "admin" || user.role === "distributor" || user.role === "receiver") {
      links.push({
        label: user.role === "receiver" ? "Incoming" : "Batches",
        href: "/batches",
      });
    }

    if (user.role === "distributor") {
      links.push({ label: "Transfers", href: "/transfers/create" });
    }

    links.push({ label: "History", href: "/history" });

    return links;
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <ToastProvider>
      {showChrome ? (
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-surface/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="ChainTrust logo" width={36} height={36} />
                <div>
                  <p className="text-sm font-semibold text-foreground">ChainTrust</p>
                  <p className="text-xs text-muted">
                    Trust infrastructure for physical goods
                  </p>
                </div>
              </div>

              <nav className="hidden items-center gap-3 text-sm font-medium text-muted md:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-3 py-1 transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-3 md:flex">
                {user ? (
                  <div className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {user.fullName} | {user.role}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-accent-strong px-4 py-1 text-xs font-semibold text-white transition hover:bg-accent"
                >
                  Logout
                </button>
              </div>

              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
                className="inline-flex items-center justify-center rounded-full bg-accent-strong px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent md:hidden"
              >
                Menu
              </button>
            </div>
          </header>

          {menuOpen ? (
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-black/40"
                onClick={() => setMenuOpen(false)}
              />
              <aside className="absolute right-0 top-0 flex h-full w-72 flex-col gap-6 border-l border-border bg-surface px-6 py-6 shadow-[var(--shadow)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Menu</p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-semibold text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                {user ? (
                  <div className="rounded-xl border border-border px-3 py-2 text-xs text-muted">
                    {user.fullName} | {user.role}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-accent-strong px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent"
                >
                  Logout
                </button>
              </aside>
            </div>
          ) : null}

          <main className="flex-1">{children}</main>

          <footer className="border-t border-border bg-surface/90">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-6">
              <p>ChainTrust is a digital accountability layer for institutional transfers.</p>
              <p>(c) 2026 ChainTrust. All rights reserved.</p>
            </div>
          </footer>
        </div>
      ) : (
        <main className="min-h-screen">{children}</main>
      )}
    </ToastProvider>
  );
}

