import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jsonLdSeguro,
  mencionaEmpresa,
  montarJobPosting,
  resumoDescricao,
  separarLocal,
  tipoEmprego,
  tituloDaVaga,
} from "../vaga-publica.ts";

const SITE = "https://sosvagas.sosmkt.com.br";
const base = {
  id: "11111111-1111-1111-1111-111111111111",
  titulo: "Analista de Dados",
  local: "Olímpia - SP",
  modalidade: "efetiva",
  modelo_trabalho: "presencial",
  remuneracao_texto: null,
  descricao: "Atuar com análise de dados.",
  publicada_em: "2026-10-20T12:00:00Z",
  expira_em: null,
  confidencial: false,
  companies: { nome_fantasia: "Acme Foods", razao_social: "Acme LTDA" },
};
const agora = new Date("2026-10-27T12:00:00Z");

test("modalidade vira employmentType", () => {
  assert.equal(tipoEmprego("efetiva"), "FULL_TIME");
  assert.equal(tipoEmprego("pj"), "CONTRACTOR");
  assert.equal(tipoEmprego("temporaria"), "TEMPORARY");
});

test("título da página usa cargo e cidade", () => {
  assert.equal(tituloDaVaga(base), "Analista de Dados em Olímpia - SP | Vagas Consulting");
  assert.equal(tituloDaVaga({ titulo: "X", local: null }), "X | Vagas Consulting");
});

test("resumo não corta palavra e fecha com reticências", () => {
  const texto = "palavra ".repeat(40);
  const r = resumoDescricao(texto, 50);
  assert.ok(r.endsWith("…"));
  assert.ok(r.length <= 51);
  assert.ok(!/palav…$/.test(r));
  assert.equal(resumoDescricao("curto", 155), "curto");
  assert.equal(resumoDescricao(null), "");
});

test("local separa cidade e UF", () => {
  assert.deepEqual(separarLocal("Olímpia - SP"), { cidade: "Olímpia", uf: "SP" });
  assert.deepEqual(separarLocal("Campinas, sp"), { cidade: "Campinas", uf: "SP" });
  assert.deepEqual(separarLocal("Grande São Paulo"), { cidade: "Grande São Paulo" });
  assert.equal(separarLocal("  "), null);
});

test("JobPosting da vaga aberta traz a empresa e a localidade", () => {
  const j = montarJobPosting(base, SITE, agora);
  assert.equal(j["@type"], "JobPosting");
  assert.equal(j.employmentType, "FULL_TIME");
  assert.equal(j.hiringOrganization.name, "Acme Foods");
  assert.equal(j.jobLocation.address.addressRegion, "SP");
  assert.equal(j.url, `${SITE}/vagas/${base.id}`);
  assert.equal("validThrough" in j, false);
});

test("vaga confidencial nunca expõe a empresa no JobPosting", () => {
  const j = montarJobPosting({ ...base, confidencial: true }, SITE, agora);
  assert.equal(j.hiringOrganization.name, "Vagas Consulting");
  assert.ok(!JSON.stringify(j).includes("Acme"));
});

test("vaga remota usa TELECOMMUTE e sem jobLocation", () => {
  const j = montarJobPosting({ ...base, modelo_trabalho: "remoto" }, SITE, agora);
  assert.equal(j.jobLocationType, "TELECOMMUTE");
  assert.equal("jobLocation" in j, false);
});

test("não marca vaga vencida nem sem descrição", () => {
  assert.equal(montarJobPosting({ ...base, expira_em: "2026-10-01T00:00:00Z" }, SITE, agora), null);
  assert.equal(montarJobPosting({ ...base, descricao: "  " }, SITE, agora), null);
  const ok = montarJobPosting({ ...base, expira_em: "2026-12-01T00:00:00Z" }, SITE, agora);
  assert.equal(ok.validThrough, "2026-12-01T00:00:00Z");
});

test("JSON-LD não deixa fechar a tag script", () => {
  const s = jsonLdSeguro({ d: "</script><script>alert(1)</script>" });
  assert.ok(!s.includes("</script>"));
  assert.ok(!s.includes("<"));
});

test("vaga presencial sem local não é marcada; remota sem local é", () => {
  assert.equal(montarJobPosting({ ...base, local: null }, SITE, agora), null);
  assert.ok(montarJobPosting({ ...base, local: null, modelo_trabalho: "remoto" }, SITE, agora));
});

test("description sai em HTML escapado com quebras de linha", () => {
  const j = montarJobPosting({ ...base, descricao: "Linha 1\nA & B <b>x</b>" }, SITE, agora);
  assert.equal(j.description, "Linha 1<br>A &amp; B &lt;b&gt;x&lt;/b&gt;");
});

test("vaga confidencial leva logo da marca; título de vaga remota diz Remoto", () => {
  const j = montarJobPosting({ ...base, confidencial: true }, SITE, agora);
  assert.equal(j.hiringOrganization.logo, `${SITE}/icons/icon-512.png`);
  assert.equal(tituloDaVaga({ ...base, modelo_trabalho: "remoto" }), "Analista de Dados em Remoto | Vagas Consulting");
});

test("vaga confidencial que cita a empresa no texto não gera JobPosting", () => {
  const cita = { ...base, confidencial: true, descricao: "Vaga na ACME FOODS, em Olímpia." };
  assert.equal(mencionaEmpresa(cita), true);
  assert.equal(montarJobPosting({ ...cita, menciona_empresa: true }, SITE, agora), null);
  assert.equal(mencionaEmpresa({ ...base, confidencial: true }), false);
  assert.equal(mencionaEmpresa({ ...base, descricao: "Acme Foods" }), false);
});

test("UF só vale se existir", () => {
  assert.deepEqual(separarLocal("Zona Sul/ZN"), { cidade: "Zona Sul/ZN" });
  assert.deepEqual(separarLocal("Recife - PE"), { cidade: "Recife", uf: "PE" });
});
