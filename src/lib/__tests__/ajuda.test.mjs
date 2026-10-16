import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  arquivoDaRota,
  permitidos,
  buscar,
  montarPromptAjuda,
  avisoDeEstado,
  inicioDoDiaBR,
  limiteAtingido,
  perguntaValida,
  sugestoesDaRota,
  NAO_ENCONTRADO,
} from "../ajuda.ts";
import { gerarIndice } from "../../../scripts/gerar-indice-ajuda.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const indice = JSON.parse(readFileSync(join(raiz, "src", "lib", "ajuda", "indice.json"), "utf8"));

test("o índice commitado está em dia com o manual (rode npm run ajuda:indice)", () => {
  const novo = gerarIndice(join(raiz, "docs", "manual"));
  assert.equal(indice.versao, novo.versao);
  assert.equal(indice.pedacos.length, novo.pedacos.length);
});

test("esqueleto não entra no índice e cada pedaço tem papel e estado", () => {
  assert.ok(indice.pedacos.length > 50);
  // Candidato e Plataforma viraram rascunho no manual 0.4: agora fazem parte do índice.
  assert.ok(indice.pedacos.some((p) => p.arquivo === "05-plataforma"));
  assert.ok(indice.pedacos.some((p) => p.arquivo === "01-candidato"));
  for (const p of indice.pedacos) {
    assert.ok(p.papeis.length > 0 && ["rascunho", "validado"].includes(p.estado));
    assert.ok(p.texto.length >= 20 && p.texto.length <= 1900);
  }
});

test("rota leva ao capítulo certo", () => {
  assert.equal(arquivoDaRota("/admin/vagas/abc/triagem"), "03-ciclo-rs/03-triagem");
  assert.equal(arquivoDaRota("/admin/vagas/abc/ofertas/xyz"), "03-ciclo-rs/08-carta-oferta");
  assert.equal(arquivoDaRota("/admin/vagas/abc"), "03-ciclo-rs/01-criterios");
  assert.equal(arquivoDaRota("/admin/linhas"), "04-admin-empresa");
  assert.equal(arquivoDaRota("/admin/conversas?c=1"), "02-operador");
  assert.equal(arquivoDaRota("/admin/xyz"), null);
  assert.ok(sugestoesDaRota("/admin/vagas/abc/triagem").length >= 2);
});

test("operador não recebe conteúdo do admin da empresa; admin da empresa recebe", () => {
  const op = permitidos(indice.pedacos, "operador");
  const ae = permitidos(indice.pedacos, "admin_empresa");
  assert.ok(!op.some((p) => p.arquivo === "04-admin-empresa"));
  assert.ok(ae.some((p) => p.arquivo === "04-admin-empresa"));
  assert.ok(op.some((p) => p.arquivo === "03-ciclo-rs/03-triagem"));
});

test("busca acha o tópico certo e respeita o capítulo da tela", () => {
  const todos = permitidos(indice.pedacos, "operador");
  const r = buscar(todos, "o que é não evidenciado na triagem?", "/admin/vagas/x/triagem");
  assert.ok(r.length > 0 && r.length <= 5);
  assert.ok(r.some((x) => x.pedaco.arquivo === "03-ciclo-rs/03-triagem"));
  const carta = buscar(todos, "por que não consigo marcar a carta como enviada", "/admin/conversas");
  assert.ok(carta.some((x) => x.pedaco.arquivo === "03-ciclo-rs/08-carta-oferta"));
});

test("pergunta sem casamento não devolve nada (não adivinha)", () => {
  const todos = permitidos(indice.pedacos, "operador");
  assert.deepEqual(buscar(todos, "qual a previsão do tempo amanhã em Lisboa", "/admin"), []);
  assert.deepEqual(buscar(todos, "oi", "/admin"), []);
});

test("prompt: só trechos, regras e pergunta como dado", () => {
  const ped = indice.pedacos.slice(0, 2);
  const { system, user } = montarPromptAjuda({ papel: "operador", rota: "/admin/vagas/x/triagem", pergunta: "como triar?", pedacos: ped });
  assert.ok(system.includes("SOMENTE os TRECHOS DO MANUAL"));
  assert.ok(system.includes(NAO_ENCONTRADO));
  assert.ok(system.includes('papel "operador"'));
  assert.ok(user.includes("<pergunta>") && user.includes("como triar?") && user.includes("Capítulo:"));
});

test("aviso de estado enquanto houver rascunho", () => {
  assert.ok(avisoDeEstado([{ estado: "rascunho" }]));
  assert.equal(avisoDeEstado([{ estado: "validado" }]), null);
});

test("limites: 30 por dia, início do dia em Brasília e pergunta válida", () => {
  assert.equal(limiteAtingido(29), false);
  assert.equal(limiteAtingido(30), true);
  // 15/10 02:00 UTC ainda é 14/10 em Brasília: o dia começou em 14/10 03:00 UTC.
  assert.equal(inicioDoDiaBR(new Date("2026-10-15T02:00:00Z")), "2026-10-14T03:00:00.000Z");
  assert.equal(inicioDoDiaBR(new Date("2026-10-15T15:00:00Z")), "2026-10-15T03:00:00.000Z");
  assert.equal(perguntaValida("a").ok, false);
  assert.equal(perguntaValida("x".repeat(401)).ok, false);
  assert.equal(perguntaValida("  como  triar? ").ok && perguntaValida("  como  triar? ").texto, "como triar?");
});
