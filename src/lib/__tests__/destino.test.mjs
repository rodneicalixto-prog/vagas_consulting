import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizarDestino } from "../destino.ts";

test("aceita caminho interno do candidato", () => {
  assert.equal(sanitizarDestino("/vagas/abc"), "/vagas/abc");
  assert.equal(sanitizarDestino("/vagas/abc/candidatura"), "/vagas/abc/candidatura");
  assert.equal(sanitizarDestino("/inicio"), "/inicio");
});

test("recusa URL externa e variações de open redirect", () => {
  assert.equal(sanitizarDestino("https://evil.com"), null);
  assert.equal(sanitizarDestino("//evil.com"), null);
  assert.equal(sanitizarDestino("/\\evil.com"), null);
  assert.equal(sanitizarDestino("javascript:alert(1)"), null);
  assert.equal(sanitizarDestino("vagas/abc"), null);
});

test("recusa área administrativa, login e etapas do cadastro", () => {
  assert.equal(sanitizarDestino("/admin"), null);
  assert.equal(sanitizarDestino("/admin/vagas"), null);
  assert.equal(sanitizarDestino("/login"), null);
  assert.equal(sanitizarDestino("/api/x"), null);
  assert.equal(sanitizarDestino("/termos"), null);
});

test("recusa quebra de linha, tamanho excessivo e tipos errados", () => {
  assert.equal(sanitizarDestino("/vagas/a\nSet-Cookie: x"), null);
  assert.equal(sanitizarDestino("/" + "a".repeat(250)), null);
  assert.equal(sanitizarDestino(null), null);
  assert.equal(sanitizarDestino(42), null);
});
