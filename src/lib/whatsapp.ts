/**
 * Telefone brasileiro → número internacional para link de WhatsApp.
 * Aceita "(11) 99999-9999", "11999999999", "+55 11 99999-9999" etc.
 * Devolve só dígitos com DDI 55, ou `null` se não parecer telefone do Brasil.
 */
export function normalizarTelefoneBR(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const texto = bruto.trim();
  let d = texto.replace(/\D/g, "");
  const internacional = texto.startsWith("+") || d.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);
  // Número com código de país explícito que não é o do Brasil: não é nosso.
  if (internacional && !d.startsWith("55")) return null;
  if (!internacional && (d.length === 10 || d.length === 11)) d = `55${d}`;
  // 55 + DDD (11 a 99) + 8 dígitos (fixo) ou 9 dígitos começando em 9 (celular)
  const m = /^55([1-9][1-9])(\d{8,9})$/.exec(d);
  if (!m) return null;
  if (m[2].length === 9 && m[2][0] !== "9") return null;
  return d;
}

/**
 * Formas equivalentes do mesmo número: com e sem o nono dígito do celular. O WhatsApp devolve
 * ora uma, ora outra; para opt-out e bloqueio, as duas precisam casar.
 */
export function variantesTelefoneBR(bruto: string | null | undefined): string[] {
  const n = normalizarTelefoneBR(bruto);
  if (!n) return [];
  const ddd = n.slice(2, 4);
  const resto = n.slice(4);
  if (resto.length === 9) return [n, `55${ddd}${resto.slice(1)}`];
  if (resto.length === 8 && /^[6-9]/.test(resto)) return [n, `55${ddd}9${resto}`];
  return [n];
}

/** Link `wa.me` que abre a conversa (com mensagem opcional). `null` se inválido. */
export function linkWhatsApp(bruto: string | null | undefined, texto?: string): string | null {
  const n = normalizarTelefoneBR(bruto);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** Formata o número normalizado para leitura: +55 (11) 99999-9999. */
export function formatarTelefoneBR(bruto: string | null | undefined): string {
  const n = normalizarTelefoneBR(bruto);
  if (!n) return bruto?.trim() || "—";
  const ddd = n.slice(2, 4);
  const resto = n.slice(4);
  const meio = resto.length === 9 ? 5 : 4;
  return `+55 (${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}
