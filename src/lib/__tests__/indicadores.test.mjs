import { test } from "node:test";
import assert from "node:assert/strict";
import { calcular, statusDe, periodoDoMes, validarPlano, manualDeFormulario } from "../indicadores.ts";

const per = periodoDoMes("2026-10");
const vaga = (id, status, pub, upd) => ({ id, status, publicada_em: pub, created_at: pub, updated_at: upd });
const cand = (id, status, origem, cri, upd) => ({ id, job_id: "j1", status, origem, created_at: cri, updated_at: upd });

test("período do mês e status por direção", () => {
  assert.equal(per.inicioISO, "2026-10-01");
  assert.equal(periodoDoMes("2026-13"), null);
  assert.equal(statusDe(25, 30, "menor"), "verde");
  assert.equal(statusDe(32, 30, "menor"), "atencao");
  assert.equal(statusDe(40, 30, "menor"), "abaixo");
  assert.equal(statusDe(85, 90, "maior"), "atencao");
  assert.equal(statusDe(null, 90, "maior"), "sem_dado");
});

test("sem dado manual aparece como sem dado, nunca zero", () => {
  const r = calcular({ vagas: [], candidaturas: [], nivelExtra: new Map(), ini: per.ini, fim: per.fim, manual: {}, metas: {} });
  assert.ok(r.indicadores.every((i) => i.valor === null && i.status === "sem_dado"));
  assert.equal(r.faltando.length, 6);
  assert.equal(r.principalFonte, null);
});

test("tempo de fechamento, contratações, custo e aceitação saem do banco e das entradas", () => {
  const vagas = [vaga("j1", "preenchida", "2026-09-10T00:00:00Z", "2026-10-10T00:00:00Z")];
  const cands = [
    cand("a1", "contratado", "divulgacao_linkedin", "2026-10-02T00:00:00Z", "2026-10-09T00:00:00Z"),
    cand("a2", "contratado", "app_candidato", "2026-10-03T00:00:00Z", "2026-10-09T00:00:00Z"),
    cand("a3", "rejeitada", "divulgacao_linkedin", "2026-10-04T00:00:00Z", "2026-10-05T00:00:00Z"),
  ];
  const r = calcular({
    vagas, candidaturas: cands, nivelExtra: new Map(), ini: per.ini, fim: per.fim,
    manual: { custo_total: 5000, ofertas_enviadas: 4, ofertas_aceitas: 3, turnover_precoce_pct: 20 },
    metas: { custo_max: 3000 },
  });
  const por = (id) => r.indicadores.find((i) => i.id === id);
  assert.equal(por("tempo").valor, 30);
  assert.equal(r.contratacoes, 2);
  assert.equal(por("custo").valor, 2500);
  assert.equal(por("custo").status, "verde");
  assert.equal(por("aceitacao").valor, 75);
  assert.equal(por("turnover").status, "abaixo");
  assert.equal(r.principalFonte.startsWith("linkedin"), true);
  assert.equal(r.fontes.find((f) => f.fonte === "linkedin").candidaturas, 2);
});

test("leitura em conjunto: fechamento rápido com turnover alto e gargalo do funil", () => {
  const vagas = [vaga("j1", "preenchida", "2026-10-01T00:00:00Z", "2026-10-10T00:00:00Z")];
  const cands = Array.from({ length: 6 }, (_, i) => cand(`c${i}`, i < 5 ? "recebida" : "triagem", null, "2026-10-02T00:00:00Z", "2026-10-03T00:00:00Z"));
  const r = calcular({
    vagas, candidaturas: cands, nivelExtra: new Map(), ini: per.ini, fim: per.fim,
    manual: { turnover_precoce_pct: 30 }, metas: {},
  });
  assert.ok(r.leituras.some((l) => /turnover precoce alto/.test(l)));
  assert.ok(r.gargalo && /Candidaturas → Triagem/.test(r.gargalo));
});

test("registros de triagem e ficha elevam a etapa alcançada de quem foi recusado", () => {
  const cands = [cand("x", "rejeitada", null, "2026-10-02T00:00:00Z", "2026-10-03T00:00:00Z")];
  const r = calcular({ vagas: [], candidaturas: cands, nivelExtra: new Map([["x", 2]]), ini: per.ini, fim: per.fim, manual: {}, metas: {} });
  assert.equal(r.funil.find((l) => l.etapa === "entrevista").quantidade, 1);
  assert.equal(r.funil.find((l) => l.etapa === "teste").quantidade, 0);
});

test("plano: limite de 3 abertas, responsável e prazo; formulário manual limita faixas", () => {
  const ok = { indicador: "SLA", acao: "Revisar o fluxo de aprovação com o gestor", responsavel: "Cassiano", prazo: "2026-11-05" };
  assert.deepEqual(validarPlano(ok, 2), []);
  assert.ok(validarPlano(ok, 3).some((p) => /3 ações abertas/.test(p)));
  assert.ok(validarPlano({ ...ok, responsavel: "" }, 0).length > 0);
  const m = manualDeFormulario({ nps: "250", sla_pct: "88,5", custo_total: "" });
  assert.equal(m.nps, null);
  assert.equal(m.sla_pct, 88.5);
  assert.equal(m.custo_total, null);
});
