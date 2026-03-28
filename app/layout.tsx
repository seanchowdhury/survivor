import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { Analytics } from "@vercel/analytics/next"

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
          <SiteHeader />
          <div className="pt-14">
            {children}
          </div>
          <footer className="text-center py-4 text-xs text-gray-500 bg-gray-800">
            Episode data sourced from the{" "}
            <a
              href="https://survivor.fandom.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-400 transition-colors"
            >
              Survivor Wiki on Fandom
            </a>
          </footer>
        </NeonAuthUIProvider>
        <Analytics />
      </body>
    </html>
  );
}
