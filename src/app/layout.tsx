import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";
import NavBar from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "Kent Malaysia Society Membership",
  description: "University of Kent Canterbury Malaysia Society membership, events, rewards, and community check-ins",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MSoc",
  },
};

export const viewport: Viewport = {
  themeColor: "#cc0001",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <NavBar />
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
