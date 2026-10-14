/** Contagem de vagas de operador da empresa (docs/specs/ADMIN_DA_EMPRESA.md §3). */
export type VagasOperador = {
  limite: number;
  emUso: number;
  emAberto: number;
  cheio: boolean;
};

export function calcularVagasOperador(limite: number, emUso: number): VagasOperador {
  const l = Math.max(0, Math.trunc(limite));
  const u = Math.max(0, Math.trunc(emUso));
  const aberto = Math.max(0, l - u);
  return { limite: l, emUso: u, emAberto: aberto, cheio: aberto === 0 };
}

/** Texto da tela: "3 de 5 operadores em uso · 2 em aberto". */
export function rotuloVagasOperador(v: VagasOperador): string {
  return `${v.emUso} de ${v.limite} operadores em uso · ${v.emAberto} em aberto`;
}

/** O erro do gatilho do banco indica limite excedido? */
export function erroLimiteExcedido(err: { message?: string; code?: string } | null | undefined): boolean {
  return !!err && (err.message?.includes("limite_operadores_excedido") ?? false);
}
