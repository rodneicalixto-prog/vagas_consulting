import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatBRL, centavosParaReais, parseReais, normalizarRemuneracao, exibirRemuneracao,
} from "../money.ts";

test("formatBRL", () => {
  assert.equal(formatBRL(2354), "R$ 2.354,00");
  assert.equal(formatBRL(0.5), "R$ 0,50");
});
test("centavosParaReais", () => {
  assert.equal(centavosParaReais("235400"), 2354);
  assert.equal(centavosParaReais(""), 0);
  assert.equal(centavosParaReais("R$ 1,50"), 1.5);
});
test("parseReais", () => {
  for (const t of ["2354", "2354,00", "2.354,00", "2354.00", "R$ 2.354,00"]) {
    assert.equal(parseReais(t), 2354, t);
  }
  assert.equal(parseReais(""), null);
  assert.equal(parseReais("abc"), null);
  assert.equal(parseReais("1,2,3"), null);
});
test("normalizarRemuneracao", () => {
  assert.equal(normalizarRemuneracao("2354,00"), "R$ 2.354,00");
  assert.equal(normalizarRemuneracao("  "), null);
  assert.equal(normalizarRemuneracao(null), null);
  assert.throws(() => normalizarRemuneracao("muito dinheiro"));
});
test("exibirRemuneracao", () => {
  assert.equal(exibirRemuneracao("2354,00"), "R$ 2.354,00");
  assert.equal(exibirRemuneracao("a combinar"), "a combinar");
  assert.equal(exibirRemuneracao(undefined), "");
});
