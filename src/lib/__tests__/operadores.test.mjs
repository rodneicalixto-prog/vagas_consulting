import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularVagasOperador, rotuloVagasOperador, erroLimiteExcedido } from "../operadores.ts";

test("em aberto = limite - em uso", () => {
  const v = calcularVagasOperador(5, 3);
  assert.deepEqual(v, { limite: 5, emUso: 3, emAberto: 2, cheio: false });
});

test("limite atingido marca cheio e nunca fica negativo", () => {
  assert.equal(calcularVagasOperador(4, 4).cheio, true);
  assert.equal(calcularVagasOperador(4, 4).emAberto, 0);
  // empresa com mais operadores do que o limite (limite reduzido depois)
  const v = calcularVagasOperador(2, 5);
  assert.equal(v.emAberto, 0);
  assert.equal(v.cheio, true);
});

test("valores inválidos são saneados", () => {
  assert.deepEqual(calcularVagasOperador(-1, -3), { limite: 0, emUso: 0, emAberto: 0, cheio: true });
  assert.equal(calcularVagasOperador(4.9, 1.2).limite, 4);
});

test("rótulo da tela", () => {
  assert.equal(
    rotuloVagasOperador(calcularVagasOperador(5, 3)),
    "3 de 5 operadores em uso · 2 em aberto",
  );
});

test("erro do gatilho do banco é reconhecido", () => {
  assert.equal(erroLimiteExcedido({ message: "limite_operadores_excedido" }), true);
  assert.equal(erroLimiteExcedido({ message: "outro erro" }), false);
  assert.equal(erroLimiteExcedido(null), false);
});
