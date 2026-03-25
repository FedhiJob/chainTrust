import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/app-shell";
import ChakraProviderWrapper from "@/components/chakra-provider";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_left,_rgba(31,123,212,0.35),_transparent_45%),radial-gradient(circle_at_right,_rgba(255,255,255,0.7),_transparent_50%)]" />
        <ChakraProviderWrapper>
          <AppShell>{children}</AppShell>
        </ChakraProviderWrapper>
      </body>
    </html>
  );
}
