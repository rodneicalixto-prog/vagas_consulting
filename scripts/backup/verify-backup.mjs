// Verifica um arquivo de backup .json.gz contra o banco ao vivo.
//
// Uso:  node --env-file=.env.local scripts/backup/verify-backup.mjs [arquivo.json.gz]
// (sem argumento, usa o arquivo mais recente de ./backups)
//
// Confere: o arquivo abre, tem a estrutura esperada e a contagem de linhas de
// cada tabela bate com o banco (tolerância de crescimento: banco pode ter MAIS
// linhas que o backup, nunca menos). Não imprime dados, só nomes e contagens.

import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(2);
}

let file = process.argv[2];
if (!file) {
  const todos = readdirSync("backups").filter((f) => f.endsWith(".json.gz")).sort();
  if (todos.length === 0) {
    console.error("Nenhum backup em ./backups.");
    process.exit(2);
  }
  file = join("backups", todos[todos.length - 1]);
}

const dados = JSON.parse(gunzipSync(readFileSync(file)).toString("utf-8"));
if (!dados.tabelas || typeof dados.tabelas !== "object" || !dados.gerado_em) {
  console.error("Estrutura inválida: faltam 'tabelas' ou 'gerado_em'.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" };
let falhas = 0;
console.log(`Arquivo: ${file}`);
console.log(`Gerado em: ${dados.gerado_em}`);

for (const [tabela, linhas] of Object.entries(dados.tabelas)) {
  if (!Array.isArray(linhas)) {
    console.log(`FALHA ${tabela}: backup registrou erro (${linhas?.erro ?? "formato inesperado"})`);
    falhas++;
    continue;
  }
  const res = await fetch(`${url}/rest/v1/${encodeURIComponent(tabela)}?select=*`, { headers });
  const total = Number((res.headers.get("content-range") || "").split("/")[1]);
  if (!res.ok || Number.isNaN(total)) {
    console.log(`FALHA ${tabela}: não consegui contar no banco (HTTP ${res.status})`);
    falhas++;
    continue;
  }
  const ok = total >= linhas.length;
  console.log(`${ok ? "OK   " : "FALHA"} ${tabela}: backup=${linhas.length} banco=${total}`);
  if (!ok) falhas++;
}

console.log(falhas === 0 ? "RESULTADO: backup íntegro." : `RESULTADO: ${falhas} problema(s).`);
process.exit(falhas === 0 ? 0 : 1);
