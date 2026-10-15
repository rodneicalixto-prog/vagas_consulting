import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estadoValidade,
  precisaRevisao,
  entraNoContexto,
  valoresDoTexto,
  detectarConflitos,
  temasSemResposta,
  tiposSemCobertura,
  resumirBase,
} from "../base-conhecimento.ts";

const HOJE = "2026-10-15";
const nota = (o = {}) => ({
  id: "n1", tipo: "politica", titulo: "Prazo de retorno", corpo_md: "Respondemos em até 5 dias.",
  status: "aprovada", valida_ate: null, aprovada_em: "2026-10-01T00:00:00Z", dono_id: "u1", ...o,
});

test("validade: sem prazo, vigente, vence em breve e vencida", () => {
  assert.equal(estadoValidade(null, HOJE), "sem_prazo");
  assert.equal(estadoValidade("2026-12-31", HOJE), "vigente");
  assert.equal(estadoValidade("2026-10-25", HOJE), "vence_em_breve");
  assert.equal(estadoValidade("2026-10-14", HOJE), "vencida");
  assert.equal(estadoValidade("2026-10-15", HOJE), "vence_em_breve");
});

test("nota vencida ou não aprovada não entra no contexto", () => {
  assert.equal(entraNoContexto(nota(), HOJE), true);
  assert.equal(entraNoContexto(nota({ valida_ate: "2026-09-01" }), HOJE), false);
  assert.equal(entraNoContexto(nota({ status: "rascunho" }), HOJE), false);
});

test("revisão: aprovada há mais de 90 dias e sem prazo", () => {
  assert.equal(precisaRevisao(nota({ aprovada_em: "2026-06-01T00:00:00Z" }), HOJE), true);
  assert.equal(precisaRevisao(nota({ aprovada_em: "2026-06-01T00:00:00Z", valida_ate: "2027-01-01" }), HOJE), false);
  assert.equal(precisaRevisao(nota(), HOJE), false);
});

test("valores com unidade são extraídos e normalizados", () => {
  const v = valoresDoTexto("Retorno em 5 dias, VR de R$ 1.200 e bônus de 30%.");
  assert.ok(v.has("5dias") && v.has("30%") && [...v].some((x) => x.startsWith("r$1200")));
});

test("conflito: mesmo assunto com valores diferentes e título repetido", () => {
  const a = nota({ id: "a", titulo: "Prazo de retorno ao candidato", corpo_md: "Retornamos em até 5 dias." });
  const b = nota({ id: "b", titulo: "Prazo de retorno do candidato", corpo_md: "Retornamos em até 10 dias." });
  const c = nota({ id: "c", tipo: "faq", titulo: "Benefícios", corpo_md: "VR de R$ 800." });
  const d = nota({ id: "d", tipo: "faq", titulo: "benefícios", corpo_md: "Plano de saúde." });
  const out = detectarConflitos([a, b, c, d], HOJE);
  assert.ok(out.some((x) => x.a === "a" && x.b === "b" && /valores diferentes/.test(x.motivo)));
  assert.ok(out.some((x) => x.a === "c" && x.b === "d" && /Mesmo título/.test(x.motivo)));
  // Nota vencida não gera conflito.
  assert.equal(detectarConflitos([a, { ...b, valida_ate: "2026-01-01" }], HOJE).length, 0);
});

test("cobertura: temas recorrentes sem anotar contato e tipos sem nota", () => {
  const perguntas = [
    "Qual o valor do vale transporte? meu email é ana@x.com",
    "Vocês pagam vale transporte?",
    "E o plano odontológico existe?",
  ];
  const temas = temasSemResposta(perguntas);
  assert.ok(temas.some((t) => t.termo === "transporte" && t.vezes === 2));
  assert.ok(!temas.some((t) => /x\.com|ana/.test(t.termo)));
  assert.deepEqual(tiposSemCobertura([nota()], ["politica", "faq"], HOJE), ["faq"]);
});

test("resumo: crítico com conflito, atenção com vencida, confiável limpo", () => {
  assert.equal(resumirBase([nota()], HOJE).nivel, "confiavel");
  assert.equal(resumirBase([nota(), nota({ id: "v", valida_ate: "2026-01-01" })], HOJE).nivel, "atencao");
  const conflito = [
    nota({ id: "a", titulo: "Prazo de retorno ao candidato", corpo_md: "5 dias" }),
    nota({ id: "b", titulo: "Prazo de retorno do candidato", corpo_md: "10 dias" }),
  ];
  assert.equal(resumirBase(conflito, HOJE).nivel, "critico");
  assert.equal(resumirBase([], HOJE).nivel, "critico");
});
