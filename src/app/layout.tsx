import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
  title: "ReciteAI // Institutional Manuscript Verification",
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
  ],
  authors: [{ name: "ReciteAI Engineering" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}