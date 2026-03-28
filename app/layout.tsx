import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider, UserButton } from "@neondatabase/auth/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
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
          <div className="fixed top-4 right-4 z-50">
            <UserButton size="icon" />
          </div>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
