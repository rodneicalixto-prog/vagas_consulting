// Hooks de resolução só para os testes: substitui módulos de servidor por stubs.
const STUBS = {
  "server-only": "export {};",
  react: "export const cache = (fn) => fn;",
  "next/navigation": "export const redirect = () => { throw new Error('redirect'); };",
  "@/lib/supabase/admin": "export const createAdminClient = () => { throw new Error('admin client indisponivel em teste'); };",
};
export async function resolve(specifier, context, next) {
  if (specifier in STUBS) return { url: "stub:" + specifier, shortCircuit: true };
  // Import relativo sem extensão (como o TypeScript escreve): tenta ".ts".
  if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    try {
      return await next(specifier + ".ts", context);
    } catch {
      // cai no comportamento padrão abaixo
    }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.startsWith("stub:")) {
    return { format: "module", source: STUBS[url.slice(5)], shortCircuit: true };
  }
  return next(url, context);
}
