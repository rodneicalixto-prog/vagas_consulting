import { test } from "node:test";
import assert from "node:assert/strict";
import { nomeEmpresa, EMPRESA_CONFIDENCIAL } from "../sigilo.ts";

const emp = { nome_fantasia: "Fantasia", razao_social: "Razao LTDA" };

test("vaga não confidencial mostra o nome", () => {
  assert.equal(nomeEmpresa(emp, false), "Fantasia");
  assert.equal(nomeEmpresa(emp, null, "inscrito"), "Fantasia");
});

test("confidencial oculta até entrevista/teste/proposta/contratado", () => {
  for (const s of [undefined, null, "inscrito", "triagem", "reprovado"]) {
    assert.equal(nomeEmpresa(emp, true, s), EMPRESA_CONFIDENCIAL);
  }
  for (const s of ["entrevista", "teste", "proposta", "contratado"]) {
    assert.equal(nomeEmpresa(emp, true, s), "Fantasia");
  }
});

test("fallbacks de nome", () => {
  assert.equal(nomeEmpresa({ nome_fantasia: null, razao_social: "Razao LTDA" }, false), "Razao LTDA");
  assert.equal(nomeEmpresa(null, false, null, "—"), "—");
  assert.equal(nomeEmpresa(undefined, false), "");
});
