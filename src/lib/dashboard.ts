/**
 * Regras puras do dashboard do operador (docs/specs/DASHBOARD_OPERADOR.md).
 * Sem acesso a banco: tudo aqui é testável isoladamente.
 */

export type Periodo = "7d" | "30d" | "90d" | "mes" | "tudo";

export const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "90d", rotulo: "90 dias" },
  { valor: "mes", rotulo: "Mês atual" },
  { valor: "tudo", rotulo: "Tudo" },
];

const DIA_MS = 24 * 3600_000;

export function parsePeriodo(v: string | undefined): Periodo {
  return PERIODOS.some((p) => p.valor === v) ? (v as Periodo) : "30d";
}

/** Início do período em ms; `null` = sem limite. */
export function inicioPeriodo(p: Periodo, agora: number): number | null {
  if (p === "tudo") return null;
  if (p === "mes") {
    const d = new Date(agora);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  const dias = p === "7d" ? 7 : p === "30d" ? 30 : 90;
  return agora - dias * DIA_MS;
}

export function diasDesde(iso: string | null | undefined, agora: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / DIA_MS));
}

export type Semaforo = "verde" | "amarelo" | "vermelho";

/** Verde até o 1º limite, amarelo até o 2º, vermelho acima (E4: 15 e 30 dias). */
export function semaforoVaga(dias: number, limites: [number, number] = [15, 30]): Semaforo {
  if (dias <= limites[0]) return "verde";
  if (dias <= limites[1]) return "amarelo";
  return "vermelho";
}

/** Grupos de etapas usados pelos cards (E1: aprovados = só contratado). */
export const GRUPOS_ETAPA = {
  recebida: ["recebida"],
  triagem: ["triagem"],
  entrevista: ["entrevista"],
  teste: ["teste"],
  proposta: ["proposta"],
  contratado: ["contratado"],
  reprovados: ["rejeitada", "reprovado_cliente"],
} as const;

export type GrupoEtapa = keyof typeof GRUPOS_ETAPA;

export const ETAPAS_EM_ABERTO = ["recebida", "triagem", "entrevista", "teste", "proposta"];

export function grupoDaEtapa(status: string): GrupoEtapa | null {
  for (const [grupo, lista] of Object.entries(GRUPOS_ETAPA)) {
    if ((lista as readonly string[]).includes(status)) return grupo as GrupoEtapa;
  }
  return null;
}

/** Semanas (da mais antiga para a atual) para o gráfico de evolução. */
export function semanasRecentes(n: number, agora: number): { inicio: number; fim: number; rotulo: string }[] {
  const semana = 7 * DIA_MS;
  const out: { inicio: number; fim: number; rotulo: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const fim = agora - i * semana;
    const inicio = fim - semana;
    const d = new Date(inicio);
    out.push({
      inicio,
      fim,
      rotulo: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return out;
}
