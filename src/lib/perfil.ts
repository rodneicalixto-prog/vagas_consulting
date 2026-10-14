// Completude do perfil do candidato, calculada na hora a partir dos dados
// reais (nunca de um número gravado, que ficava velho). Ver docs/APP_FLOW.md.

export type PerfilParaCalculo = {
  nome_completo?: string | null;
  cidade?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  idade?: number | null;
  modelo_trabalho?: string[] | null;
  modalidades_desejadas?: string[] | null;
  disponibilidade?: string | null;
  experiencias_profissionais?: unknown;
  nunca_trabalhou?: boolean | null;
};

export type ItemPerfil = { chave: string; label: string; href: string; ok: boolean };

const texto = (v: string | null | undefined) => typeof v === "string" && v.trim().length > 0;
const lista = (v: unknown[] | null | undefined) => Array.isArray(v) && v.length > 0;

/**
 * 9 itens, pesos iguais. O currículo anexado fica de fora porque é opcional
 * (o app aceita telefone + endereço no lugar).
 */
export function avaliarPerfil(p: PerfilParaCalculo | null | undefined) {
  const d = p ?? {};
  const itens: ItemPerfil[] = [
    { chave: "nome", label: "nome", href: "/perfil/dados-pessoais", ok: texto(d.nome_completo) },
    { chave: "cidade", label: "cidade", href: "/perfil/dados-pessoais", ok: texto(d.cidade) },
    { chave: "telefone", label: "telefone", href: "/perfil/dados-pessoais", ok: texto(d.telefone) },
    { chave: "endereco", label: "endereço", href: "/perfil/dados-pessoais", ok: texto(d.endereco) },
    { chave: "idade", label: "idade", href: "/perfil/dados-pessoais", ok: typeof d.idade === "number" && d.idade > 0 },
    {
      chave: "modelo",
      label: "modelo de trabalho",
      href: "/perfil/preferencias-vaga",
      ok: lista(d.modelo_trabalho),
    },
    {
      chave: "modalidades",
      label: "modalidades desejadas",
      href: "/perfil/preferencias-vaga",
      ok: lista(d.modalidades_desejadas),
    },
    {
      chave: "disponibilidade",
      label: "disponibilidade",
      href: "/perfil/preferencias-vaga",
      ok: texto(d.disponibilidade),
    },
    {
      chave: "experiencia",
      label: "experiência profissional",
      href: "/experiencias",
      ok: d.nunca_trabalhou === true || lista(d.experiencias_profissionais as unknown[] | null),
    },
  ];
  const preenchidos = itens.filter((i) => i.ok).length;
  return {
    pct: Math.round((preenchidos / itens.length) * 100),
    itens,
    faltando: itens.filter((i) => !i.ok),
  };
}
