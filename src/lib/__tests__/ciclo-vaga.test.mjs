import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularEtapas, proximoPasso, vizinhas, etapaDaRota, caminhoEtapa } from "../ciclo-vaga.ts";

const base = {
  statusVaga: "rascunho",
  candidaturas: 0,
  criteriosConfirmados: false,
  criteriosBloqueados: false,
  triados: 0,
  validacoesPendentes: 0,
  fichasFechadas: 0,
  testesAprovados: 0,
  laudosAssinados: 0,
  devolutivasEnviadas: 0,
  ofertas: 0,
  abordagens: 0,
  prospects: 0,
};
const estado = (etapas, chave) => etapas.find((e) => e.chave === chave).estado;

test("vaga nova: critérios é o próximo passo e o resto aponta para ele", () => {
  const et = calcularEtapas(base);
  assert.equal(proximoPasso(et, base).chave, "criterios");
  for (const k of ["divulgacao", "triagem", "abordagem", "hunter"]) {
    assert.equal(estado(et, k), "bloqueada");
    assert.equal(et.find((e) => e.chave === k).resolverEm, "criterios");
    assert.ok(et.find((e) => e.chave === k).motivo);
  }
});

test("etapa bloqueada nunca fica sem motivo nem destino", () => {
  const c = { ...base, criteriosConfirmados: true, statusVaga: "publicada", candidaturas: 3, triados: 3 };
  for (const e of calcularEtapas(c).filter((x) => x.estado === "bloqueada")) {
    assert.ok(e.motivo && e.resolverEm, e.chave);
  }
});

test("critérios com bloqueio de qualidade continuam pendentes", () => {
  const et = calcularEtapas({ ...base, criteriosConfirmados: true, criteriosBloqueados: true });
  assert.equal(estado(et, "criterios"), "pendente");
  assert.equal(estado(et, "triagem"), "bloqueada");
});

test("publicada sem candidatos: próximo passo é buscar candidatos pelo hunter, não triar", () => {
  const c = { ...base, criteriosConfirmados: true, statusVaga: "publicada" };
  const p = proximoPasso(calcularEtapas(c), c);
  assert.equal(p.chave, "hunter");
  assert.equal(p.acao, "Buscar candidatos");
});

test("candidatos chegando: triagem em andamento é o próximo passo", () => {
  const c = { ...base, criteriosConfirmados: true, statusVaga: "publicada", candidaturas: 5, triados: 2 };
  const et = calcularEtapas(c);
  assert.equal(estado(et, "triagem"), "andamento");
  assert.equal(proximoPasso(et, c).chave, "triagem");
});

test("ciclo completo devolve null", () => {
  const c = {
    ...base, criteriosConfirmados: true, statusVaga: "publicada", candidaturas: 2, triados: 2,
    fichasFechadas: 2, laudosAssinados: 2, devolutivasEnviadas: 2,
  };
  assert.equal(proximoPasso(calcularEtapas(c), c), null);
});

test("testes e carta-oferta nunca viram próximo passo obrigatório", () => {
  const c = { ...base, criteriosConfirmados: true, statusVaga: "publicada", candidaturas: 1, triados: 1, fichasFechadas: 1 };
  const et = calcularEtapas(c);
  assert.equal(estado(et, "testes"), "opcional");
  assert.equal(proximoPasso(et, c).chave, "laudos");
});

test("reprovação aguardando decisão passa na frente de qualquer outro passo", () => {
  const c = { ...base, criteriosConfirmados: true, statusVaga: "publicada", candidaturas: 5, triados: 5, validacoesPendentes: 2 };
  const et = calcularEtapas(c);
  assert.equal(estado(et, "validacoes"), "pendente");
  const p = proximoPasso(et, c);
  assert.equal(p.chave, "validacoes");
  assert.ok(p.resumo.includes("2 casos aguardam"));
});

test("sem reprovação pendente a validação é opcional e não vira próximo passo", () => {
  const c = { ...base, criteriosConfirmados: true, statusVaga: "publicada", candidaturas: 5, triados: 2 };
  assert.equal(estado(calcularEtapas(c), "validacoes"), "opcional");
  assert.equal(proximoPasso(calcularEtapas(c), c).chave, "triagem");
});

test("vizinhas seguem a ordem linear e ignoram a abordagem", () => {
  assert.deepEqual(vizinhas("criterios"), { anterior: null, proxima: "divulgacao" });
  assert.deepEqual(vizinhas("divulgacao"), { anterior: "criterios", proxima: "triagem" });
  assert.deepEqual(vizinhas("triagem"), { anterior: "divulgacao", proxima: "validacoes" });
  assert.deepEqual(vizinhas("validacoes"), { anterior: "triagem", proxima: "entrevista" });
  assert.deepEqual(vizinhas("ofertas"), { anterior: "devolutivas", proxima: null });
  assert.deepEqual(vizinhas(null), { anterior: null, proxima: "criterios" });
  assert.deepEqual(vizinhas("abordagem"), { anterior: "divulgacao", proxima: "triagem" });
  assert.deepEqual(vizinhas("hunter"), { anterior: "divulgacao", proxima: "triagem" });
});

test("etapaDaRota reconhece etapa, subpágina e Central", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  assert.equal(etapaDaRota(id, `/admin/vagas/${id}`), null);
  assert.equal(etapaDaRota(id, `/admin/vagas/${id}/triagem`), "triagem");
  assert.equal(etapaDaRota(id, `/admin/vagas/${id}/laudos/abc/exportar`), "laudos");
  assert.equal(caminhoEtapa(id, "criterios"), `/admin/vagas/${id}/criterios`);
});
