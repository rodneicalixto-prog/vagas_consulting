"use client";

import { useActionState, useEffect, useState } from "react";
import {
  convidarAdmin,
  listarEmpresasAprovadas,
  type ConvidarState,
  type EmpresaOpcao,
} from "./actions";

const initialState: ConvidarState = { error: null };

export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(convidarAdmin, initialState);
  const [perfil, setPerfil] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaOpcao[] | null>(null);
  const ehAdminEmpresa = perfil === "admin_empresa";

  useEffect(() => {
    if (!ehAdminEmpresa || empresas !== null) return;
    let ativo = true;
    listarEmpresasAprovadas()
      .then((lista) => {
        if (ativo) setEmpresas(lista);
      })
      .catch(() => {
        if (ativo) setEmpresas([]);
      });
    return () => {
      ativo = false;
    };
  }, [ehAdminEmpresa, empresas]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2.5 rounded-2xl border border-border bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Nome</span>
        <input name="nome" className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">E-mail</span>
        <input name="email" type="email" required className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Telefone</span>
        <input name="telefone" placeholder="(11) 90000-0000" className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Perfil</span>
        <select
          name="perfil"
          required
          value={perfil}
          onChange={(e) => setPerfil(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]"
        >
          <option value="" disabled>Selecionar...</option>
          <option value="admin">Administrador</option>
          <option value="operador">Operador</option>
          <option value="admin_empresa">Admin da empresa</option>
        </select>
      </label>
      {ehAdminEmpresa && (
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Empresa</span>
          <select
            name="company_id"
            required
            defaultValue=""
            disabled={empresas === null}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]"
          >
            <option value="" disabled>
              {empresas === null ? "Carregando..." : "Selecionar empresa..."}
            </option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-2.5 text-[12px] font-extrabold text-[#1c1508] disabled:opacity-60"
      >
        {pending ? "Enviando..." : "+ Convidar usuário"}
      </button>

      {state.error && <p className="w-full text-[11.5px] font-semibold text-danger">{state.error}</p>}
      {state.info && <p className="w-full text-[11.5px] font-semibold text-success">{state.info}</p>}
    </form>
  );
}
