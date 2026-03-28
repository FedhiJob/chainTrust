import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/app-shell";

export const metadata: Metadata = {
  title: "ChainTrust",
  description: "Pharmaceutical supply chain traceability platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_left,_rgba(31,123,212,0.35),_transparent_45%),radial-gradient(circle_at_right,_rgba(255,255,255,0.7),_transparent_50%)]" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
