import { test } from "node:test";
import assert from "node:assert/strict";

// 32 bytes em base64 só para o teste (não é segredo real).
process.env.INTEGRATIONS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const { cifrar, decifrar, ultimos4, chaveMestraConfigurada } = await import("../crypto-segredos.ts");

test("cifra e decifra de volta", () => {
  const segredo = "sk-teste-1234567890abcdef";
  const c = cifrar(segredo);
  assert.notEqual(c, segredo);
  assert.ok(c.startsWith("v1:"));
  assert.equal(decifrar(c), segredo);
});

test("o texto cifrado não contém o segredo e muda a cada vez (IV aleatório)", () => {
  const segredo = "gsk_abcdefghijkl";
  const a = cifrar(segredo);
  const b = cifrar(segredo);
  assert.notEqual(a, b);
  assert.equal(a.includes(segredo), false);
});

test("adulteração é detectada", () => {
  const c = cifrar("re_segredo_qualquer");
  const partes = c.split(":");
  partes[3] = Buffer.from("adulterado").toString("base64");
  assert.throws(() => decifrar(partes.join(":")));
});

test("formato inválido e últimos 4", () => {
  assert.throws(() => decifrar("texto-solto"));
  assert.equal(ultimos4("abcdefgh1234"), "1234");
  assert.equal(chaveMestraConfigurada(), true);
});

test("sem chave-mestra não cifra", () => {
  const guardada = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  assert.equal(chaveMestraConfigurada(), false);
  assert.throws(() => cifrar("x"));
  process.env.INTEGRATIONS_ENCRYPTION_KEY = guardada;
});
