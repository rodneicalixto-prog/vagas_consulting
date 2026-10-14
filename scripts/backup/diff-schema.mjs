// Compara o schema (tabelas e colunas do schema public) entre produção e um
// projeto de teste, via OpenAPI do PostgREST. Só lê metadados; nenhum dado.
//
// Uso:
//   $env:RESTORE_SUPABASE_URL="https://<ref-de-teste>.supabase.co"
//   $env:RESTORE_SERVICE_ROLE_KEY="<service_role do TESTE>"
//   node --env-file=.env.local scripts/backup/diff-schema.mjs
//
// Produção vem de NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local).
// Útil para provar que as migrations do repositório reconstroem a produção.

const prod = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
const test = {
  url: (process.env.RESTORE_SUPABASE_URL || "").replace(/\/$/, ""),
  key: process.env.RESTORE_SERVICE_ROLE_KEY,
};
for (const [nome, c] of [["produção", prod], ["teste", test]]) {
  if (!c.url || !c.key) {
    console.error(`Faltam URL/chave de ${nome}.`);
    process.exit(2);
  }
}
if (test.url === prod.url) {
  console.error("As duas URLs são iguais; nada a comparar.");
  process.exit(2);
}

function cabecalho(key) {
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

async function esquema({ url, key }) {
  const r = await fetch(`${url}/rest/v1/`, { headers: cabecalho(key) });
  if (!r.ok) throw new Error(`OpenAPI HTTP ${r.status} em ${url}`);
  const spec = await r.json();
  const out = {};
  for (const [tabela, def] of Object.entries(spec.definitions || {})) {
    out[tabela] = {};
    for (const [col, p] of Object.entries(def.properties || {})) {
      out[tabela][col] = p.format || p.type || "?";
    }
  }
  return out;
}

// Versões diferentes do PostgREST descrevem `smallint` como "smallint" ou
// "int32": são a mesma coluna. Tratamos o par como equivalente.
const equivalente = (x, y) =>
  x === y || (["smallint", "int32"].includes(x) && ["smallint", "int32"].includes(y));

const [a, b] = await Promise.all([esquema(prod), esquema(test)]);
let diffs = 0;
const tabelas = new Set([...Object.keys(a), ...Object.keys(b)]);
for (const t of [...tabelas].sort()) {
  if (!a[t]) { console.log(`SÓ NO TESTE : tabela ${t}`); diffs++; continue; }
  if (!b[t]) { console.log(`FALTA NO TESTE: tabela ${t}`); diffs++; continue; }
  const cols = new Set([...Object.keys(a[t]), ...Object.keys(b[t])]);
  for (const c of [...cols].sort()) {
    if (!(c in b[t])) { console.log(`FALTA NO TESTE: ${t}.${c} (${a[t][c]})`); diffs++; }
    else if (!(c in a[t])) { console.log(`SÓ NO TESTE : ${t}.${c} (${b[t][c]})`); diffs++; }
    else if (!equivalente(a[t][c], b[t][c])) { console.log(`TIPO DIFERENTE: ${t}.${c} prod=${a[t][c]} teste=${b[t][c]}`); diffs++; }
  }
}
console.log(diffs === 0 ? "RESULTADO: schemas idênticos." : `RESULTADO: ${diffs} diferença(s).`);
process.exit(diffs === 0 ? 0 : 1);
