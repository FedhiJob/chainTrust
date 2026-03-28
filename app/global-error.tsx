"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">
            ChainTrust
          </p>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted">
            An unexpected error occurred. Please try again.
          </p>
          {error?.digest ? (
            <p className="text-xs text-muted">Reference: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-accent px-5 py-2 text-xs font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
