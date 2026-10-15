import { test } from "node:test";
import assert from "node:assert/strict";
import {
  criteriosVazios,
  normalizarCriterios,
  obrigatoriosDeTexto,
  obrigatoriosParaTexto,
  listaDeTexto,
  verificarVaga,
  temBloqueio,
  termosDiscriminatorios,
} from "../vaga-estruturada.ts";

const base = {
  titulo: "Auxiliar de Produção",
  descricao: "Opera máquinas na linha de produção.",
  requisitos: null,
  local: "Campinas",
  modelo_trabalho: "presencial",
  remuneracao_texto: "R$ 2.000,00",
};

test("obrigatórios com * viram eliminatórios e entram na lista", () => {
  const r = obrigatoriosDeTexto("* Registro ativo\nExperiência com atendimento\n\n  \n* CNH B");
  assert.deepEqual(r.obrigatorios, ["Registro ativo", "Experiência com atendimento", "CNH B"]);
  assert.deepEqual(r.eliminatorios, ["Registro ativo", "CNH B"]);
  const c = normalizarCriterios({ ...criteriosVazios(), ...r });
  assert.equal(obrigatoriosParaTexto(c).split("\n")[0], "* Registro ativo");
});

test("normaliza: sem duplicata, eliminatório só se for obrigatório", () => {
  const c = normalizarCriterios({
    obrigatorios: ["SQL", "sql", "Python"],
    eliminatorios: ["SQL", "Inexistente"],
    senioridade: "mestre",
    anos_experiencia: "3",
  });
  assert.deepEqual(c.obrigatorios, ["SQL", "Python"]);
  assert.deepEqual(c.eliminatorios, ["SQL"]);
  assert.equal(c.senioridade, "");
  assert.equal(c.anos_experiencia, 3);
  assert.deepEqual(listaDeTexto("- um\n• dois\n\n"), ["um", "dois"]);
});

test("critério discriminatório bloqueia a publicação", () => {
  assert.ok(termosDiscriminatorios("Exige boa aparência e até 30 anos").length >= 2);
  const v = verificarVaga({ ...base, descricao: "Somente mulheres, solteiras.", criterios: criteriosVazios() });
  assert.equal(temBloqueio(v), true);
  assert.equal(temBloqueio(verificarVaga({ ...base, criterios: criteriosVazios() })), false);
});

test("avisos: obrigatórios fora de 4 a 7, clichê, título criativo, transparência", () => {
  const c = normalizarCriterios({
    obrigatorios: ["a", "b"],
    rotina: "Pessoa proativa e dinâmica.",
    senioridade: "senior",
    anos_experiencia: 1,
  });
  const v = verificarVaga({
    ...base,
    titulo: "Ninja de Vendas",
    modelo_trabalho: null,
    remuneracao_texto: null,
    descricao: "O candidato ideal.",
    criterios: c,
  });
  const nivel = (id) => v.find((x) => x.id === id).nivel;
  assert.equal(nivel("obrigatorios"), "aviso");
  assert.equal(nivel("cliches"), "aviso");
  assert.equal(nivel("titulo"), "aviso");
  assert.equal(nivel("genero"), "aviso");
  assert.equal(nivel("senioridade"), "aviso");
  assert.equal(nivel("transparencia"), "aviso");
  assert.equal(temBloqueio(v), false);
});

test("vaga bem escrita passa em tudo que é verificável por código", () => {
  const c = normalizarCriterios({
    rotina: "Opera a prensa, confere a qualidade das peças e registra a produção no sistema.",
    obrigatorios: ["Ensino médio", "Experiência com prensa", "Leitura de desenho técnico", "Disponibilidade para o turno B"],
    desejaveis: ["NR-12"],
    comportamentais: ["Atenção a detalhe"],
    senioridade: "pleno",
    anos_experiencia: 3,
    diferencial: "Plano de carreira com treinamento pago pela empresa.",
  });
  const v = verificarVaga({ ...base, criterios: c });
  assert.ok(v.every((x) => x.nivel === "ok"), JSON.stringify(v.filter((x) => x.nivel !== "ok")));
});
