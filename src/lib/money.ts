// Remuneração sempre em reais (BRL). O campo continua sendo texto no banco
// (`jobs.remuneracao_texto`), mas é gravado de forma canônica: "R$ 2.354,00".

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizarEspacos(s: string): string {
  // Intl usa espaço não separável (U+00A0) entre "R$" e o número.
  return s.replace(/ /g, " ");
}

export function formatBRL(valor: number): string {
  return normalizarEspacos(BRL.format(valor));
}

/** Converte só dígitos (centavos) em reais: "235400" -> 2354. */
export function centavosParaReais(digitos: string): number {
  const d = digitos.replace(/\D/g, "");
  if (!d) return 0;
  return Number(d) / 100;
}

/**
 * Interpreta um texto de valor em reais e devolve o número, ou null se não for
 * um valor monetário reconhecível. Aceita: "2354", "2354,00", "2.354,00",
 * "2354.00", "R$ 2.354,00".
 */
export function parseReais(texto: string): number | null {
  const t = texto.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!t) return null;
  let numero: string | null = null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) numero = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(,\d{1,2})?$/.test(t)) numero = t.replace(",", ".");
  else if (/^\d+\.\d{1,2}$/.test(t)) numero = t;
  if (numero === null) return null;
  const n = Number(numero);
  return Number.isFinite(n) ? n : null;
}

/** Texto canônico "R$ 2.354,00" ou null se vazio. Lança erro se inválido. */
export function normalizarRemuneracao(texto: string | null | undefined): string | null {
  const bruto = (texto ?? "").trim();
  if (!bruto) return null;
  const n = parseReais(bruto);
  if (n === null || n < 0) {
    throw new Error("Informe a remuneração em reais, por exemplo R$ 1.500,00.");
  }
  return formatBRL(n);
}

/** Para exibir valores antigos (ex.: "2354,00") também como reais. */
export function exibirRemuneracao(texto: string | null | undefined): string {
  const bruto = (texto ?? "").trim();
  if (!bruto) return "";
  const n = parseReais(bruto);
  return n === null ? bruto : formatBRL(n);
}
