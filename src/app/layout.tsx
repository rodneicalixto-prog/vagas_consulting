import type { Metadata, Viewport } from "next";
import { InstallLeadCapture } from "@/components/install-lead-capture";
import { InstallAppButton } from "@/components/install-app-button";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vagas Consulting",
  description:
    "Vagas efetivas, PJ e temporárias em um só lugar — app do candidato Vagas Consulting.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vagas Consulting",
  },
  icons: {
    icon: [{ url: "/icon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101d33",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">
        {children}
        <InstallLeadCapture />
        <InstallAppButton />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
