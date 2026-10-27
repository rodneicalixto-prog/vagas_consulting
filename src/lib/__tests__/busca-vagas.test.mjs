import { test } from "node:test";
import assert from "node:assert/strict";
import { intervaloDaPagina, lerBusca, limparTermo, queryDaBusca, temFiltro, totalDePaginas } from "../busca-vagas.ts";

test("termo perde curingas e símbolos do filtro", () => {
  assert.equal(limparTermo("  a%b_c,(d)* \"e\"  "), "a b c d e");
  assert.equal(limparTermo("x".repeat(100)).length, 60);
});

test("lerBusca valida modalidade e página", () => {
  const b = lerBusca({ q: "analista", modalidade: "pj", cidade: "Olímpia", pagina: "3" });
  assert.deepEqual(b, { q: "analista", modalidade: "pj", cidade: "Olímpia", pagina: 3 });
  const ruim = lerBusca({ modalidade: "xx", pagina: "-2" });
  assert.equal(ruim.modalidade, null);
  assert.equal(ruim.pagina, 1);
  assert.equal(lerBusca({ pagina: "abc" }).pagina, 1);
  assert.equal(lerBusca({ q: ["a", "b"] }).q, "a");
  assert.equal(temFiltro(lerBusca({})), false);
  assert.equal(temFiltro(lerBusca({ cidade: "x" })), true);
});

test("paginação", () => {
  assert.deepEqual(intervaloDaPagina(1), { from: 0, to: 19 });
  assert.deepEqual(intervaloDaPagina(3), { from: 40, to: 59 });
  assert.equal(totalDePaginas(0), 1);
  assert.equal(totalDePaginas(20), 1);
  assert.equal(totalDePaginas(21), 2);
});

test("query string omite o vazio e a página 1", () => {
  const b = lerBusca({ q: "a b", modalidade: "efetiva", pagina: "2" });
  assert.equal(queryDaBusca(b), "?q=a+b&modalidade=efetiva&pagina=2");
  assert.equal(queryDaBusca(b, 1), "?q=a+b&modalidade=efetiva");
  assert.equal(queryDaBusca(lerBusca({})), "");
});
