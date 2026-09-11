import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  IconEdit,
  IconUser,
  IconResume,
  IconPreferences,
  IconDoc,
} from "@/components/icons";
import { ConsentToggle } from "./consent-toggle";
import { signOut } from "./actions";

const menu = [
  { label: "Dados pessoais", icon: IconUser, href: "/perfil/dados-pessoais" },
  { label: "Currículo e experiências", icon: IconResume, href: "/experiencias" },
  { label: "Preferências de vaga", icon: IconPreferences, href: null },
  { label: "Documentos", icon: IconDoc, href: null },
];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function ultimoEstado(
  consents: { finalidade: string; canal: string | null; estado: string }[],
  finalidade: string,
  canal: string | null,
) {
  const row = consents.find((c) => c.finalidade === finalidade && c.canal === canal);
  return row?.estado === "concedido";
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: consents }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase
      .from("consents")
      .select("finalidade, canal, estado")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const nome = profile?.nome_completo ?? user!.email ?? "Candidato";
  const consentsList = consents ?? [];

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6 md:px-8 md:pt-8">
      <div className="flex items-center gap-3.5">
        <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-navy text-[19px] font-extrabold text-white">
          {iniciais(nome)}
        </div>
        <div>
          <h2 className="text-[17px] font-extrabold">{nome}</h2>
          <p className="text-xs font-semibold text-text-2">
            {profile?.titulo_profissional ?? user!.email}
          </p>
        </div>
        <button className="ml-auto flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
          <IconEdit />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {menu.map(({ label, icon: Icon, href }, i) => {
          const className = `flex w-full items-center gap-3 px-3.5 py-3.5 text-left ${
            i !== menu.length - 1 ? "border-b border-border" : ""
          }`;
          const content = (
            <>
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-navy-bg text-navy">
                <Icon size={16} />
              </span>
              <span className="text-[13px] font-bold">{label}</span>
            </>
          );
          return href ? (
            <Link key={label} href={href} className={className}>
              {content}
            </Link>
          ) : (
            <button key={label} className={className}>
              {content}
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-text-2">
          Privacidade e comunicações
        </div>
        <div className="rounded-2xl border border-border bg-surface px-3.5">
          <ConsentToggle
            finalidade="alertas_vagas"
            canal="whatsapp"
            label="Alertas de vagas — WhatsApp"
            initialOn={ultimoEstado(consentsList, "alertas_vagas", "whatsapp")}
          />
          <div className="border-t border-border">
            <ConsentToggle
              finalidade="alertas_vagas"
              canal="email"
              label="Alertas de vagas — E-mail"
              initialOn={ultimoEstado(consentsList, "alertas_vagas", "email")}
            />
          </div>
          <div className="border-t border-border">
            <ConsentToggle
              finalidade="alertas_vagas"
              canal="sms"
              label="Alertas de vagas — SMS"
              initialOn={ultimoEstado(consentsList, "alertas_vagas", "sms")}
            />
          </div>
          <div className="border-t border-border">
            <ConsentToggle
              finalidade="marketing"
              canal={null}
              label="Marketing e novidades"
              caption="Desmarcado por padrão"
              initialOn={ultimoEstado(consentsList, "marketing", null)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[12.5px] font-bold">
          Ver aviso de privacidade <span>›</span>
        </button>
        <button className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[12.5px] font-bold">
          Exportar meus dados <span>›</span>
        </button>
        <button className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[12.5px] font-bold text-danger">
          Solicitar exclusão da conta <span>›</span>
        </button>
      </div>

      <form action={signOut}>
        <button className="w-full pb-2 pt-1 text-center text-[12.5px] font-extrabold text-text-3">
          Sair da conta
        </button>
      </form>
    </div>
  );
}
