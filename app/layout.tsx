import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/query-provider";
import { Analytics } from "@vercel/analytics/react"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LingoLens | Translate the Web, Preserve the Design",
  description: "Experience the web in your language without losing the original look and feel. Instant, layout-preserving website translation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased relative min-h-screen selection:bg-primary/20`}
      >
        {/* Global Premium Background Pattern */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-background">
          <div className="absolute top-0 z-[-2] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          <div className="absolute bottom-0 left-0 z-[-2] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute top-0 right-0 z-[-2] h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[100px]" />
        </div>

        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
