import { authClient } from '@/lib/auth/client'; 
import { NeonAuthUIProvider, UserButton } from '@neondatabase/auth/react'; 
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'My Neon App',
  description: 'A Next.js application with Neon Auth',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
          <header className='flex justify-end items-center p-4 gap-4 h-16'>
            <UserButton size="icon" />
          </header>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}