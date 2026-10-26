import { test } from "node:test";
import assert from "node:assert/strict";
import {
  origemDoLink,
  codificarOrigem,
  lerOrigemDoCookie,
  origemInicial,
  interpretarOrigemCandidatura,
  textoDaCandidatura,
  rotuloOrigem,
  agruparOrigens,
  resumirPorCanal,
  desdeDias,
} from "../origem.ts";

const sp = (q) => new URLSearchParams(q);

test("origem do link: canal de divulgação válido ou utm_source limpo; o resto é ignorado", () => {
  assert.deepEqual(origemDoLink(sp("o=whatsapp")), { canal: "divulgacao", detalhe: "whatsapp" });
  assert.deepEqual(origemDoLink(sp("utm_source=Instagram_Ads")), { canal: "campanha", detalhe: "instagram_ads" });
  assert.equal(origemDoLink(sp("o=canal-inventado")), null);
  assert.equal(origemDoLink(sp("utm_source=<script>alert(1)</script>")), null);
  assert.equal(origemDoLink(sp("utm_source=" + "x".repeat(40))), null);
  assert.equal(origemDoLink(sp("")), null);
});

test("cookie: ida e volta; valor adulterado é ignorado", () => {
  const o = { canal: "divulgacao", detalhe: "linkedin" };
  assert.deepEqual(lerOrigemDoCookie(codificarOrigem(o)), o);
  assert.deepEqual(lerOrigemDoCookie("campanha:meta"), { canal: "campanha", detalhe: "meta" });
  assert.equal(lerOrigemDoCookie("divulgacao:inventado"), null);
  assert.equal(lerOrigemDoCookie("qualquer:coisa"), null);
  assert.equal(lerOrigemDoCookie("nao_informado:"), null);
  assert.equal(lerOrigemDoCookie(null), null);
});

test("origem inicial: hunter vence o cookie; sem nada, direto", () => {
  assert.deepEqual(origemInicial({ hunterFonte: "vagascom", cookieOrigem: "divulgacao:whatsapp" }), { canal: "hunter", detalhe: "vagascom" });
  assert.deepEqual(origemInicial({ cookieOrigem: "divulgacao:whatsapp" }), { canal: "divulgacao", detalhe: "whatsapp" });
  assert.deepEqual(origemInicial({}), { canal: "direto", detalhe: "" });
  assert.deepEqual(origemInicial({ hunterFonte: "facebook" }), { canal: "direto", detalhe: "" });
});

test("origem da candidatura: texto antigo e novo viram origem estruturada", () => {
  assert.deepEqual(interpretarOrigemCandidatura("divulgacao_instagram"), { canal: "divulgacao", detalhe: "instagram" });
  assert.deepEqual(interpretarOrigemCandidatura("hunter_infojobs"), { canal: "hunter", detalhe: "infojobs" });
  assert.deepEqual(interpretarOrigemCandidatura("app_candidato"), { canal: "direto", detalhe: "" });
  assert.deepEqual(interpretarOrigemCandidatura(null), { canal: "direto", detalhe: "" });
  assert.deepEqual(interpretarOrigemCandidatura("convite"), { canal: "convite", detalhe: "" });
  assert.equal(interpretarOrigemCandidatura("algo_estranho").canal, "outro");
});

test("texto da candidatura: volta ao formato que o indicador já entende", () => {
  assert.equal(textoDaCandidatura({ canal: "divulgacao", detalhe: "whatsapp" }), "divulgacao_whatsapp");
  assert.equal(textoDaCandidatura({ canal: "hunter", detalhe: "vagascom" }), "hunter_vagascom");
  assert.equal(textoDaCandidatura({ canal: "campanha", detalhe: "meta" }), "campanha_meta");
  assert.equal(textoDaCandidatura({ canal: "direto", detalhe: "" }), "app_candidato");
});

test("rótulo e agrupamento", () => {
  assert.equal(rotuloOrigem({ canal: "divulgacao", detalhe: "whatsapp" }), "Divulgação da vaga: whatsapp");
  assert.equal(rotuloOrigem({ canal: "direto", detalhe: "" }), "Direto no app");
  const g = agruparOrigens([
    { canal: "direto", detalhe: "" },
    { canal: "hunter", detalhe: "vagascom" },
    { canal: "hunter", detalhe: "vagascom" },
  ]);
  assert.deepEqual(g[0], { canal: "hunter", detalhe: "vagascom", total: 2 });
  assert.equal(g.length, 2);
});

test("resumo por canal: cadastros, candidaturas, contratados e conversão", () => {
  const r = resumirPorCanal(
    [{ canal: "hunter" }, { canal: "hunter" }, { canal: "direto" }],
    [
      { origem: "hunter_vagascom", status: "contratado" },
      { origem: "hunter_vagascom", status: "recebida" },
      { origem: "app_candidato", status: "recebida" },
    ],
  );
  const h = r.find((x) => x.canal === "hunter");
  assert.deepEqual([h.cadastros, h.candidaturas, h.contratados, h.conversao], [2, 2, 1, 50]);
  const d = r.find((x) => x.canal === "direto");
  assert.deepEqual([d.cadastros, d.candidaturas, d.contratados, d.conversao], [1, 1, 0, 0]);
  const semCand = resumirPorCanal([{ canal: "convite" }], []);
  assert.equal(semCand[0].conversao, null);
});

test("início do período: últimos N dias; zero = sem limite", () => {
  assert.equal(desdeDias(30, new Date("2026-10-31T00:00:00Z")), "2026-10-01T00:00:00.000Z");
  assert.equal(desdeDias(0), null);
});
