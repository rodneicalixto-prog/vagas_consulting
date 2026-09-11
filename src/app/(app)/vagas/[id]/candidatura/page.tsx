"use client";

import { useState, use, useTransition, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BackHeader, Card, PrimaryButton } from "@/components/ui";
import { IconBriefcase, IconCheck } from "@/components/icons";
import { enviarCandidatura } from "./actions";

const perguntas = [
  { id: "experiencia_area", texto: "Você já atuou anteriormente na área correspondente a esta vaga?" },
  { id: "disponibilidade_modelo", texto: "Você tem disponibilidade para o modelo de trabalho informado?" },
];

type VagaResumo = { id: string; titulo: string; empresa: string; local: string };

export default function CandidaturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [vaga, setVaga] = useState<VagaResumo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, boolean>>({
    experiencia_area: true,
    disponibilidade_modelo: true,
  });
  const [confirmado, setConfirmado] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("jobs")
      .select("id, titulo, local, companies(nome_fantasia, razao_social)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVaga({
            id: data.id,
            titulo: data.titulo,
            empresa: data.companies?.nome_fantasia ?? data.companies?.razao_social ?? "",
            local: data.local ?? "",
          });
        }
      });
  }, [id]);

  const onSubmit = () => {
    startTransition(async () => {
      const result = await enviarCandidatura(id, respostas);
      if (result.error) {
        setErro(result.error);
      } else {
        setEnviado(true);
      }
    });
  };

  if (enviado) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
          <IconCheck size={22} />
        </span>
        <h2 className="text-lg font-extrabold text-navy">Candidatura enviada</h2>
        <p className="max-w-xs text-[13px] text-text-2">
          Você pode acompanhar o andamento em Meus processos.
        </p>
        <Link
          href="/processos"
          className="mt-2 rounded-xl bg-gold px-6 py-3 text-[13.5px] font-extrabold text-[#1c1508]"
        >
          Ver meus processos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <BackHeader title="Confirmar candidatura" backHref={`/vagas/${id}`} />

      <div className="flex flex-col gap-4 px-5 pb-6 md:px-8">
        {vaga && (
          <Card className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-navy-bg text-navy">
              <IconBriefcase size={18} />
            </div>
            <div>
              <h4 className="text-[13.5px] font-extrabold">{vaga.titulo}</h4>
              <p className="text-[11.5px] text-text-2">
                {vaga.empresa} · {vaga.local}
              </p>
            </div>
          </Card>
        )}

        <div className="text-xs font-extrabold uppercase tracking-wide text-text-2">
          Perguntas complementares
        </div>
        {perguntas.map((q) => (
          <Card key={q.id} className="flex flex-col gap-2.5">
            <div className="text-[13px] font-bold leading-snug">{q.texto}</div>
            <div className="flex gap-2.5">
              {["Sim", "Não"].map((opt) => {
                const active = respostas[q.id] === (opt === "Sim");
                return (
                  <button
                    key={opt}
                    onClick={() =>
                      setRespostas((r) => ({ ...r, [q.id]: opt === "Sim" }))
                    }
                    className={`flex-1 rounded-[10px] border py-2.5 text-center text-[13px] font-bold ${
                      active ? "border-navy bg-navy text-white" : "border-border text-text-2"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="text-xs font-extrabold uppercase tracking-wide text-text-2">
          O que será enviado à empresa
        </div>
        <Card className="flex flex-col gap-2.5">
          {["Currículo e experiências", "Nome, e-mail e telefone", "Respostas às perguntas acima"].map(
            (item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-success-bg">
                  <IconCheck size={10} className="text-success" />
                </span>
                <span className="text-[12.5px] font-semibold">{item}</span>
              </div>
            ),
          )}
        </Card>

        <button
          onClick={() => setConfirmado((c) => !c)}
          className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5 text-left"
        >
          <span
            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] ${
              confirmado ? "bg-navy" : "border border-navy"
            }`}
          >
            {confirmado && <IconCheck size={11} className="text-white" />}
          </span>
          <p className="text-[12.5px] leading-snug">
            Revisei meus dados e confirmo o envio da candidatura para esta vaga.
          </p>
        </button>

        {erro && (
          <p className="text-[12.5px] font-semibold text-danger">
            {erro}{" "}
            <Link href="/perfil/dados-pessoais" className="underline">
              Completar agora →
            </Link>
          </p>
        )}

        <PrimaryButton disabled={!confirmado || pending} onClick={onSubmit}>
          {pending ? "Enviando..." : "Enviar candidatura"}
        </PrimaryButton>
      </div>
    </div>
  );
}
