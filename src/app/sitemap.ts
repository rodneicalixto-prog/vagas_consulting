import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/hunter-servidor";
import { listarVagasPublicas } from "@/lib/vagas-publicas";

// Vagas mudam ao longo do dia (publicar, pausar, vencer): não gerar no build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const vagas = await listarVagasPublicas(1000);
  return [
    { url: `${base}/vagas`, changeFrequency: "daily", priority: 0.8 },
    ...vagas.map((v) => ({
      url: `${base}/vagas/${v.id}`,
      lastModified: v.updated_at ?? v.publicada_em ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
