import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kent Malaysia Society Membership",
    short_name: "MSoc",
    description: "University of Kent Canterbury Malaysia Society membership, events, rewards, and community check-ins",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#cc0001",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
