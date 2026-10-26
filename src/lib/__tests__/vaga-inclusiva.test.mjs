import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verificarVaga,
  normalizarCriterios,
  criteriosVazios,
  temBloqueio,
  perfilDoModo,
  modoValido,
  instrucoesDoPerfil,
  fraseDoPerfil,
  montarPromptCriterios,
} from "../vaga-estruturada.ts";

const vaga = (perfil, extra = {}, crit = {}) => ({
  titulo: "Assistente administrativo",
  descricao: "Apoio às rotinas do escritório.",
  requisitos: "",
  local: "São Paulo",
  modelo_trabalho: "híbrido",
  remuneracao_texto: "R$ 2.500",
  criterios: normalizarCriterios({ ...criteriosVazios(), perfil, rotina: "Organizar arquivos e atender chamados.", obrigatorios: ["Informática básica", "Boa comunicação", "Organização", "Atenção a detalhes"], diferencial: "Ambiente acolhedor", ...crit }),
  ...extra,
});
const ids = (vs) => vs.map((v) => `${v.id}:${v.nivel}`);

test("perfil: normaliza, rejeita valor inválido e vaga comum não ganha regra extra", () => {
  assert.equal(normalizarCriterios({ perfil: "pcd" }).perfil, "pcd");
  assert.equal(normalizarCriterios({ perfil: "inventado" }).perfil, "");
  assert.equal(criteriosVazios().perfil, "");
  const comum = verificarVaga(vaga(""));
  assert.ok(!comum.some((v) => v.id.startsWith("pcd_") || v.id.startsWith("estagio_") || v.id.startsWith("idade_")));
});

test("modos novos: válidos e gravam o perfil na vaga; os antigos não mudam o perfil", () => {
  for (const m of ["pcd", "estagio", "melhor_idade"]) {
    assert.equal(modoValido(m), true);
    assert.equal(perfilDoModo(m), m);
  }
  assert.equal(perfilDoModo("criar"), null);
  assert.equal(perfilDoModo("lideranca"), null);
});

test("PcD: pedir laudo ou CID no anúncio BLOQUEIA", () => {
  const v = verificarVaga(vaga("pcd", { descricao: "Enviar laudo médico com CID-10 junto ao currículo." }));
  assert.ok(ids(v).includes("pcd_laudo:bloqueio"));
  assert.equal(temBloqueio(v), true);
});

test("PcD: termo ultrapassado e exigência de saúde avisam; acessibilidade informada fica OK", () => {
  const v = verificarVaga(vaga("pcd", { descricao: "Vaga para portador de deficiência, com boa saúde. Temos acessibilidade e adaptações." }));
  assert.ok(ids(v).includes("pcd_termo:aviso"));
  assert.ok(ids(v).includes("pcd_saude:aviso"));
  assert.ok(ids(v).includes("pcd_acessibilidade:ok"));
  assert.equal(temBloqueio(v), false);
});

test("PcD: 'pessoa com deficiência' não dispara o aviso de termo", () => {
  const v = verificarVaga(vaga("pcd", { descricao: "Vaga afirmativa para pessoa com deficiência. Oferecemos tecnologia assistiva." }));
  assert.ok(!ids(v).includes("pcd_termo:aviso"));
});

test("PcD sem menção a acessibilidade: avisa", () => {
  assert.ok(ids(verificarVaga(vaga("pcd"))).includes("pcd_acessibilidade:aviso"));
});

test("estágio: exigir experiência avisa; carga acima de 6 h por dia BLOQUEIA", () => {
  const exp = verificarVaga(vaga("estagio", {}, { anos_experiencia: 2, senioridade: "estagio" }));
  assert.ok(ids(exp).includes("estagio_experiencia:aviso"));
  const longa = verificarVaga(vaga("estagio", { descricao: "Estágio de 8 horas diárias para estudante de Administração. Bolsa de R$ 1.200." }, { senioridade: "estagio" }));
  assert.ok(ids(longa).includes("estagio_carga:bloqueio"));
  assert.equal(temBloqueio(longa), true);
});

test("estágio correto: curso e bolsa informados, 6 h por dia, sem bloqueio nem aviso de dado faltando", () => {
  const v = verificarVaga(vaga("estagio", { descricao: "Estudante cursando Administração, 6 horas diárias. Bolsa-auxílio de R$ 1.200." }, { senioridade: "estagio", anos_experiencia: 0 }));
  assert.ok(ids(v).includes("estagio_curso:ok"));
  assert.ok(ids(v).includes("estagio_bolsa:ok"));
  assert.equal(temBloqueio(v), false);
  assert.ok(!ids(v).includes("estagio_nivel:aviso"));
});

test("estágio com senioridade errada avisa", () => {
  assert.ok(ids(verificarVaga(vaga("estagio", {}, { senioridade: "pleno" }))).includes("estagio_nivel:aviso"));
});

test("60+: estereótipo avisa; idade máxima BLOQUEIA (regra geral); idade como eliminatório BLOQUEIA", () => {
  const est = verificarVaga(vaga("melhor_idade", { descricao: "Buscamos alguém com energia e perfil dinâmico." }));
  assert.ok(ids(est).includes("idade_estereotipo:aviso"));
  const max = verificarVaga(vaga("melhor_idade", { descricao: "Idade máxima 65 anos." }));
  assert.equal(temBloqueio(max), true);
  const elim = verificarVaga(vaga("melhor_idade", {}, { obrigatorios: ["Ter mais de 60 anos", "Informática", "Organização", "Comunicação"], eliminatorios: ["Ter mais de 60 anos"] }));
  assert.ok(ids(elim).includes("idade_eliminatorio:bloqueio"));
});

test("60+: 'somente acima de 60 anos' avisa para revisão jurídica; texto de valorização passa limpo", () => {
  assert.ok(ids(verificarVaga(vaga("melhor_idade", { descricao: "Vaga somente para acima de 60 anos." }))).includes("idade_exclusiva:aviso"));
  const ok = verificarVaga(vaga("melhor_idade", { descricao: "Valorizamos a experiência e a mentoria de profissionais com 60 anos ou mais." }));
  assert.ok(!ids(ok).includes("idade_estereotipo:aviso"));
  assert.equal(temBloqueio(ok), false);
});

test("o prompt de cada perfil traz a instrução certa", () => {
  const e = (modo) => montarPromptCriterios({ modo, texto: "x".repeat(30), tamanhoTime: "", vaga: { titulo: "V", local: null, modalidade: null, remuneracao_texto: null } }).system;
  assert.ok(/laudo/i.test(e("pcd")) && /pessoa com deficiência/i.test(e("pcd")));
  assert.ok(/11\.788/.test(e("estagio")) && /anos_experiencia 0/.test(e("estagio")));
  assert.ok(/60 anos ou mais/.test(e("melhor_idade")) && /idade máxima/i.test(e("melhor_idade")));
  assert.equal(instrucoesDoPerfil("").length, 0);
});

test("frase fixa de rodapé por perfil: só afirmações sustentáveis", () => {
  assert.ok(/afirmativa para pessoas com deficiência/.test(fraseDoPerfil("pcd")));
  assert.ok(/Lei nº 11\.788\/2008/.test(fraseDoPerfil("estagio")));
  assert.ok(/não há limite máximo de idade/i.test(fraseDoPerfil("melhor_idade")));
  assert.equal(fraseDoPerfil(""), "");
});
