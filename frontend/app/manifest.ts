import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prabodh Portal",
    short_name: "Prabodh",
    description:
      "Smart India Hackathon 2026 internal qualifier portal by Prabodh — team formation, milestone gates, dual-mentor tracking, and deliverable submission.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF8F5",
    theme_color: "#5B2E10",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/pwa/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}