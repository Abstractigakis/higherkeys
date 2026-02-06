import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/providers";
import { Logo } from "@/components/logo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Higher Keys",
  description: "Organize your thoughts with hierarchical labels.",
  openGraph: {
    title: "Higher Keys",
    description: "Organize your thoughts with hierarchical labels.",
    url: "https://higherkeys.com",
    siteName: "Higher Keys",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Higher Keys",
    description: "Organize your thoughts with hierarchical labels.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col relative`}
      >
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[-1] overflow-hidden">
          <Logo className="size-[800px] text-primary/5 blur-[120px] opacity-50" />
        </div>
        <Providers>
          <main className="flex-1">{children}</main>
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
