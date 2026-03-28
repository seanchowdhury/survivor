import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider, UserButton } from "@neondatabase/auth/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fantasy for Survivor Fans",
  description: "A survivor fantasy leage website",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", figtree.variable)}
    >
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NeonAuthUIProvider
          // @ts-expect-error: Typing issue from neon
          authClient={authClient}
          redirectTo="/account/settings"
          emailOTP
        >
          {/* Mobile: full-width bar. Desktop: floating text links + floating user button */}
          <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 sm:hidden">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Episodes</Link>
              <span className="text-gray-600">·</span>
              <Link href="/season" className="text-gray-400 hover:text-white transition-colors">Season</Link>
            </nav>
            <UserButton size="icon" />
          </div>
          <nav className="hidden sm:flex fixed top-4 left-4 z-50 items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">Episodes</Link>
            <span className="text-gray-600">·</span>
            <Link href="/season" className="text-gray-400 hover:text-white transition-colors">Season</Link>
          </nav>
          <div className="hidden sm:block fixed top-4 right-4 z-50">
            <UserButton size="icon" />
          </div>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
