import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Notea",
    short_name: "Notea",
    description: "Football, together.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#0f3d2e",
    lang: "sw",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
