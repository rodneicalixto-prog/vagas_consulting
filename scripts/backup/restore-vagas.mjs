// Restaura um backup .json.gz em um projeto Supabase DESCARTÁVEL (teste).
//
// Uso:
//   $env:RESTORE_SUPABASE_URL="https://<ref-de-teste>.supabase.co"
//   $env:RESTORE_SERVICE_ROLE_KEY="<service_role do projeto de TESTE>"
//   node scripts/backup/restore-vagas.mjs [backups/arquivo.json.gz]
//
// Pré-requisito: o schema (migrations 0001…0020) já aplicado no projeto de teste.
//
// SEGURANÇA
// - Recusa rodar contra o projeto de produção (tfipbxjslpxbaybpxsql).
// - Recusa rodar se o projeto de destino já tiver linhas em `profiles`/`jobs`
//   (só restaura em projeto vazio).
// - Não lê .env.local: as chaves do destino vêm só das variáveis RESTORE_*.
// - Nunca imprime dados, só nomes de tabela e contagens.
//
// LIMITE CONHECIDO: o backup não contém auth.users. As contas de login são
// recriadas como placeholders (restore-<id>@invalid.local) apenas para
// satisfazer as chaves estrangeiras. Em um desastre real, candidatos
// precisariam recriar o acesso.

import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const PROD_REF = "tfipbxjslpxbaybpxsql";
const url = (process.env.RESTORE_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.RESTORE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Defina RESTORE_SUPABASE_URL e RESTORE_SERVICE_ROLE_KEY (projeto de TESTE).");
  process.exit(2);
}
if (url.includes(PROD_REF)) {
  console.error("RECUSADO: a URL aponta para o projeto de PRODUÇÃO. Use um projeto descartável.");
  process.exit(2);
}

let file = process.argv[2];
if (!file) {
  const todos = readdirSync("backups").filter((f) => f.endsWith(".json.gz")).sort();
  if (!todos.length) {
    console.error("Nenhum backup em ./backups.");
    process.exit(2);
  }
  file = join("backups", todos[todos.length - 1]);
}
const dados = JSON.parse(gunzipSync(readFileSync(file)).toString("utf-8"));
const SOMENTE = (process.env.RESTORE_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const tabelas = Object.fromEntries(
  Object.entries(dados.tabelas || {}).filter(([t]) => SOMENTE.length === 0 || SOMENTE.includes(t)),
);
console.log(`Backup: ${file} (gerado em ${dados.gerado_em})`);

// Chaves novas (sb_secret_…) não são JWT: vão só em `apikey`. A service_role
// legada (eyJ…) também vai em Authorization.
const H = key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };

async function contar(tabela) {
  const r = await fetch(`${url}/rest/v1/${tabela}?select=*`, {
    headers: { ...H, Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok) throw new Error(`${tabela}: HTTP ${r.status} (schema aplicado no destino?)`);
  return Number((r.headers.get("content-range") || "").split("/")[1]);
}

// 1) Destino precisa estar vazio
for (const t of SOMENTE.length ? [] : ["profiles", "jobs", "companies"]) {
  if ((await contar(t)) > 0) {
    console.error(`RECUSADO: ${t} do destino não está vazio. Use um projeto novo.`);
    process.exit(2);
  }
}

// 2) Recria contas placeholder para as FKs de auth.users
const COLUNAS_USUARIO = new Set([
  "user_id", "ator_id", "candidate_id", "remetente_id", "destinatario_id",
  "decidido_por", "validado_por", "responsavel_id", "blacklist_por",
]);
const ids = new Set();
for (const linhas of Object.values(tabelas)) {
  if (!Array.isArray(linhas)) continue;
  for (const l of linhas) {
    for (const [c, v] of Object.entries(l)) {
      if (typeof v === "string" && /^[0-9a-f-]{36}$/.test(v) && (COLUNAS_USUARIO.has(c) || (c === "id" && "nome_completo" in l))) {
        ids.add(v);
      }
    }
  }
}
let criados = 0;
for (const id of SOMENTE.length ? [] : ids) {
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      email: `restore-${id.slice(0, 8)}@invalid.local`,
      password: randomUUID() + randomUUID(),
      email_confirm: true,
    }),
  });
  if (r.ok) criados++;
}
console.log(`Contas placeholder criadas: ${criados}/${ids.size}`);

// 3) Insere em várias passadas, respeitando dependências entre tabelas
let pendentes = Object.entries(tabelas).filter(([, l]) => Array.isArray(l) && l.length > 0).map(([t]) => t);
const resultado = {};
const erros = {};
for (let passada = 1; passada <= 6 && pendentes.length; passada++) {
  const proximas = [];
  for (const t of pendentes) {
    const linhas = tabelas[t];
    let ok = true;
    for (let i = 0; i < linhas.length && ok; i += 200) {
      const r = await fetch(`${url}/rest/v1/${t}`, {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal,resolution=ignore-duplicates" },
        body: JSON.stringify(linhas.slice(i, i + 200)),
      });
      if (!r.ok) {
        ok = false;
        try {
          const e = await r.json();
          erros[t] = `HTTP ${r.status} code=${e.code ?? "?"} message=${String(e.message ?? "").slice(0, 200)}`;
        } catch {
          erros[t] = `HTTP ${r.status}`;
        }
      }
    }
    if (ok) resultado[t] = "inserida";
    else proximas.push(t);
  }
  pendentes = proximas;
}

// 4) Conferência
let falhas = pendentes.length;
for (const t of pendentes) console.log(`FALHA ${t}: não foi possível inserir — ${erros[t] ?? "sem detalhe"}`);
for (const [t, linhas] of Object.entries(tabelas)) {
  if (!Array.isArray(linhas)) continue;
  const n = await contar(t).catch(() => -1);
  const ok = n === linhas.length;
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${t}: backup=${linhas.length} restaurado=${n}`);
}
console.log(falhas === 0 ? "RESULTADO: restauração completa." : `RESULTADO: ${falhas} problema(s).`);
process.exit(falhas === 0 ? 0 : 1);
