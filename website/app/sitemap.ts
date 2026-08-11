import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-08-11T00:00:00.000Z");
  return [
    { url: "https://overcap.dev", lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: "https://overcap.dev/download", lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: "https://overcap.dev/privacy", lastModified: updated, changeFrequency: "yearly", priority: 0.4 },
    { url: "https://overcap.dev/support", lastModified: updated, changeFrequency: "monthly", priority: 0.6 },
  ];
}
