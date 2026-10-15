"use client";

import { useEffect, useState } from "react";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";

type Fase = "verificando" | "pronto" | "invalido";

/** Primeiro acesso (convite) e redefinição de senha da equipe interna. */
export default function DefinirSenhaPage() {
  const [fase, setFase] = useState<Fase>("verificando");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const busca = new URLSearchParams(window.location.search);

    async function verificar(): Promise<Fase> {
      if (hash.get("error") || hash.get("error_description")) return "invalido";
      const at = hash.get("access_token");
      const rt = hash.get("refresh_token");
      if (at && rt) {
        const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        if (error) return "invalido";
        window.history.replaceState(null, "", window.location.pathname);
        return "pronto";
      }
      const code = busca.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return "invalido";
        window.history.replaceState(null, "", window.location.pathname);
        return "pronto";
      }
      const { data } = await supabase.auth.getSession();
      return data.session ? "pronto" : "invalido";
    }

    verificar()
      .then(setFase)
      .catch(() => setFase("invalido"));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 10) return setErro("A senha deve ter pelo menos 10 caracteres.");
    if (senha !== confirma) return setErro("As senhas não são iguais.");
    setSalvando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      return setErro("Não foi possível salvar a senha. Peça um novo link e tente de novo.");
    }
    window.location.href = "/admin";
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0c1526] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-3 p-9">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark size={28} />
          <Wordmark light />
          <span className="ml-1 rounded bg-danger px-1.5 py-0.5 text-[9px] font-extrabold text-white">ADMIN</span>
        </div>

        {fase === "verificando" && <p className="text-sm text-white/70">Verificando o link...</p>}

        {fase === "invalido" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#dc8290]">Este link é inválido ou já expirou.</p>
            <a href="/admin/login" className="text-sm font-bold text-gold-2 underline">
              Voltar ao login e pedir um novo link
            </a>
          </div>
        )}

        {fase === "pronto" && (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <h1 className="text-base font-extrabold text-white">Defina sua senha de acesso</h1>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-white/60">Nova senha (mínimo 10 caracteres)</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none focus:border-gold-2"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-white/60">Repita a senha</span>
              <input
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none focus:border-gold-2"
              />
            </label>
            {erro && <p className="text-[12.5px] font-semibold text-[#dc8290]">{erro}</p>}
            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar senha e entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
