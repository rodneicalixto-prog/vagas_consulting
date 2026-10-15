import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { placeholdersPendentes, verificarOferta, versaoCurta, type DadosOferta } from "@/lib/oferta";
import { AcoesOferta, Copiar, Imprimir } from "../forms-oferta";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COR = { ok: "bg-success-bg text-success", aviso: "bg-gold-bg text-gold-3", bloqueio: "bg-danger-bg text-danger" } as const;
const ROT = { ok: "OK", aviso: "Aviso", bloqueio: "Bloqueia" } as const;

export default async function CartaPage({ params }: { params: Promise<{ id: string; offerId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, offerId } = await params;
  if (!UUID.test(id) || !UUID.test(offerId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: o } = await admin.from("offer_letters").select("*").eq("id", offerId).eq("job_id", id).maybeSingle();
  if (!o) redirect(`/admin/vagas/${id}/ofertas`);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
  if (!gestao && o.criado_por !== user.id) redirect(`/admin/vagas/${id}/ofertas`);

  const dados = o.dados as unknown as DadosOferta;
  const vs = verificarOferta(dados, o.texto);
  const pend = new Set(placeholdersPendentes(o.texto));
  // Destaca os campos em branco sem perder o texto.
  const partes = o.texto.split(/(\{[^{}]+\})/g);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7 print:hidden">
        <Link href={`/admin/vagas/${id}/ofertas`} className="text-[11.5px] font-bold text-navy underline">← Cartas-oferta</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">
          Carta-oferta v{o.versao} · {o.status}
        </h1>
        <p className="mt-1 text-xs text-text-2">Confira os campos, peça a revisão do DP/jurídico e então registre o envio.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <ul className="grid gap-1.5 rounded-2xl border border-border bg-surface p-4 md:grid-cols-2 print:hidden">
          {vs.map((v) => (
            <li key={v.id} className="flex items-start gap-2 text-[11.5px] text-text-2">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[v.nivel]}`}>{ROT[v.nivel]}</span>
              <span>{v.mensagem}</span>
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <h2 className="text-sm font-extrabold text-text">Carta</h2>
            <span className="flex gap-2">
              <Copiar texto={o.texto} rotulo="Copiar carta" />
              <Imprimir />
              <a href={`/admin/vagas/${id}/ofertas/${o.id}/exportar`} className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy print:hidden">
                Baixar em Word
              </a>
            </span>
          </div>
          <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-text">
            {partes.map((p, i) =>
              pend.has(p) ? (
                <mark key={i} className="rounded bg-gold-bg px-1 font-bold text-gold-3 print:bg-transparent">{p}</mark>
              ) : (
                <span key={i}>{p}</span>
              ),
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 print:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-text">Mensagem curta para anexar a carta</h2>
            <Copiar texto={versaoCurta(dados)} />
          </div>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-bg p-4 font-sans text-[13px] leading-relaxed text-text">{versaoCurta(dados)}</pre>
        </section>

        <div className="flex flex-wrap items-start gap-4 print:hidden">
          {o.status === "rascunho" && (
            <Link
              href={`/admin/vagas/${id}/ofertas/editar?app=${o.application_id}&oferta=${o.id}`}
              className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy"
            >
              Editar campos
            </Link>
          )}
          <div className="grow">
            <AcoesOferta jobId={id} offerId={o.id} status={o.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
