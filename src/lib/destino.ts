/**
 * Destino pós-login/cadastro (vitrine pública → candidatar-se).
 * Só aceita caminho interno do candidato; nunca URL externa nem área admin.
 */
export function sanitizarDestino(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = v.trim();
  if (!d.startsWith("/") || d.startsWith("//") || d.includes("\\") || d.includes("\n") || d.includes("\r")) {
    return null;
  }
  if (/^\/(admin|login|api|termos|onboarding|experiencias)(\/|$|\?)/.test(d)) return null;
  if (d.length > 200) return null;
  return d;
}
