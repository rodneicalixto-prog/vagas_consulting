import { test } from "node:test";
import assert from "node:assert/strict";
import {
  termos,
  selecionarNotas,
  fonteDaSelecao,
  qualidadePorNota,
  MARCADOR_TODAS,
} from "../recuperacao.ts";

const nota = (titulo, corpo = "", tipo = "faq") => ({ tipo, titulo, corpo_md: corpo });
const base = [
  nota("Benefícios oferecidos", "Vale refeição de R$ 800, plano de saúde e vale transporte."),
  nota("Prazo de retorno", "Retornamos em até 5 dias úteis após a entrevista."),
  nota("Documentos para admissão", "RG, CPF, comprovante de residência e carteira de trabalho."),
  nota("Horário de atendimento", "Segunda a sexta, das 9h às 18h."),
  nota("Política de privacidade", "Dados tratados conforme a LGPD."),
  nota("Etapas do processo seletivo", "Triagem, entrevista, teste e proposta."),
  nota("Modelo de trabalho híbrido", "Três dias presenciais por semana."),
  nota("Regime de contratação", "CLT para vagas efetivas e PJ quando indicado."),
  nota("Vagas para estágio", "Programa de estágio com bolsa e seguro."),
  nota("Canais de contato", "WhatsApp e e-mail da equipe de recrutamento."),
];

test("termos ignoram stopwords e juntam singular e plural", () => {
  assert.deepEqual(termos("Gostaria de saber sobre os benefícios"), ["benefi"]);
  assert.deepEqual(termos("benefício"), termos("benefícios"));
});

test("base pequena vai inteira; pergunta sem termos ou sem casamento volta a enviar tudo", () => {
  assert.equal(selecionarNotas(base.slice(0, 5), "qualquer coisa").todas, true);
  assert.equal(selecionarNotas(base, "ok oi").todas, true);
  assert.equal(selecionarNotas(base, "zzzzz yyyyy").todas, true);
});

test("pergunta específica traz só as notas relevantes, ordenadas", () => {
  const r = selecionarNotas(base, "Vocês pagam vale transporte e plano de saúde?");
  assert.equal(r.todas, false);
  assert.equal(r.notas[0].titulo, "Benefícios oferecidos");
  assert.ok(r.notas.length <= 8);
  assert.ok(!r.notas.some((n) => n.titulo === "Política de privacidade"));
});

test("título pesa mais que corpo", () => {
  const r = selecionarNotas(base, "qual o prazo de retorno?");
  assert.equal(r.notas[0].titulo, "Prazo de retorno");
});

test("fonte: marcador de todas ou só os títulos enviados", () => {
  assert.deepEqual(fonteDaSelecao(["A", "B"], true), [MARCADOR_TODAS, "A", "B"]);
  assert.deepEqual(fonteDaSelecao(["A"], false), ["A"]);
});

test("qualidade por nota: ignora 'todas' e amostra pequena", () => {
  const sug = [];
  for (let i = 0; i < 6; i++) sug.push({ estado: i < 4 ? "usada" : "editada", fonte: ["Vaga: Dev", "Benefícios oferecidos"] });
  sug.push({ estado: "usada", fonte: [MARCADOR_TODAS, "Benefícios oferecidos", "Prazo de retorno"] });
  sug.push({ estado: "descartada", fonte: ["Prazo de retorno"] });
  sug.push({ estado: "pendente", fonte: ["Prazo de retorno"] });
  const q = qualidadePorNota(sug);
  const b = q.get("Benefícios oferecidos");
  assert.equal(b.respostas, 6);
  assert.equal(b.taxaSemEdicao, 67);
  assert.equal(q.get("Prazo de retorno").respostas, 1);
  assert.equal(q.get("Prazo de retorno").taxaSemEdicao, null);
  assert.equal(q.has("Vaga: Dev"), false);
});
