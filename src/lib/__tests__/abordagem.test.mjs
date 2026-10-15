import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filtrarPerfil,
  chaveDoContato,
  abordagemDaResposta,
  verificarAbordagem,
  temBloqueio,
  datasFollowup,
  contatoFechado,
  montarPromptAbordagem,
} from "../abordagem.ts";

const perfil = [
  "Gerente de Operações na Logística Alfa, liderando 40 pessoas desde 2019.",
  "Reduziu o tempo de expedição em 22% com a implantação de WMS.",
  "Mãe de dois filhos, casada, mora na Rua das Flores, 100.",
  "Contato: ana@mail.com ou (11) 98888-7777.",
  "Formada em Engenharia de Produção; MBA em Gestão de Projetos.",
].join("\n");

test("perfil: remove família, endereço, e-mail e telefone; mantém anos de carreira", () => {
  const { limpo, removidos } = filtrarPerfil(perfil);
  assert.ok(limpo.includes("Logística Alfa") && limpo.includes("2019") && limpo.includes("WMS"));
  assert.ok(!/filhos|casada|Rua das Flores|ana@mail|98888/i.test(limpo));
  assert.equal(removidos, 2);
});

test("chave do contato ignora acento e caixa", () => {
  assert.equal(chaveDoContato("  José  da Silva "), chaveDoContato("jose da silva"));
});

test("prompt manda começar pela pessoa, proíbe currículo e pede 2 follow-ups", () => {
  const { system } = montarPromptAbordagem({
    nome: "Ana", perfil: "x", canal: "linkedin_nota", tom: "formal", recrutador: "Rodnei",
    vaga: { titulo: "Gerente de Logística", modelo: "híbrido", local: "SP", faixa: null, empresa: null },
    perfilTecnico: false,
  });
  assert.ok(/Comece pela pessoa/.test(system) && /Não peça currículo/.test(system) && /exatamente 2 textos/.test(system));
  assert.ok(/300 caracteres/.test(system) && /Não cite valores/.test(system));
});

const ctx = (extra = {}) => ({
  canal: "linkedin_inmail",
  perfilLimpo: filtrarPerfil(perfil).limpo,
  nome: "Ana",
  cargo: "Gerente de Logística",
  modelo: "híbrido",
  temFaixa: false,
  perfilTecnico: false,
  ...extra,
});

const boa = {
  angulo: "Experiência em WMS e liderança de equipes",
  trecho_perfil: "Reduziu o tempo de expedição em 22% com a implantação de WMS",
  assuntos: ["Sua experiência com WMS", "Uma conversa sobre logística"],
  texto:
    "Ana, vi que você reduziu o tempo de expedição em 22% com a implantação de WMS. Estou com uma vaga de Gerente de Logística, em modelo híbrido, em São Paulo. Topa uma conversa de 15 minutos?",
  followups: [
    "Ana, só subindo minha mensagem. Se tiver curiosidade, te conto em 15 minutos.",
    "Ana, vou encerrar por aqui. Sem problema se não fizer sentido; minha porta fica aberta e, se conhecer alguém, agradeço a indicação!",
  ],
};

test("abordagem boa passa sem bloqueio", () => {
  const vs = verificarAbordagem(boa, ctx());
  assert.equal(temBloqueio(vs), false);
  assert.ok(vs.find((v) => v.id === "angulo").nivel === "ok");
  assert.ok(vs.find((v) => v.id === "personalizada").nivel === "ok");
  assert.ok(vs.find((v) => v.id === "porta_aberta").nivel === "ok");
});

test("tema pessoal e nota longa bloqueiam; currículo e trecho inventado avisam", () => {
  const pessoal = { ...boa, texto: boa.texto + " Soube que você tem filhos pequenos." };
  assert.equal(temBloqueio(verificarAbordagem(pessoal, ctx())), true);
  const longa = { ...boa, texto: "Ana, " + "x".repeat(320) };
  assert.equal(temBloqueio(verificarAbordagem(longa, ctx({ canal: "linkedin_nota" }))), true);
  assert.equal(temBloqueio(verificarAbordagem(longa, ctx({ canal: "email" }))), false);
  const inv = { ...boa, trecho_perfil: "Premiada como melhor gerente do ano", texto: boa.texto + " Me envie seu currículo." };
  const vs = verificarAbordagem(inv, ctx());
  assert.equal(vs.find((v) => v.id === "angulo").nivel, "aviso");
  assert.equal(vs.find((v) => v.id === "cta").nivel, "aviso");
});

test("leitura da resposta e datas dos follow-ups", () => {
  const a = abordagemDaResposta(JSON.stringify(boa));
  assert.equal(a.followups.length, 2);
  assert.equal(abordagemDaResposta("lixo"), null);
  const d = datasFollowup(new Date("2026-10-15T12:00:00Z"));
  assert.equal(d[0].toISOString().slice(0, 10), "2026-10-18");
  assert.equal(d[1].toISOString().slice(0, 10), "2026-10-22");
});

test("contato encerrado ou 'não contatar' não reabre", () => {
  assert.equal(contatoFechado("encerrada"), true);
  assert.equal(contatoFechado("nao_contactar"), true);
  assert.equal(contatoFechado("enviada"), false);
});
