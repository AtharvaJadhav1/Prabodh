import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "../components/PwaRegister";

export const metadata: Metadata = {
  title: "Smart India Hackathon (SIH) Portal | MIT-ADT University",
  description:
    "Project Based Learning Portal - MIT-ADT University. Centralized SIH team management, dual-mentor tracking, and milestone-based evaluation.",
  applicationName: "SIH Portal - MIT-ADT",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.ico", type: "image/x-icon" }],
    apple: [{ url: "/icons/pwa/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "SIH Portal",
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
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Cinzel:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-brand-canvas text-brand-charcoal antialiased selection:bg-brand-primary selection:text-white">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}