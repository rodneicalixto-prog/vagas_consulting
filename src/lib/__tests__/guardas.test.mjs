import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Testes-guarda: leem o código-fonte e impedem a volta de falhas já encontradas em revisão.
const SRC = join(import.meta.dirname, "..", "..");

function arquivos(dir, nome) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...arquivos(p, nome));
    else if (nome.test(e)) out.push(p);
  }
  return out;
}
const rel = (p) => relative(SRC, p).replaceAll("\\", "/");

test("toda página de /admin/vagas/[id] confere o escopo da vaga dentro dela (layout não é fronteira)", () => {
  const raiz = join(SRC, "app", "admin", "(app)", "vagas", "[id]");
  const paginas = arquivos(raiz, /^page\.tsx$/);
  assert.ok(paginas.length >= 15, "esperava encontrar as páginas da vaga");
  const sem = paginas.filter((p) => !/exigirVaga\(/.test(readFileSync(p, "utf-8"))).map(rel);
  assert.deepEqual(sem, [], "páginas sem exigirVaga: " + sem.join(", "));
});

test("toda rota /api/cron autentica com cronAutorizado (fecha sem CRON_SECRET)", () => {
  const raiz = join(SRC, "app", "api", "cron");
  const rotas = arquivos(raiz, /^route\.ts$/);
  assert.ok(rotas.length >= 3);
  const sem = rotas.filter((p) => !/cronAutorizado\(/.test(readFileSync(p, "utf-8"))).map(rel);
  assert.deepEqual(sem, [], "rotas de cron sem cronAutorizado: " + sem.join(", "));
  // Nenhuma devolve o objeto de erro do banco ao chamador.
  const vaza = rotas.filter((p) => /details:\s*error/.test(readFileSync(p, "utf-8"))).map(rel);
  assert.deepEqual(vaza, []);
});

test("todo cron declarado no vercel.json existe como rota", () => {
  const conf = JSON.parse(readFileSync(join(SRC, "..", "vercel.json"), "utf-8"));
  for (const c of conf.crons) {
    const p = join(SRC, "app", ...c.path.split("/").filter(Boolean), "route.ts");
    assert.ok(statSync(p).isFile(), "rota ausente para " + c.path);
  }
});
