import { test } from "node:test";
import assert from "node:assert/strict";
import {
  motivoDaTriagem,
  calcularPrazo,
  situacaoPrazo,
  horasRestantes,
  decidir,
  continuacaoDaDecisao,
  ordenarFila,
  PRAZO_HORAS,
  MENSAGEM_NEUTRA,
} from "../validacao-reprovacao.ts";

const resultado = (extra = {}) => ({
  obrigatorios: [
    { criterio: "Registro profissional ativo", eliminatorio: true, estado: "nao_atende", evidencia: "Currículo informa registro vencido em 2022." },
    { criterio: "Experiência com atendimento", eliminatorio: false, estado: "atende", evidencia: "3 anos em loja." },
  ],
  desejaveis: [],
  a_validar: [],
  eliminado: true,
  motivo_eliminacao: "Não atende o requisito eliminatório: Registro profissional ativo",
  pontuacao: 40,
  resumo: "",
  anos_registrados: 3,
  ...extra,
});

test("prazo é de 72 horas", () => {
  const de = new Date("2026-10-26T12:00:00Z");
  assert.equal(PRAZO_HORAS, 72);
  assert.equal(calcularPrazo(de).toISOString(), "2026-10-29T12:00:00.000Z");
});

test("situação do prazo: no prazo, vence em breve, vencido", () => {
  const agora = new Date("2026-10-26T12:00:00Z");
  assert.equal(situacaoPrazo("2026-10-29T12:00:00Z", agora), "no_prazo");
  assert.equal(situacaoPrazo("2026-10-26T20:00:00Z", agora), "vence_em_breve");
  assert.equal(situacaoPrazo("2026-10-26T11:00:00Z", agora), "vencido");
  assert.equal(horasRestantes("2026-10-27T12:00:00Z", agora), 24);
});

test("triagem sem eliminação não gera caso", () => {
  assert.equal(motivoDaTriagem(resultado({ eliminado: false })), null);
});

test("motivo da triagem traz critério, evidência, confiança e o que mudaria", () => {
  const m = motivoDaTriagem(resultado(), "abc");
  assert.equal(m.criterio, "Registro profissional ativo");
  assert.equal(m.eliminatorio, true);
  assert.ok(m.evidencia.includes("vencido"));
  assert.equal(m.confianca, "media");
  assert.ok(m.o_que_mudaria.includes("Registro profissional ativo"));
  assert.equal(m.justificativa_incompleta, false);
  assert.equal(m.criterios_hash, "abc");
});

test("sem evidência o caso NÃO some: entra marcado como incompleto e com baixa confiança", () => {
  const r = resultado();
  r.obrigatorios[0].evidencia = "";
  const m = motivoDaTriagem(r);
  assert.ok(m);
  assert.equal(m.justificativa_incompleta, true);
  assert.equal(m.confianca, "baixa");
});

test("dois eliminatórios falhos sobem a confiança para alta", () => {
  const r = resultado();
  r.obrigatorios.push({ criterio: "CNH categoria D", eliminatorio: true, estado: "nao_atende", evidencia: "Possui categoria B." });
  assert.equal(motivoDaTriagem(r).confianca, "alta");
});

test("decisões: só caso ativo aceita decisão", () => {
  assert.deepEqual(decidir("aguardando", "confirmar"), { ok: true, novoStatus: "confirmada" });
  assert.deepEqual(decidir("aguardando", "reverter"), { ok: true, novoStatus: "revertida" });
  assert.deepEqual(decidir("aguardando", "pedir_dados"), { ok: true, novoStatus: "aguardando_dados" });
  assert.deepEqual(decidir("aguardando_dados", "confirmar"), { ok: true, novoStatus: "confirmada" });
  assert.equal(decidir("confirmada", "reverter").ok, false);
  assert.equal(decidir("revertida", "confirmar").ok, false);
  assert.equal(decidir("aguardando_dados", "pedir_dados").ok, false);
});

test("a decisão devolve a missão à IA: o que ela faz depois", () => {
  const c = continuacaoDaDecisao("confirmar");
  assert.equal(c.statusCandidatura, "rejeitada");
  assert.equal(c.prepararDevolutiva, true);
  const r = continuacaoDaDecisao("reverter");
  assert.equal(r.statusCandidatura, null);
  assert.equal(r.retomarProcesso, true);
  assert.equal(r.prepararDevolutiva, false);
  assert.equal(continuacaoDaDecisao("pedir_dados").perguntarAoCandidato, true);
});

test("mensagem neutra nunca insinua aprovação nem reprovação", () => {
  assert.ok(!/(reprov|aprov|infelizmente|parab[eé]ns|n[aã]o seguiu|selecionad)/i.test(MENSAGEM_NEUTRA));
});

test("fila: vencidos primeiro, depois completos antes de incompletos, depois prazo", () => {
  const agora = new Date("2026-10-26T12:00:00Z");
  const l = (id, prazo, incompleta = false) => ({
    id,
    status: "aguardando",
    prazo_em: prazo,
    motivo: { eliminatorio: true, justificativa_incompleta: incompleta, confianca: "media" },
  });
  const ordem = ordenarFila(
    [l("tarde", "2026-10-29T12:00:00Z"), l("incompleto", "2026-10-28T12:00:00Z", true), l("vencido", "2026-10-25T12:00:00Z"), l("cedo", "2026-10-28T12:00:00Z")],
    agora,
  ).map((x) => x.id);
  assert.deepEqual(ordem, ["vencido", "cedo", "tarde", "incompleto"]);
});
