// Backup do banco do Vagas Consulting para o Google Drive.
//
// Uso:  node --env-file=.env.local scripts/backup/backup-vagas.mjs
//
// - Lê todas as tabelas/views expostas pelo PostgREST (public) com a service role.
// - Grava um único arquivo .json.gz em ./backups (ignorado pelo Git).
// - Envia para o Drive com `rclone` (remote "gdrive", pasta "Backups Vagas Consulting").
// - NUNCA imprime dados: só nomes de tabela e contagens.
//
// Variáveis (em .env.local, nunca versionado):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Opcionais: BACKUP_RCLONE_REMOTE (padrão "gdrive:Backups Vagas Consulting"),
//            BACKUP_KEEP_LOCAL (padrão 8), BACKUP_KEEP_DRIVE_DAYS (padrão 90)

import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(2);
}

const remote = process.env.BACKUP_RCLONE_REMOTE || "gdrive:Backups Vagas Consulting";
const keepLocal = Number(process.env.BACKUP_KEEP_LOCAL || 8);
const keepDriveDays = Number(process.env.BACKUP_KEEP_DRIVE_DAYS || 90);
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function listTables() {
  const res = await fetch(`${url}/rest/v1/`, { headers });
  if (!res.ok) throw new Error(`OpenAPI HTTP ${res.status}`);
  const spec = await res.json();
  return Object.keys(spec.definitions || {}).sort();
}

async function dumpTable(name) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${url}/rest/v1/${encodeURIComponent(name)}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + page - 1}`, "Range-Unit": "items" },
    });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < page) break;
  }
  return rows;
}

const started = new Date();
const stamp = started.toISOString().replace(/[:T]/g, "-").slice(0, 16);
const out = { projeto: new URL(url).hostname.split(".")[0], gerado_em: started.toISOString(), tabelas: {} };

for (const t of await listTables()) {
  try {
    out.tabelas[t] = await dumpTable(t);
    console.log(`${t}: ${out.tabelas[t].length} linhas`);
  } catch (e) {
    out.tabelas[t] = { erro: String(e.message || e) };
    console.error(`FALHA ${t}: ${e.message || e}`);
    process.exitCode = 1;
  }
}

mkdirSync("backups", { recursive: true });
const file = join("backups", `vagas-consulting_${stamp}.json.gz`);
writeFileSync(file, gzipSync(JSON.stringify(out)));
console.log(`Arquivo: ${file}`);

// Retenção local
const locais = readdirSync("backups").filter((f) => f.endsWith(".json.gz")).sort();
for (const velho of locais.slice(0, Math.max(0, locais.length - keepLocal))) {
  rmSync(join("backups", velho));
}

// Envio ao Drive
const rc = spawnSync("rclone", ["copy", file, remote], { stdio: "inherit" });
if (rc.error || rc.status !== 0) {
  console.error("rclone indisponível ou falhou: o backup ficou só local em ./backups.");
  process.exitCode = 1;
} else {
  spawnSync("rclone", ["delete", remote, "--min-age", `${keepDriveDays}d`], { stdio: "inherit" });
  console.log(`Enviado para ${remote}`);
}
