import { test } from "node:test";
import assert from "node:assert/strict";
import {
  motivoProibido,
  montarPromptRoteiro,
  roteiroDaResposta,
  verificacoesDaResposta,
  pendenciasDaFicha,
  fichaInicial,
} from "../entrevista.ts";

const entrada = { duracao: 45, competencias: ["Comunicação", "Organização", "Foco em resultado", "Trabalho em equipe"], valores: ["Respeito"] };

const item = (bloco, nome, tipo, pergunta, extra = {}) => ({
  bloco, nome, tipo, pergunta, sondagens: ["a", "b", "c", "d"], observar: "Exemplo concreto e resultado.", ...extra,
});

test("lista de proibidos pega filhos, idade, religião e saúde", () => {
  assert.ok(motivoProibido("Você pretende ter filhos?"));
  assert.ok(motivoProibido("Qual a sua idade?"));
  assert.ok(motivoProibido("Qual é a sua religião?"));
  assert.ok(motivoProibido("Tem algum problema de saúde?"));
  assert.equal(motivoProibido("Conte uma situação em que você priorizou tarefas sob pressão."), null);
});

test("prompt traz a capacidade da duração e a regra de valor por comportamento", () => {
  const { system, user } = montarPromptRoteiro({ titulo: "Analista", rotina: "", senioridade: "pleno", ...entrada });
  assert.ok(system.includes("Entre 6 e 8 itens"));
  assert.ok(system.includes("Nunca 'você valoriza"));
  assert.ok(user.includes("Comunicação"));
});

test("roteiro remove proibidas, opinião de valor e item sem 'o que observar'", () => {
  const resposta = JSON.stringify({
    itens: [
      item("competencia", "Comunicação", "star", "Conte uma situação em que você precisou explicar algo difícil."),
      item("competencia", "Organização", "situacional", "Como você organizaria 3 entregas no mesmo dia?"),
      item("competencia", "Foco em resultado", "star", "Você tem filhos pequenos? Como concilia?"),
      item("valor", "Respeito", "comportamento", "Você valoriza o respeito no trabalho?"),
      item("competencia", "Trabalho em equipe", "star", "Fale de um conflito no time.", { observar: "" }),
    ],
  });
  const r = roteiroDaResposta(resposta, entrada);
  assert.equal(r.itens.length, 2);
  assert.equal(r.removidas.length, 3);
  assert.ok(r.avisos.some((a) => /pouco para 45/.test(a)));
  assert.ok(r.avisos.some((a) => /Foco em resultado/.test(a)));
});

test("avisa quando só há um tipo de pergunta e quando passa do tempo", () => {
  const itens = Array.from({ length: 9 }, (_, i) => item("competencia", `C${i}`, "star", `Conte a situação ${i} em que você agiu.`));
  const r = roteiroDaResposta(JSON.stringify({ itens }), { duracao: 45, competencias: ["C0", "C1", "C2", "C3"], valores: [] });
  assert.ok(r.avisos.some((a) => /só um tipo/.test(a)));
  assert.ok(r.avisos.some((a) => /mais do que cabe/.test(a)));
});

test("verificações descartam pergunta proibida", () => {
  const out = verificacoesDaResposta(JSON.stringify({
    itens: [
      { nome: "Intervalo 2019", tipo: "star", pergunta: "O que você fez entre 2018 e 2019?", observar: "Aprendizado." },
      { nome: "Pessoal", tipo: "star", pergunta: "É casada?", observar: "x" },
    ],
  }));
  assert.equal(out.length, 1);
  assert.equal(out[0].bloco, "verificacao");
});

test("ficha: nota obrigatória, evidência em 1 e 4, recomendação e motivo", () => {
  const itens = fichaInicial({ itens: [{ id: "i1", bloco: "competencia", nome: "Comunicação" }, { id: "i2", bloco: "valor", nome: "Respeito" }] });
  const base = { itens, pontos_fortes: "", pontos_atencao: "", recomendacao: null, motivo: "" };
  assert.ok(pendenciasDaFicha(base).length >= 4);
  const ok = {
    ...base,
    itens: [
      { ...itens[0], nota: 4, evidencia: "Explicou o processo com exemplos claros." },
      { ...itens[1], nota: 3, evidencia: "" },
    ],
    recomendacao: "avancar",
    motivo: "Evidência clara de comunicação e alinhamento aos valores.",
  };
  assert.deepEqual(pendenciasDaFicha(ok), []);
  const semEvid = { ...ok, itens: [{ ...itens[0], nota: 1, evidencia: "" }, ok.itens[1]] };
  assert.ok(pendenciasDaFicha(semEvid).some((p) => /evidência/.test(p)));
  const pessoal = { ...ok, motivo: "Ela é casada e tem filhos, então talvez falte tempo." };
  assert.ok(pendenciasDaFicha(pessoal).some((p) => /estado civil|filhos/.test(p)));
});
