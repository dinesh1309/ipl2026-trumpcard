import type { Metadata, Viewport } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Bold condensed display for headings.
const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Clean humanist body sans.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Tabular mono for stat numbers.
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IPL 2026 Trump Cards — Vizag Edition",
  description:
    "A premium IPL 2026 cricket trading-card battle game. Pick your stat, win the round under the floodlights.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#05070f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
