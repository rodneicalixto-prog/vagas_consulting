"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/form-buttons";

type Funcao = "operador" | "admin_empresa" | "admin" | "superadmin";

const OPCOES: { valor: Funcao; rotulo: string; dica: string }[] = [
  { valor: "operador", rotulo: "Operador", dica: "Atende candidatos e conversas da carteira. Não vê financeiro nem outras empresas." },
  {
    valor: "admin_empresa",
    rotulo: "Admin da empresa",
    dica: "Gerencia a equipe, a black list e as integrações da própria empresa.",
  },
  {
    valor: "admin",
    rotulo: "Admin da plataforma",
    dica: "Enxerga todas as empresas e pode publicar vagas e aprovar empresas.",
  },
  {
    valor: "superadmin",
    rotulo: "Superadmin",
    dica: "Acesso total: todas as empresas, financeiro, integrações e configurações.",
  },
];

/** Convite com a função já definida: quem entra sabe exatamente o que poderá fazer. */
export function FormularioConvite({
  action,
  cheio,
  podeEscolherFuncao,
}: {
  action: (formData: FormData) => void | Promise<void>;
  cheio: boolean;
  podeEscolherFuncao: boolean;
}) {
  const [funcao, setFuncao] = useState<Funcao>("operador");
  const [confirmou, setConfirmou] = useState(false);
  const bloqueadoPorLimite = cheio && (funcao === "operador" || funcao === "admin_empresa");
  const exigeConfirmacao = funcao === "superadmin";
  const dica = OPCOES.find((o) => o.valor === funcao)?.dica;

  return (
    <form
      action={action}
      className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3"
    >
      <input
        name="nome"
        required
        minLength={2}
        maxLength={120}
        placeholder="Nome"
        className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="E-mail"
        className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
      />
      {podeEscolherFuncao ? (
        <select
          name="funcao"
          value={funcao}
          onChange={(e) => {
            setFuncao(e.target.value as Funcao);
            setConfirmou(false);
          }}
          className="rounded-xl border border-border bg-bg px-3 py-2 text-sm font-bold"
        >
          {OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="funcao" value="operador" />
      )}

      <p className="text-[11.5px] text-text-2 md:col-span-2">
        <b className="text-text">Função:</b> {dica}
      </p>
      <SubmitButton
        pendingLabel="Convidando..."
        disabled={bloqueadoPorLimite || (exigeConfirmacao && !confirmou)}
        className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
      >
        Enviar convite
      </SubmitButton>

      {exigeConfirmacao && (
        <label className="flex items-start gap-2 rounded-xl bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-3">
          <input
            type="checkbox"
            name="confirmo_total"
            value="sim"
            checked={confirmou}
            onChange={(e) => setConfirmou(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Confirmo que esta pessoa terá acesso total à plataforma, inclusive aos dados de todas as empresas
            clientes e aos valores financeiros.
          </span>
        </label>
      )}

      {bloqueadoPorLimite && (
        <p className="text-[12px] text-danger md:col-span-3">
          Todas as vagas de operador estão em uso. Desative um operador ou amplie o limite da empresa.
        </p>
      )}
    </form>
  );
}
