import { NextResponse } from "next/server";
import { strToU8, zipSync } from "fflate";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { empresaDaOperacao } from "@/lib/evolution";
import { montarNotaMd, ROTULO_TIPO, slugNota, tipoNotaValido, type StatusNota } from "@/lib/agente";

export const dynamic = "force-dynamic";

/**
 * Espelho para o Obsidian: as notas APROVADAS da empresa da operação, uma
 * pasta por tipo, mais o roteiro do agente. Somente leitura (a fonte da
 * verdade é a base de conhecimento do painel).
 */
export async function GET() {
  const { role } = await requireInternalUser();
  if (role !== "superadmin") return new NextResponse("Não encontrado", { status: 404 });

  const companyId = await empresaDaOperacao();
  if (!companyId) return new NextResponse("Empresa da operação não definida", { status: 409 });

  const admin = createAdminClient();
  const [{ data: empresa }, { data: agente }, { data: notas }] = await Promise.all([
    admin.from("companies").select("nome_fantasia, razao_social").eq("id", companyId).maybeSingle(),
    admin.from("ai_agents").select("nome, tom, roteiro, provedor, modelo, updated_at").eq("company_id", companyId).maybeSingle(),
    admin
      .from("ai_knowledge_notes")
      .select("tipo, titulo, corpo_md, status, versao, updated_at")
      .eq("company_id", companyId)
      .eq("status", "aprovada")
      .order("tipo")
      .order("titulo")
      .limit(1000),
  ]);

  const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || "Empresa";
  const raiz = `Agente - ${slugNota(nomeEmpresa)}`;
  const arquivos: Record<string, Uint8Array> = {};
  const usados = new Set<string>();

  for (const n of notas ?? []) {
    if (!tipoNotaValido(n.tipo)) continue;
    const pasta = ROTULO_TIPO[n.tipo];
    let nome = slugNota(n.titulo);
    let caminho = `${raiz}/${pasta}/${nome}.md`;
    for (let i = 2; usados.has(caminho); i += 1) {
      nome = `${slugNota(n.titulo)}-${i}`;
      caminho = `${raiz}/${pasta}/${nome}.md`;
    }
    usados.add(caminho);
    arquivos[caminho] = strToU8(
      montarNotaMd({
        titulo: n.titulo,
        tipo: n.tipo,
        status: n.status as StatusNota,
        versao: n.versao,
        atualizadoEm: n.updated_at.slice(0, 10),
        corpo_md: n.corpo_md,
      }),
    );
  }

  if (agente) {
    arquivos[`${raiz}/Roteiro do agente.md`] = strToU8(
      [
        "---",
        `agente: "${agente.nome.replace(/"/g, '\\"')}"`,
        `tom: ${agente.tom}`,
        `provedor: ${agente.provedor}`,
        `modelo: ${agente.modelo ?? "padrao"}`,
        `atualizado: ${agente.updated_at.slice(0, 10)}`,
        "---",
        "",
        "# Roteiro do agente",
        "",
        agente.roteiro.trim(),
        "",
      ].join("\n"),
    );
  }

  arquivos[`${raiz}/LEIA-ME.md`] = strToU8(
    [
      `# ${nomeEmpresa}: base de conhecimento do agente`,
      "",
      "Espelho **somente leitura** das notas aprovadas no painel (Plataforma > Agente de IA).",
      "Edite sempre no painel; alterações feitas aqui não voltam para a plataforma.",
      "",
      `Gerado em ${new Date().toISOString().slice(0, 10)}.`,
      "",
    ].join("\n"),
  );

  const zip = zipSync(arquivos, { level: 6 });
  const dia = new Date().toISOString().slice(0, 10);
  await admin.from("audit_log").insert({
    ator_id: (await requireInternalUser()).user.id,
    acao: "agente_base_exportada",
    objeto_tipo: "company",
    objeto_id: companyId,
    depois: { notas: Object.keys(arquivos).length },
  });

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="obsidian-${slugNota(nomeEmpresa)}-${dia}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
