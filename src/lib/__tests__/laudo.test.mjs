import { test } from "node:test";
import assert from "node:assert/strict";
import {
  montarMatching,
  revisarResumo,
  validarRecomendacao,
  quadroComparativo,
} from "../laudo.ts";

const competencias = [
  { nome: "Atendimento ao cliente", exige: "Requisito obrigatório" },
  { nome: "Excel avançado", exige: "Requisito obrigatório" },
  { nome: "Trabalho em equipe", exige: "Competência comportamental" },
];

const triagem = {
  obrigatorios: [
    { criterio: "Excel avançado", eliminatorio: false, estado: "atende", evidencia: "Excel com tabelas dinâmicas" },
    { criterio: "Atendimento ao cliente", eliminatorio: false, estado: "nao_evidenciado", evidencia: "" },
  ],
  desejaveis: [],
  a_validar: ["Intervalo de cerca de 8 meses entre dois registros: perguntar na entrevista.", "Validar na entrevista: Trabalho em equipe"],
};
const ficha = {
  itens: [
    { item_id: "i1", nome: "Atendimento ao cliente", bloco: "competencia", nota: 4, evidencia: "Relatou caso de cliente recuperado.", anotacoes: "" },
    { item_id: "i2", nome: "Trabalho em equipe", bloco: "competencia", nota: 3, evidencia: "Exemplo de projeto em grupo.", anotacoes: "" },
    { item_id: "i3", nome: "Respeito", bloco: "valor", nota: 3, evidencia: "Mediou conflito.", anotacoes: "" },
  ],
  pontos_fortes: "Comunicação clara.",
  pontos_atencao: "",
};
const testes = [{ competencia: "Excel avançado", nota: 1, evidencia: "Errou 4 de 5 fórmulas." }];

test("quadro tem uma linha por competência, na ordem da vaga, com fonte e força", () => {
  const c = montarMatching({ competencias, triagem, ficha, testes });
  assert.deepEqual(c.linhas.map((l) => l.competencia), competencias.map((x) => x.nome));
  const aten = c.linhas[0];
  assert.equal(aten.estado, "avaliado");
  assert.equal(aten.aderencia, 4);
  assert.ok(/sem teste/.test(aten.forca));
  assert.equal(c.fit.length, 1);
});

test("divergência entre fontes é apontada sem escolher versão", () => {
  const c = montarMatching({ competencias, triagem, ficha, testes });
  const excel = c.linhas[1];
  assert.equal(excel.divergencia, true);
  assert.ok(c.divergencias.some((d) => /Excel avançado/.test(d)));
});

test("sem evidência vira não avaliado com sugestão; sem fonte não inventa", () => {
  const c = montarMatching({ competencias, triagem: null, ficha: null, testes: [] });
  assert.ok(c.linhas.every((l) => l.estado === "nao_avaliado" && l.aderencia === null && l.como_avaliar));
  assert.ok(c.limitacoes.some((m) => /parcial/.test(m)));
  assert.equal(c.fortes.length, 0);
});

test("a validar vem da triagem e das competências não avaliadas", () => {
  const c = montarMatching({ competencias, triagem, ficha: null, testes: [] });
  assert.ok(c.a_validar.some((x) => /Intervalo/.test(x)));
  assert.ok(c.a_validar.some((x) => /Atendimento ao cliente: não avaliado/.test(x)));
  assert.ok(!c.a_validar.some((x) => /^Validar na entrevista/.test(x)));
});

test("resumo com adjetivo valorativo ou personalidade é descartado", () => {
  assert.equal(revisarResumo("Candidato excelente e muito carismático.").ok, false);
  assert.equal(revisarResumo("Pessoa extrovertida, com traço de personalidade forte.").ok, false);
  assert.equal(revisarResumo("Na entrevista relatou 3 anos de atendimento e usa Excel com tabelas dinâmicas.").ok, true);
});

test("recomendação: precisa citar linha existente e avaliada; ressalva exige condições", () => {
  const c = montarMatching({ competencias, triagem, ficha, testes });
  const base = { tipo: "contratar", porque: "Evidência forte em atendimento e trabalho em equipe.", condicoes: "", linhas: ["L1"] };
  assert.deepEqual(validarRecomendacao(base, c.linhas), []);
  assert.ok(validarRecomendacao({ ...base, linhas: ["L9"] }, c.linhas).some((p) => /não existe/.test(p)));
  const semEv = montarMatching({ competencias, triagem: null, ficha: null, testes: [] });
  assert.ok(validarRecomendacao(base, semEv.linhas).some((p) => /não tem evidência/.test(p)));
  assert.ok(validarRecomendacao({ ...base, tipo: "com_ressalva" }, c.linhas).some((p) => /condições/.test(p)));
  assert.ok(validarRecomendacao({ ...base, porque: "Não contratar porque ela tem filhos pequenos e pouca idade." }, c.linhas).length > 0);
  assert.ok(validarRecomendacao({ ...base, linhas: [] }, c.linhas).some((p) => /Cite/.test(p)));
});

test("comparativo alinha as competências por candidato", () => {
  const a = montarMatching({ competencias, triagem, ficha, testes });
  const b = montarMatching({ competencias, triagem: null, ficha: null, testes: [] });
  const q = quadroComparativo(competencias.map((x) => x.nome), [{ id: "a", linhas: a.linhas }, { id: "b", linhas: b.linhas }]);
  assert.equal(q.length, 3);
  assert.equal(q[0].celulas[0].aderencia, 4);
  assert.equal(q[0].celulas[1].aderencia, null);
});
