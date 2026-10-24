import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "কথা — মেসেজ ও ফ্রি অডিও কল",
  description:
    "বাংলা ভাষার মেসেজিং অ্যাপ। বিনামূল্যে মেসেজ পাঠান, ভয়েস বার্তা দিন আর ইন্টারনেটে অডিও কল করুন।",
  manifest: "/manifest.webmanifest",
  applicationName: "কথা",
  appleWebApp: {
    capable: true,
    title: "কথা",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/app-icon.png",
    apple: "/icons/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b7fff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
