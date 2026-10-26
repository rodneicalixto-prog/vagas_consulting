import { test } from "node:test";
import assert from "node:assert/strict";
import {
  regrasVazias,
  normalizarRegras,
  verificarRegras,
  modoEfetivo,
  sugerirModo,
  regrasDoFormulario,
} from "../regras-vaga.ts";

const completas = () => ({
  ...regrasVazias(),
  versao: 1,
  modo: "texto",
  corte_triagem: 70,
  gatilhos_escalada: ["Candidato pede salário fora da faixa", "Reclamação"],
  confirmado_em: "2026-10-26T12:00:00.000Z",
});

test("normalizar não confia no JSON: lixo vira regras vazias e limites são aplicados", () => {
  assert.deepEqual(normalizarRegras(null), regrasVazias());
  assert.deepEqual(normalizarRegras("x"), regrasVazias());
  const r = normalizarRegras({ modo: "inventado", corte_triagem: 500, peso_cultura: 99, horario_inicio: "25:99", perguntas_obrigatorias: ["a", 3, ""] });
  assert.equal(r.modo, "texto");
  assert.equal(r.corte_triagem, 100);
  assert.equal(r.peso_cultura, 5);
  assert.equal(r.horario_inicio, "");
  assert.deepEqual(r.perguntas_obrigatorias, ["a"]);
});

test("vaga sem regras mínimas NÃO é conduzida pela IA: vai para pessoa", () => {
  const e = modoEfetivo(regrasVazias());
  assert.equal(e.conduzPelaIA, false);
  assert.equal(e.modo, "humano");
  assert.ok(e.motivo);
});

test("regras completas e confirmadas: a IA conduz no modo texto", () => {
  const e = modoEfetivo(completas());
  assert.equal(e.conduzPelaIA, true);
  assert.equal(e.modo, "texto");
});

test("faltando corte ou gatilhos, a IA não conduz", () => {
  assert.equal(modoEfetivo({ ...completas(), corte_triagem: null }).conduzPelaIA, false);
  assert.equal(modoEfetivo({ ...completas(), gatilhos_escalada: [] }).conduzPelaIA, false);
  assert.equal(modoEfetivo({ ...completas(), confirmado_em: null }).conduzPelaIA, false);
  assert.equal(modoEfetivo(completas(), { temObrigatorios: false }).conduzPelaIA, false);
});

test("modo humano e voz ainda não liberada seguem para pessoa", () => {
  assert.equal(modoEfetivo({ ...completas(), modo: "humano" }).modo, "humano");
  const voz = modoEfetivo({ ...completas(), modo: "voz" });
  assert.equal(voz.conduzPelaIA, false);
  assert.ok(/voz/i.test(voz.motivo));
});

test("regra da vaga não pode relaxar guardrail: validação humana, emoção e aviso de reprovação", () => {
  const casos = [
    "Pode reprovar automaticamente quem não tiver CNH",
    "Dispensar validação humana quando a nota for baixa",
    "Analisar o estado emocional do candidato pela voz",
    "Avisar o candidato reprovado na hora",
  ];
  for (const instrucoes of casos) {
    const r = { ...completas(), instrucoes };
    assert.ok(verificarRegras(r).some((v) => v.id === "guardrail" && v.nivel === "bloqueio"), instrucoes);
    assert.equal(modoEfetivo(r).conduzPelaIA, false, instrucoes);
  }
});

test("instrução inofensiva não bloqueia", () => {
  const r = { ...completas(), instrucoes: "Seja objetivo e cite o turno de trabalho." };
  assert.ok(!verificarRegras(r).some((v) => v.nivel === "bloqueio"));
});

test("termo discriminatório nas regras ou nas perguntas bloqueia", () => {
  const r = { ...completas(), perguntas_obrigatorias: ["Você é casada e tem filhos pequenos?"] };
  const vs = verificarRegras(r);
  assert.ok(vs.some((v) => v.nivel === "bloqueio"));
  assert.equal(modoEfetivo(r).conduzPelaIA, false);
});

test("vaga sigilosa: 'pode informar' não pode citar a empresa", () => {
  const ruim = { ...completas(), pode_informar: ["Nome da empresa", "Faixa salarial"] };
  assert.ok(verificarRegras(ruim, { temObrigatorios: true, confidencial: true }).some((v) => v.id === "sigilo" && v.nivel === "bloqueio"));
  assert.equal(modoEfetivo(ruim, { temObrigatorios: true, confidencial: true }).conduzPelaIA, false);
  // Em vaga aberta, a mesma regra é permitida.
  assert.ok(!verificarRegras(ruim, { temObrigatorios: true, confidencial: false }).some((v) => v.id === "sigilo"));
  const boa = { ...completas(), pode_informar: ["Faixa salarial", "Modelo de trabalho"] };
  assert.equal(modoEfetivo(boa, { temObrigatorios: true, confidencial: true }).conduzPelaIA, true);
});

test("chefia e liderança sugerem voz; os demais, texto", () => {
  assert.equal(sugerirModo({ senioridade: "lideranca" }), "voz");
  assert.equal(sugerirModo({ senioridade: "pleno", gerenciaPessoas: true }), "voz");
  assert.equal(sugerirModo({ senioridade: "junior" }), "texto");
});

test("formulário: sobe a versão e confirma na hora", () => {
  const campos = { modo: "texto", corte_triagem: "65", gatilhos_escalada: "Reclamação\nSalário fora da faixa", peso_cultura: "3" };
  const r = regrasDoFormulario((k) => campos[k] ?? "", 2, new Date("2026-10-26T10:00:00Z"));
  assert.equal(r.versao, 3);
  assert.equal(r.corte_triagem, 65);
  assert.deepEqual(r.gatilhos_escalada, ["Reclamação", "Salário fora da faixa"]);
  assert.equal(r.confirmado_em, "2026-10-26T10:00:00.000Z");
  assert.equal(modoEfetivo(r).conduzPelaIA, true);
});
