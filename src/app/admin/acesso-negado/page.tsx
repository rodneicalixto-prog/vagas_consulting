import Link from "next/link";
import { adminSignOut } from "../actions";

export default function AcessoNegadoPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-extrabold text-navy">Acesso não autorizado</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-2">
          Sua conta não possui acesso ativo ao painel interno da Vagas Consulting.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-text-2">
            Ir para o início
          </Link>
          <form action={adminSignOut}>
            <button className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">
              Sair e trocar de conta
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
