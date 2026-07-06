import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";
import NavBar from "@/components/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Membership Points",
  description: "Scan to earn points, unlock achievements, redeem rewards",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Club Points",
  },
};

export const viewport: Viewport = {
  themeColor: "#d97757",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <NavBar />
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
