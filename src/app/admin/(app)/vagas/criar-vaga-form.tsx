"use client";

import { useState } from "react";
import { criarVaga } from "./actions";
import { SubmitButton } from "@/components/form-buttons";

type VagaDefaults = {
  modalidade: string;
  local: string;
  remuneracao_texto: string;
  descricao: string;
  requisitos: string;
};

export function CriarVagaForm({
  companies,
  defaultsByCompany,
}: {
  companies: { id: string; razao_social: string; nome_fantasia: string | null }[];
  defaultsByCompany: Record<string, VagaDefaults>;
}) {
  const [campos, setCampos] = useState<VagaDefaults>({
    modalidade: "",
    local: "",
    remuneracao_texto: "",
    descricao: "",
    requisitos: "",
  });
  const [preenchidoAutomaticamente, setPreenchidoAutomaticamente] = useState(false);

  const onEmpresaChange = (companyId: string) => {
    const defaults = defaultsByCompany[companyId];
    if (defaults) {
      setCampos(defaults);
      setPreenchidoAutomaticamente(true);
    } else {
      setPreenchidoAutomaticamente(false);
    }
  };

  return (
    <form
      action={criarVaga}
      className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2"
    >
      <h2 className="text-sm font-extrabold text-text md:col-span-2">Cadastrar vaga</h2>
      <select
        name="company_id"
        required
        defaultValue=""
        onChange={(e) => onEmpresaChange(e.target.value)}
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
      >
        <option value="" disabled>
          Selecionar empresa
        </option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.nome_fantasia ?? company.razao_social}
          </option>
        ))}
      </select>
      <input
        name="titulo"
        required
        placeholder="Título da vaga"
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
      />
      <select
        name="modalidade"
        required
        value={campos.modalidade}
        onChange={(e) => setCampos((c) => ({ ...c, modalidade: e.target.value }))}
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
      >
        <option value="" disabled>
          Modalidade
        </option>
        <option value="efetiva">Efetiva</option>
        <option value="pj">PJ</option>
        <option value="temporaria">Temporária</option>
      </select>
      <input
        name="local"
        placeholder="Local"
        value={campos.local}
        onChange={(e) => setCampos((c) => ({ ...c, local: e.target.value }))}
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
      />
      <input
        name="remuneracao_texto"
        placeholder="Remuneração"
        value={campos.remuneracao_texto}
        onChange={(e) => setCampos((c) => ({ ...c, remuneracao_texto: e.target.value }))}
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm md:col-span-2"
      />
      <textarea
        name="descricao"
        placeholder="Descrição"
        rows={3}
        value={campos.descricao}
        onChange={(e) => setCampos((c) => ({ ...c, descricao: e.target.value }))}
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
      />
      <textarea
        name="requisitos"
        placeholder="Requisitos"
        rows={3}
        value={campos.requisitos}
        onChange={(e) => setCampos((c) => ({ ...c, requisitos: e.target.value }))}
        className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
      />
      {preenchidoAutomaticamente && (
        <p className="text-[11px] font-semibold text-navy md:col-span-2">
          Campos preenchidos com base na última vaga cadastrada pra essa empresa — revise antes de
          salvar.
        </p>
      )}
      <SubmitButton
        pendingLabel="Salvando..."
        className="rounded-lg bg-navy px-4 py-2.5 text-sm font-extrabold text-white md:col-span-2"
      >
        Salvar rascunho
      </SubmitButton>
    </form>
  );
}
