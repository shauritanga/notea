import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Notea",
    short_name: "Notea",
    description: "Football, together.",
    start_url: "/",
    display: "standalone",
    background_color: "#101410",
    theme_color: "#101410",
    lang: "sw",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
