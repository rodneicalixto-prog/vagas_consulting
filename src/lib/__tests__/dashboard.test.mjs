import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePeriodo,
  inicioPeriodo,
  diasDesde,
  semaforoVaga,
  grupoDaEtapa,
  semanasRecentes,
} from "../dashboard.ts";

const DIA = 24 * 3600_000;
const AGORA = new Date("2026-10-14T12:00:00Z").getTime();

test("período inválido cai no padrão de 30 dias", () => {
  assert.equal(parsePeriodo(undefined), "30d");
  assert.equal(parsePeriodo("xpto"), "30d");
  assert.equal(parsePeriodo("7d"), "7d");
});

test("início do período", () => {
  assert.equal(inicioPeriodo("7d", AGORA), AGORA - 7 * DIA);
  assert.equal(inicioPeriodo("90d", AGORA), AGORA - 90 * DIA);
  assert.equal(inicioPeriodo("tudo", AGORA), null);
  const mes = new Date(inicioPeriodo("mes", AGORA));
  assert.equal(mes.getDate(), 1);
});

test("dias desde uma data", () => {
  assert.equal(diasDesde(new Date(AGORA - 3 * DIA - 1000).toISOString(), AGORA), 3);
  assert.equal(diasDesde(null, AGORA), 0);
  assert.equal(diasDesde(new Date(AGORA + DIA).toISOString(), AGORA), 0);
});

test("semáforo da vaga em aberto (15 e 30 dias)", () => {
  assert.equal(semaforoVaga(0), "verde");
  assert.equal(semaforoVaga(15), "verde");
  assert.equal(semaforoVaga(16), "amarelo");
  assert.equal(semaforoVaga(30), "amarelo");
  assert.equal(semaforoVaga(31), "vermelho");
});

test("grupos de etapa: aprovado é só contratado; reprovado junta dois status", () => {
  assert.equal(grupoDaEtapa("contratado"), "contratado");
  assert.equal(grupoDaEtapa("proposta"), "proposta");
  assert.equal(grupoDaEtapa("rejeitada"), "reprovados");
  assert.equal(grupoDaEtapa("reprovado_cliente"), "reprovados");
  assert.equal(grupoDaEtapa("desistente"), null);
});

test("semanas recentes: n semanas contíguas terminando agora", () => {
  const s = semanasRecentes(4, AGORA);
  assert.equal(s.length, 4);
  assert.equal(s[3].fim, AGORA);
  assert.equal(s[0].fim, s[1].inicio);
});
