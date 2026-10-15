import { test } from "node:test";
import assert from "node:assert/strict";
import {
  textoBase,
  verificarDevolutiva,
  temBloqueioDevolutiva,
  podeEnviarEncerramento,
  sugerirTipo,
} from "../devolutiva.ts";

const dados = {
  nome: "Ana",
  cargo: "Analista Financeiro",
  empresa: "Acme",
  recrutador: "Rodnei, SOS Vagas",
  tom: "formal",
  fortes: "boa comunicação e domínio de Excel",
  melhoria: "aprofundar conhecimentos em modelagem financeira",
  proximo_passo: "entrevista com o gestor",
  prazo: "até sexta-feira",
  documentos: ["RG", "comprovante de residência"],
  banco_talentos: false,
};
const ctx = (tipo, extra = {}) => ({
  tipo, nome: "Ana", cargo: "Analista Financeiro", bancoTalentos: false,
  proximoPasso: dados.proximo_passo, prazo: dados.prazo, fortes: dados.fortes, melhoria: dados.melhoria, ...extra,
});

test("textos-base trazem nome, vaga e assinatura, sem campo em branco", () => {
  for (const tipo of ["aprovacao", "generica", "feedback"]) {
    const t = textoBase(tipo, "whatsapp", dados);
    assert.ok(t.includes("Ana") && t.includes("Analista Financeiro") && t.includes("Rodnei"));
    assert.ok(!/\{[^}]+\}/.test(t));
    assert.equal(temBloqueioDevolutiva(verificarDevolutiva(t, ctx(tipo))), false);
  }
});

test("a genérica não promete nada sem banco de talentos marcado", () => {
  const sem = textoBase("generica", "whatsapp", dados);
  assert.ok(!/banco de talentos/i.test(sem));
  const com = textoBase("generica", "whatsapp", { ...dados, banco_talentos: true });
  assert.ok(/banco de talentos/i.test(com));
  assert.equal(temBloqueioDevolutiva(verificarDevolutiva(com, ctx("generica", { bancoTalentos: true }))), false);
  assert.equal(temBloqueioDevolutiva(verificarDevolutiva(com, ctx("generica", { bancoTalentos: false }))), true);
});

test("aprovação exige próximo passo e prazo; feedback exige fortes e melhoria", () => {
  const t = textoBase("aprovacao", "whatsapp", dados);
  const vs = verificarDevolutiva(t, ctx("aprovacao", { proximoPasso: "", prazo: "" }));
  assert.ok(vs.some((v) => v.id === "proximos_passos" && v.nivel === "bloqueio"));
  const f = textoBase("feedback", "whatsapp", dados);
  const vf = verificarDevolutiva(f, ctx("feedback", { fortes: "", melhoria: "" }));
  assert.ok(vf.some((v) => v.id === "evidencia" && v.nivel === "bloqueio"));
});

test("texto sem nome, com campo em branco ou discriminatório é bloqueado", () => {
  const vs = verificarDevolutiva("Olá, {nome}, obrigado pelo processo.", ctx("generica"));
  assert.ok(vs.some((v) => v.id === "placeholder" && v.nivel === "bloqueio"));
  assert.ok(vs.some((v) => v.id === "personalizada" && v.nivel === "bloqueio"));
  const disc = verificarDevolutiva("Ana, para Analista Financeiro buscamos alguém mais jovem para a equipe. Obrigado pelo tempo dedicado ao processo seletivo.", ctx("generica"));
  assert.ok(disc.some((v) => v.id === "discriminatorio" && v.nivel === "bloqueio"));
});

test("texto seco gera aviso", () => {
  const vs = verificarDevolutiva("Ana, para Analista Financeiro: infelizmente não foi selecionada.", ctx("generica"));
  assert.ok(vs.some((v) => v.id === "tom_seco" && v.nivel === "aviso"));
});

test("regra de encerramento: descadastro, black list, uma vez e 30 dias", () => {
  const base = { descadastrado: false, bloqueado: false, jaEnviada: false, statusCandidatura: "rejeitada", decididaEm: new Date("2026-10-01"), agora: new Date("2026-10-10") };
  assert.equal(podeEnviarEncerramento(base).ok, true);
  assert.equal(podeEnviarEncerramento({ ...base, descadastrado: true }).ok, false);
  assert.equal(podeEnviarEncerramento({ ...base, bloqueado: true }).ok, false);
  assert.equal(podeEnviarEncerramento({ ...base, jaEnviada: true }).ok, false);
  assert.equal(podeEnviarEncerramento({ ...base, agora: new Date("2026-12-01") }).ok, false);
  assert.equal(podeEnviarEncerramento({ ...base, statusCandidatura: "entrevista", agora: new Date("2026-12-01") }).ok, true);
});

test("finalista com ficha fechada sugere feedback e ligação antes", () => {
  assert.deepEqual(sugerirTipo({ fichaFechada: true, statusCandidatura: "entrevista" }), { tipo: "feedback", sugerirLigacao: true });
  assert.equal(sugerirTipo({ fichaFechada: false, statusCandidatura: "triagem" }).tipo, "generica");
  assert.equal(sugerirTipo({ fichaFechada: true, statusCandidatura: "proposta" }).tipo, "aprovacao");
});

test("roteiro de ligação traz espaço de escuta e não promete", () => {
  const r = textoBase("feedback", "ligacao", dados);
  assert.ok(/Escuta/.test(r) && /sem justificar/.test(r));
});
