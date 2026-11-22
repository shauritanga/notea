import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { connection } from "next/server";
import { RegisterServiceWorker } from "@/components/pwa";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const instant = false;

export const metadata: Metadata = {
  title: "Notea",
  description: "Football, together. Mpira, pamoja.",
  applicationName: "Notea",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Notea", statusBarStyle: "black" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#101410",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="sw" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
