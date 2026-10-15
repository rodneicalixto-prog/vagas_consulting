import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validarEntrada,
  pedidoPsicologico,
  instrumentoDaResposta,
  bloqueiosDeLiberacao,
  folhaDoCandidato,
  montarPromptAvaliacao,
} from "../avaliacao.ts";

const base = { tipo: "tecnica", competencia: "Atendimento ao cliente", tempo_min: 40 };

test("sem competência-alvo, tipo psicológico ou tempo excessivo não gera", () => {
  assert.equal(validarEntrada({ tipo: "tecnica", competencia: "", tempo: 30 }).ok, false);
  assert.equal(validarEntrada({ tipo: "personalidade", competencia: "Liderança", tempo: 30 }).ok, false);
  assert.equal(validarEntrada({ tipo: "tecnica", competencia: "Teste de personalidade DISC", tempo: 30 }).ok, false);
  assert.equal(validarEntrada({ tipo: "case", competencia: "Análise", tempo: 240 }).ok, false);
  const ok = validarEntrada({ tipo: "case", competencia: "Análise de dados", tempo: 90 });
  assert.equal(ok.ok, true);
  assert.equal(pedidoPsicologico("disciplina no trabalho"), false);
});

test("prompt limita ao tempo e manda gabarito só para o aplicador", () => {
  const { system } = montarPromptAvaliacao({ ...base, titulo_vaga: "Atendente", rotina: "", senioridade: "", candidatos: 1 });
  assert.ok(system.includes("40 minutos"));
  assert.ok(system.includes("NÃO crie teste psicológico"));
});

const prova = {
  titulo: "Prova de atendimento",
  tempo_min: 40,
  instrucoes_candidato: "Responda todas as questões.",
  questoes: [
    { competencia: "Atendimento ao cliente", enunciado: "Um cliente reclama do prazo. O que você faz?", alternativas: ["A", "B"], gabarito: "B", criterio: "Empatia e solução" },
    { competencia: "", enunciado: "Sem competência." },
    { competencia: "Atendimento ao cliente", enunciado: "Qual a sua religião?", gabarito: "x" },
  ],
};

test("prova: remove questão sem competência e com tema sensível; libera com gabarito", () => {
  const i = instrumentoDaResposta(JSON.stringify(prova), base);
  assert.equal(i.questoes.length, 1);
  assert.equal(i.removidos.length, 2);
  assert.deepEqual(bloqueiosDeLiberacao(i), []);
});

test("folha do candidato nunca contém gabarito, critério, rubrica ou grade", () => {
  const i = instrumentoDaResposta(JSON.stringify(prova), base);
  const f = JSON.stringify(folhaDoCandidato(i));
  assert.ok(!/gabarito|criterio|rubrica|grade|Empatia e solução/i.test(f));
  assert.ok(f.includes("Um cliente reclama"));
});

test("questão sem gabarito nem critério bloqueia a liberação", () => {
  const sem = { ...prova, questoes: [{ competencia: "Atendimento", enunciado: "Pergunta aberta sem correção." }] };
  const i = instrumentoDaResposta(JSON.stringify(sem), base);
  assert.ok(bloqueiosDeLiberacao(i).some((b) => /sem gabarito/.test(b)));
});

test("case exige rubrica 1 a 4 e avisa trabalho gratuito", () => {
  const c = { titulo: "Case", tempo_min: 60, instrucoes_candidato: "Resolva um problema da empresa real e entregue em produção.", rubrica: [{ nivel: 1, descricao: "a" }, { nivel: 2, descricao: "b" }] };
  const i = instrumentoDaResposta(JSON.stringify(c), { tipo: "case", competencia: "Análise", tempo_min: 60 });
  assert.ok(i.avisos.some((a) => /trabalho gratuito/.test(a)));
  assert.ok(bloqueiosDeLiberacao(i).some((b) => /rubrica/.test(b)));
});

test("dinâmica exige grade com os 4 níveis e barra formato que expõe", () => {
  const d = {
    titulo: "Dinâmica",
    tempo_min: 40,
    instrucoes_candidato: "Em grupo, montem um plano. Cada um deve confessar seus defeitos ao grupo.",
    grade: [{ comportamento: "Colaboração", niveis: ["n1", "n2", "n3"] }],
  };
  const i = instrumentoDaResposta(JSON.stringify(d), { tipo: "dinamica", competencia: "Colaboração", tempo_min: 40 });
  assert.ok(i.avisos.some((a) => /confissão/.test(a)));
  const b = bloqueiosDeLiberacao(i);
  assert.ok(b.some((x) => /níveis 1 a 4/.test(x)));
  assert.ok(b.some((x) => /expõe|constrange|pressiona/.test(x)));
});
