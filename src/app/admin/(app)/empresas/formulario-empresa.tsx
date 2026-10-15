"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/form-buttons";

export type DadosEmpresa = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  email_contato?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  responsavel_nome?: string | null;
  responsavel_cargo?: string | null;
  responsavel_telefone?: string | null;
  responsavel_email?: string | null;
};

const campo = "rounded-lg border border-border bg-bg px-3 py-2.5 text-sm";

function Rotulo({ texto, children, cheio = false }: { texto: string; children: React.ReactNode; cheio?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${cheio ? "md:col-span-2" : ""}`}>
      <span className="text-[10.5px] font-bold text-text-2">{texto}</span>
      {children}
    </label>
  );
}

/**
 * Cadastro/edição da empresa: dados, contato, endereço completo (com busca
 * automática pelo CEP) e responsável.
 */
export function FormularioEmpresa({
  action,
  dados = {},
  companyId,
  rotuloBotao,
}: {
  action: (formData: FormData) => void | Promise<void>;
  dados?: DadosEmpresa;
  companyId?: string;
  rotuloBotao: string;
}) {
  const [end, setEnd] = useState({
    cep: dados.cep ?? "",
    logradouro: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.cidade ?? "",
    uf: dados.uf ?? "",
  });
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscando(true);
    setAviso(null);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = (await r.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (j.erro) {
        setAviso("CEP não encontrado. Preencha o endereço manualmente.");
      } else {
        setEnd((e) => ({
          ...e,
          logradouro: j.logradouro || e.logradouro,
          bairro: j.bairro || e.bairro,
          cidade: j.localidade || e.cidade,
          uf: j.uf || e.uf,
        }));
      }
    } catch {
      setAviso("Não foi possível consultar o CEP agora. Preencha manualmente.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {companyId && <input type="hidden" name="company_id" value={companyId} />}

      <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-text-3 md:col-span-2">Empresa</h3>
      <Rotulo texto="Razão social *">
        <input name="razao_social" required defaultValue={dados.razao_social ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="Nome fantasia">
        <input name="nome_fantasia" defaultValue={dados.nome_fantasia ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="CNPJ (somente números)">
        <input name="cnpj" inputMode="numeric" defaultValue={dados.cnpj ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="Telefone da empresa">
        <input name="telefone" placeholder="(11) 3000-0000" defaultValue={dados.telefone ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="E-mail de contato" cheio>
        <input name="email_contato" type="email" defaultValue={dados.email_contato ?? ""} className={campo} />
      </Rotulo>

      <h3 className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-text-3 md:col-span-2">
        Endereço completo
      </h3>
      <Rotulo texto={`CEP ${buscando ? "(buscando...)" : ""}`}>
        <input
          name="cep"
          inputMode="numeric"
          placeholder="00000-000"
          value={end.cep}
          onChange={(e) => setEnd((s) => ({ ...s, cep: e.target.value }))}
          onBlur={(e) => buscarCep(e.target.value)}
          className={campo}
        />
      </Rotulo>
      <Rotulo texto="Logradouro">
        <input
          name="logradouro"
          value={end.logradouro}
          onChange={(e) => setEnd((s) => ({ ...s, logradouro: e.target.value }))}
          className={campo}
        />
      </Rotulo>
      <Rotulo texto="Número">
        <input name="numero" defaultValue={dados.numero ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="Complemento">
        <input name="complemento" defaultValue={dados.complemento ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="Bairro">
        <input
          name="bairro"
          value={end.bairro}
          onChange={(e) => setEnd((s) => ({ ...s, bairro: e.target.value }))}
          className={campo}
        />
      </Rotulo>
      <div className="grid grid-cols-[1fr_88px] gap-3">
        <Rotulo texto="Cidade">
          <input
            name="cidade"
            value={end.cidade}
            onChange={(e) => setEnd((s) => ({ ...s, cidade: e.target.value }))}
            className={campo}
          />
        </Rotulo>
        <Rotulo texto="UF">
          <input
            name="uf"
            maxLength={2}
            value={end.uf}
            onChange={(e) => setEnd((s) => ({ ...s, uf: e.target.value.toUpperCase() }))}
            className={campo}
          />
        </Rotulo>
      </div>
      {aviso && <p className="text-[11.5px] font-semibold text-gold-3 md:col-span-2">{aviso}</p>}

      <h3 className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-text-3 md:col-span-2">
        Responsável
      </h3>
      <Rotulo texto="Nome do responsável *">
        <input name="responsavel_nome" required defaultValue={dados.responsavel_nome ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="Cargo">
        <input name="responsavel_cargo" defaultValue={dados.responsavel_cargo ?? ""} className={campo} />
      </Rotulo>
      <Rotulo texto="Telefone / WhatsApp do responsável">
        <input
          name="responsavel_telefone"
          placeholder="(11) 90000-0000"
          defaultValue={dados.responsavel_telefone ?? ""}
          className={campo}
        />
      </Rotulo>
      <Rotulo texto="E-mail do responsável">
        <input
          name="responsavel_email"
          type="email"
          defaultValue={dados.responsavel_email ?? ""}
          className={campo}
        />
      </Rotulo>

      <SubmitButton
        pendingLabel="Salvando..."
        className="rounded-lg bg-navy px-4 py-2.5 text-sm font-extrabold text-white md:col-span-2"
      >
        {rotuloBotao}
      </SubmitButton>
    </form>
  );
}
