import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarEmail,
  hashContato,
  tokenRastreio,
  TOKEN_RE,
  retencaoAte,
  precisaAnonimizar,
  lerCsv,
  lerPlanilha,
  prepararProspect,
  fitDaTriagem,
  mensagemWhatsApp,
  mensagemEmail,
  verificarMensagem,
  temBloqueio,
  restanteDoDia,
  dentroDaJanela,
  inicioDoDiaSaoPaulo,
  origemDaCandidatura,
  fonteValida,
  LIMITE_IMPORTACAO,
} from "../hunter.ts";

const LINK = "https://sosvagas.sosmkt.com.br/h/abc123abc123abc123abc123";
const dados = (extra = {}) => ({ nome: "ana souza", fonte: "vagascom", tituloVaga: "Analista de Logística", empresa: "Atlas Logística", link: LINK, ...extra });

test("e-mail e hash: normaliza, recusa inválido, hash estável e sem o valor", () => {
  assert.equal(normalizarEmail("  Ana@Mail.COM "), "ana@mail.com");
  assert.equal(normalizarEmail("sem-arroba"), null);
  assert.equal(hashContato("5511999998888"), hashContato("5511999998888"));
  assert.notEqual(hashContato("5511999998888"), hashContato("5511999998887"));
  assert.ok(!hashContato("ana@mail.com").includes("ana"));
});

test("token de rastreio: único, seguro para URL e aceito pela validação", () => {
  const a = tokenRastreio();
  assert.match(a, TOKEN_RE);
  assert.notEqual(a, tokenRastreio());
  assert.equal(TOKEN_RE.test("../etc/passwd"), false);
});

test("planilha: separador ; , e tab, aspas, acentos no cabeçalho e colunas desconhecidas", () => {
  const ponto = "Nome;Celular;E-mail;Cidade;Resumo;Extra\nAna;(11) 99999-8888;ana@mail.com;SP;\"10 anos em logística;\nlíder de equipe\";x";
  const r = lerPlanilha(ponto);
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0].nome, "Ana");
  assert.equal(r.linhas[0].telefone, "(11) 99999-8888");
  assert.ok(r.linhas[0].perfil.includes("líder de equipe"));
  assert.equal(lerPlanilha("nome,telefone\nBia,11988887777").linhas.length, 1);
  assert.equal(lerPlanilha("nome\ttelefone\nCaio\t11977776666").linhas[0].nome, "Caio");
});

test("planilha: sem coluna de contato é recusada; linha sem contato é ignorada", () => {
  assert.equal(lerPlanilha("nome,cidade\nAna,SP").semCabecalho, true);
  const r = lerPlanilha("nome,telefone,email\nAna,,\nBia,11988887777,");
  assert.equal(r.linhas.length, 1);
  assert.equal(r.ignoradas, 1);
});

test("planilha: respeita o limite de importação", () => {
  const corpo = Array.from({ length: LIMITE_IMPORTACAO + 20 }, (_, i) => `P${i},119${String(10000000 + i).slice(0, 8)}`).join("\n");
  const r = lerPlanilha(`nome,telefone\n${corpo}`);
  assert.equal(r.linhas.length, LIMITE_IMPORTACAO);
  assert.equal(r.truncada, true);
});

test("preparar prospect: normaliza contato e tira família, endereço, telefone e e-mail do perfil", () => {
  const p = prepararProspect({
    nome: "Ana",
    telefone: "(11) 99999-8888",
    email: "ANA@mail.com",
    cidade: "SP",
    cargo: "Analista de Logística",
    perfil: "Reduziu o tempo de expedição em 22% com WMS. Mãe de dois filhos, casada. Contato: ana@mail.com ou (11) 98888-7777.",
  });
  assert.equal(p.telefone, "5511999998888");
  assert.equal(p.email, "ana@mail.com");
  assert.ok(p.perfil.includes("WMS") && p.perfil.includes("Analista de Logística"));
  assert.ok(!/filhos|casada|ana@mail|98888/i.test(p.perfil));
  assert.ok(p.removidosDoPerfil >= 2);
  assert.equal(p.chave_tel, hashContato("5511999998888"));
  assert.equal(p.chave_email, hashContato("ana@mail.com"));
});

test("preparar prospect: sem contato válido devolve null", () => {
  assert.equal(prepararProspect({ nome: "X", telefone: "123", email: "x", cidade: "", cargo: "", perfil: "" }), null);
});

test("fit: eliminatório não atendido é baixo; senão pela pontuação", () => {
  const r = (extra) => ({ obrigatorios: [], desejaveis: [], a_validar: [], eliminado: false, motivo_eliminacao: "", pontuacao: 80, resumo: "", anos_registrados: null, ...extra });
  assert.equal(fitDaTriagem(r({ eliminado: true, pontuacao: 90 })), "baixo");
  assert.equal(fitDaTriagem(r({ pontuacao: 85 })), "alto");
  assert.equal(fitDaTriagem(r({ pontuacao: 60 })), "medio");
  assert.equal(fitDaTriagem(r({ pontuacao: 30 })), "baixo");
});

test("mensagem de WhatsApp: identifica, diz a origem, traz o link e a saída", () => {
  const m = mensagemWhatsApp(dados());
  assert.ok(m.startsWith("Olá, Ana!"));
  assert.ok(m.includes("SOS Vagas"));
  assert.ok(m.includes("seu perfil público no Vagas.com"));
  assert.ok(m.includes(LINK));
  assert.ok(/responda SAIR\.$/.test(m));
  assert.ok(m.includes("em Atlas Logística"));
});

test("vaga sigilosa: a mensagem não cita a empresa", () => {
  const m = mensagemWhatsApp(dados({ empresa: null }));
  assert.ok(!m.includes("Atlas"));
  const ctx = { canal: "whatsapp", vagaSigilosa: true, nomeEmpresa: "Atlas Logística", link: LINK };
  assert.equal(temBloqueio(verificarMensagem(m, ctx)), false);
  // Se alguém editar e colocar o nome, bloqueia.
  assert.equal(temBloqueio(verificarMensagem(`${m}\nEmpresa: Atlas Logística`, ctx)), true);
});

test("verificação bloqueia mensagem sem link, sem SAIR ou sem identificação", () => {
  const ctx = { canal: "whatsapp", vagaSigilosa: false, nomeEmpresa: null, link: LINK };
  const ok = mensagemWhatsApp(dados());
  assert.equal(temBloqueio(verificarMensagem(ok, ctx)), false);
  assert.equal(temBloqueio(verificarMensagem(ok.replace(LINK, "https://outro.com"), ctx)), true);
  assert.equal(temBloqueio(verificarMensagem(ok.replace("responda SAIR", "responda aqui"), ctx)), true);
  assert.equal(temBloqueio(verificarMensagem(ok.replace("SOS Vagas", "nossa equipe"), ctx)), true);
});

test("verificação bloqueia termo discriminatório e avisa sobre promessa", () => {
  const ctx = { canal: "whatsapp", vagaSigilosa: false, nomeEmpresa: null, link: LINK };
  const ok = mensagemWhatsApp(dados());
  assert.equal(temBloqueio(verificarMensagem(`${ok}\nBuscamos boa aparência.`, ctx)), true);
  const v = verificarMensagem(`${ok}\nContratação garantida!`, ctx);
  assert.ok(v.some((x) => x.id === "promessa" && x.nivel === "aviso"));
});

test("e-mail: assunto curto, saída por resposta e link", () => {
  const e = mensagemEmail(dados());
  assert.ok(e.assunto.startsWith("Vaga de Analista de Logística"));
  assert.ok(e.texto.includes(LINK) && /responda SAIR/.test(e.texto));
});

test("teto diário: restante nunca fica negativo", () => {
  assert.equal(restanteDoDia(0, 20), 20);
  assert.equal(restanteDoDia(19, 20), 1);
  assert.equal(restanteDoDia(25, 20), 0);
});

test("janela de horário em São Paulo (padrão 08:00 às 20:00)", () => {
  assert.equal(dentroDaJanela(new Date("2026-10-26T15:00:00Z"), "", ""), true); // 12:00 BRT
  assert.equal(dentroDaJanela(new Date("2026-10-26T10:00:00Z"), "", ""), false); // 07:00 BRT
  assert.equal(dentroDaJanela(new Date("2026-10-26T23:30:00Z"), "", ""), false); // 20:30 BRT
  assert.equal(dentroDaJanela(new Date("2026-10-26T23:30:00Z"), "09:00", "21:00"), true);
});

test("início do dia em São Paulo", () => {
  assert.equal(inicioDoDiaSaoPaulo(new Date("2026-10-26T15:00:00Z")), "2026-10-26T03:00:00.000Z");
  assert.equal(inicioDoDiaSaoPaulo(new Date("2026-10-26T02:00:00Z")), "2026-10-25T03:00:00.000Z");
});

test("retenção: 30 dias; só apaga quem não interagiu", () => {
  const de = new Date("2026-10-01T12:00:00Z");
  assert.equal(retencaoAte(de).toISOString(), "2026-10-31T12:00:00.000Z");
  const agora = new Date("2026-11-05T00:00:00Z");
  const base = { retencao_ate: "2026-10-31T12:00:00.000Z", anonimizado_em: null };
  assert.equal(precisaAnonimizar({ ...base, estado: "enviado" }, agora), true);
  assert.equal(precisaAnonimizar({ ...base, estado: "nao_contactar" }, agora), true);
  assert.equal(precisaAnonimizar({ ...base, estado: "candidatou" }, agora), false);
  assert.equal(precisaAnonimizar({ ...base, estado: "respondeu" }, agora), false);
  assert.equal(precisaAnonimizar({ ...base, estado: "enviado", anonimizado_em: "2026-11-01T00:00:00Z" }, agora), false);
  assert.equal(precisaAnonimizar({ ...base, estado: "enviado", retencao_ate: "2026-12-01T00:00:00Z" }, agora), false);
});

test("origem da candidatura e fontes válidas", () => {
  assert.equal(origemDaCandidatura("vagascom"), "hunter_vagascom");
  assert.equal(fonteValida("infojobs"), true);
  assert.equal(fonteValida("facebook"), false);
});

test("lerCsv: aspas duplicadas e quebra de linha dentro do campo", () => {
  const r = lerCsv('a,b\n"x ""y""","l1\nl2"');
  assert.deepEqual(r[1], ['x "y"', "l1\nl2"]);
});
