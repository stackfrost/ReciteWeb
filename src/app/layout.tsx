import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "ReciteWeb // Institutional Manuscript Verification",
  description:
    "Autonomous manuscript pre-flight auditor. Isolates LaTeX math boundaries, indexes uncited claims across arXiv, Semantic Scholar, and OpenAlex, and detects retraction traps before peer review.",
  keywords: [
    "manuscript verification",
    "citation auditor",
    "LaTeX parser",
    "scientific publishing",
    "Zotero sync",
    "OpenAlex",
    "arXiv preprints",
    "peer review defense",
    "ReciteWeb",
  ],
  authors: [{ name: "ReciteWeb Engineering" }],
};

import { GlobalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import { CookieConsentBanner } from "@/components/common/CookieConsentBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark scroll-smooth"
    >
      <body className={`${inter.variable} ${jetbrainsMono.variable} bg-zinc-950 text-zinc-100 font-sans antialiased min-h-screen`}>
        <GlobalErrorBoundary>
          {children}
          <CookieConsentBanner />
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}