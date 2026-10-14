import { test } from "node:test";
import assert from "node:assert/strict";
import { conviteExpirado } from "../convites.ts";

const passado = new Date(Date.now() - 3600_000).toISOString();
const futuro = new Date(Date.now() + 3600_000).toISOString();

test("convite aberto vencido = expirado", () => {
  assert.equal(conviteExpirado({ status: "ofertado", validade: passado }), true);
  assert.equal(conviteExpirado({ status: "visualizado", validade: passado }), true);
});
test("convite aberto dentro da validade ou sem validade não expira", () => {
  assert.equal(conviteExpirado({ status: "ofertado", validade: futuro }), false);
  assert.equal(conviteExpirado({ status: "ofertado", validade: null }), false);
});
test("convite aceito/outros vencido não é expirado", () => {
  for (const status of ["aceito", "confirmado", "recusado", "concluido", "cancelado"]) {
    assert.equal(conviteExpirado({ status, validade: passado }), false);
  }
});
