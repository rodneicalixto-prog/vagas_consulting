import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarTelefoneBR, linkWhatsApp, formatarTelefoneBR, variantesTelefoneBR } from "../whatsapp.ts";

test("normaliza formatos comuns de telefone brasileiro", () => {
  assert.equal(normalizarTelefoneBR("(11) 99999-9999"), "5511999999999");
  assert.equal(normalizarTelefoneBR("11999999999"), "5511999999999");
  assert.equal(normalizarTelefoneBR("+55 11 99999-9999"), "5511999999999");
  assert.equal(normalizarTelefoneBR("11 3333-4444"), "551133334444");
});

test("rejeita o que não parece telefone do Brasil", () => {
  assert.equal(normalizarTelefoneBR(""), null);
  assert.equal(normalizarTelefoneBR(null), null);
  assert.equal(normalizarTelefoneBR("123"), null);
  assert.equal(normalizarTelefoneBR("+1 415 555 0100"), null);
});

test("link do WhatsApp", () => {
  assert.equal(linkWhatsApp("(11) 99999-9999"), "https://wa.me/5511999999999");
  assert.equal(
    linkWhatsApp("11999999999", "Olá, tudo bem?"),
    "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20tudo%20bem%3F",
  );
  assert.equal(linkWhatsApp("abc"), null);
});

test("formatação de leitura", () => {
  assert.equal(formatarTelefoneBR("11999999999"), "+55 (11) 99999-9999");
  assert.equal(formatarTelefoneBR("1133334444"), "+55 (11) 3333-4444");
  assert.equal(formatarTelefoneBR("xyz"), "xyz");
  assert.equal(formatarTelefoneBR(null), "—");
});

test("variantes do celular: com e sem o nono dígito casam entre si", () => {
  assert.deepEqual(variantesTelefoneBR("(11) 98765-4321"), ["5511987654321", "551187654321"]);
  assert.deepEqual(variantesTelefoneBR("551187654321"), ["551187654321", "5511987654321"]);
  assert.deepEqual(variantesTelefoneBR("1133334444"), ["551133334444"]);
  assert.deepEqual(variantesTelefoneBR("abc"), []);
});
