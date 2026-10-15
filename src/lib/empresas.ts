/** Regras puras do cadastro de empresa (sem banco nem rede). */
import { normalizarTelefoneBR } from "./whatsapp";

export type EnderecoEmpresa = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
};

const UFS = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);

export function ufValida(v: string | null | undefined): boolean {
  return !!v && UFS.has(v.trim().toUpperCase());
}

/** Só 8 dígitos; devolve `null` se não for um CEP. */
export function normalizarCep(v: string | null | undefined): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 8 ? d : null;
}

export function formatarCep(v: string | null | undefined): string {
  const d = normalizarCep(v);
  return d ? `${d.slice(0, 5)}-${d.slice(5)}` : (v ?? "");
}

/** "Rua A, 100, Sala 2 — Centro, São Paulo/SP — CEP 01000-000" a partir dos campos. */
export function montarEndereco(e: EnderecoEmpresa): string | null {
  const rua = [e.logradouro, e.numero].map((s) => s?.trim()).filter(Boolean).join(", ");
  const comp = e.complemento?.trim();
  const linha1 = [rua, comp].filter(Boolean).join(", ");
  const cidadeUf = [e.cidade?.trim(), e.uf?.trim().toUpperCase()].filter(Boolean).join("/");
  const linha2 = [e.bairro?.trim(), cidadeUf].filter(Boolean).join(", ");
  const cep = normalizarCep(e.cep);
  const partes = [linha1, linha2].filter(Boolean).join(" — ");
  const final = [partes, cep ? `CEP ${formatarCep(cep)}` : ""].filter(Boolean).join(" — ");
  return final || null;
}

/** Telefone opcional: vazio vira null; preenchido e inválido vira `undefined` (erro). */
export function telefoneOpcional(v: string | null | undefined): string | null | undefined {
  const t = (v ?? "").trim();
  if (!t) return null;
  return normalizarTelefoneBR(t) ?? undefined;
}
