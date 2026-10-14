import { test } from "node:test";
import assert from "node:assert/strict";
import {
  empresasParaFiltro,
  filtroConfidencialJobs,
  podeVerEmpresa,
  podeVerVaga,
} from "../auth/escopo.ts";

const NENHUMA = "00000000-0000-0000-0000-000000000000";
const admin = { todos: true, empresas: [], confidenciais: [] };
const semCarteira = { todos: false, empresas: [], confidenciais: [] };
const op = { todos: false, empresas: ["A", "B"], confidenciais: ["B"] };

test("empresasParaFiltro: operador sem carteira recebe lista sentinela", () => {
  assert.deepEqual(empresasParaFiltro(semCarteira), [NENHUMA]);
  assert.deepEqual(empresasParaFiltro(op), ["A", "B"]);
});

test("filtroConfidencialJobs", () => {
  assert.equal(filtroConfidencialJobs(semCarteira), "confidencial.eq.false");
  assert.equal(filtroConfidencialJobs(op), "confidencial.eq.false,company_id.in.(B)");
});

test("podeVerEmpresa: admin/superadmin (todos) veem tudo", () => {
  assert.equal(podeVerEmpresa(admin, "X"), true);
  assert.equal(podeVerEmpresa(admin, null), true);
});

test("podeVerEmpresa: operador só na carteira", () => {
  assert.equal(podeVerEmpresa(op, "A"), true);
  assert.equal(podeVerEmpresa(op, "X"), false);
  assert.equal(podeVerEmpresa(op, null), false);
  assert.equal(podeVerEmpresa(op, undefined), false);
  assert.equal(podeVerEmpresa(semCarteira, "A"), false);
});

test("podeVerVaga: admin vê tudo, inclusive confidencial", () => {
  assert.equal(podeVerVaga(admin, { company_id: "X", confidencial: true }), true);
});

test("podeVerVaga: confidencial só com acesso de confiança", () => {
  assert.equal(podeVerVaga(op, { company_id: "A", confidencial: true }), false);
  assert.equal(podeVerVaga(op, { company_id: "B", confidencial: true }), true);
  assert.equal(podeVerVaga(op, { company_id: "A", confidencial: false }), true);
  assert.equal(podeVerVaga(op, { company_id: "A" }), true);
  assert.equal(podeVerVaga(op, { company_id: "A", confidencial: null }), true);
});

test("podeVerVaga: fora da carteira ou sem empresa é negado", () => {
  assert.equal(podeVerVaga(op, { company_id: "X", confidencial: false }), false);
  assert.equal(podeVerVaga(op, { company_id: null, confidencial: false }), false);
  assert.equal(podeVerVaga(semCarteira, { company_id: "A", confidencial: false }), false);
});
