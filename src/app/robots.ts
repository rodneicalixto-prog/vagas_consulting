import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/hunter-servidor";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/vagas", "/vagas/"],
      disallow: ["/admin", "/api", "/h/", "/vagas/*/candidatura", "/login", "/onboarding", "/inicio"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
