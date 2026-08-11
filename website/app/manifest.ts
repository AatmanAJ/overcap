import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Overcap",
    short_name: "Overcap",
    description: "Track usage and limits across your AI coding tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    icons: [{ src: "/overcap-icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
