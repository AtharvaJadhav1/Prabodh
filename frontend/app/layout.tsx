import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "../components/PwaRegister";
import AuthProviders from "../components/auth/AuthProviders";

export const metadata: Metadata = {
  title: {
    default: "Prabodh",
    template: "Prabodh | %s",
  },
  description:
    "Prabodh — Project Based Learning Portal. Centralized SIH team management, dual-mentor tracking, and milestone-based evaluation.",
  applicationName: "Prabodh",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/pwa/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/icons/pwa/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Prabodh",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#5B2E10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Cinzel:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-brand-canvas text-brand-charcoal antialiased selection:bg-brand-primary selection:text-white">
        <AuthProviders>
          {children}
          <PwaRegister />
        </AuthProviders>
      </body>
    </html>
  );
}