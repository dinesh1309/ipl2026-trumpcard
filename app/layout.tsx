import type { Metadata, Viewport } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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

const SITE_URL = "https://ipl2026-trumpcard.vercel.app";
const TITLE = "IPL 2026 Trump Cards — Vizag Edition";
const DESCRIPTION =
  "A premium IPL 2026 cricket trading-card battle game. Pick your stat, capture the card, win under the floodlights.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "IPL 2026 Trump Cards",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
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
        <Analytics />
      </body>
    </html>
  );
}
