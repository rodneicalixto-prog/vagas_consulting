import { test } from "node:test";
import assert from "node:assert/strict";
import { urlEvolutionSegura, instanciaValida, provedorValido } from "../integracoes.ts";

test("URL da Evolution: aceita https público", () => {
  assert.equal(urlEvolutionSegura("https://evolution.exemplo.com.br"), "https://evolution.exemplo.com.br");
  assert.equal(urlEvolutionSegura("https://evolution.exemplo.com.br/qualquer/caminho?x=1"), "https://evolution.exemplo.com.br");
  assert.equal(urlEvolutionSegura("https://api.exemplo.com:8443"), "https://api.exemplo.com:8443");
});

test("URL da Evolution: recusa http, IP interno, localhost e credenciais", () => {
  assert.equal(urlEvolutionSegura("http://evolution.exemplo.com.br"), null);
  assert.equal(urlEvolutionSegura("https://localhost"), null);
  assert.equal(urlEvolutionSegura("https://app.localhost"), null);
  assert.equal(urlEvolutionSegura("https://127.0.0.1"), null);
  assert.equal(urlEvolutionSegura("https://10.0.0.5"), null);
  assert.equal(urlEvolutionSegura("https://192.168.1.10"), null);
  assert.equal(urlEvolutionSegura("https://172.20.0.1"), null);
  assert.equal(urlEvolutionSegura("https://169.254.169.254"), null);
  assert.equal(urlEvolutionSegura("https://[::1]"), null);
  assert.equal(urlEvolutionSegura("https://user:pass@evolution.exemplo.com"), null);
  assert.equal(urlEvolutionSegura("ftp://evolution.exemplo.com"), null);
  assert.equal(urlEvolutionSegura("não é url"), null);
});

test("IP público próximo das faixas privadas é aceito", () => {
  assert.equal(urlEvolutionSegura("https://172.32.0.1"), "https://172.32.0.1");
  assert.equal(urlEvolutionSegura("https://11.0.0.1"), "https://11.0.0.1");
});

test("nome de instância", () => {
  assert.equal(instanciaValida("rh_linha_02"), true);
  assert.equal(instanciaValida("empresa-a"), true);
  assert.equal(instanciaValida("a"), false);
  assert.equal(instanciaValida("com espaço"), false);
  assert.equal(instanciaValida("../x"), false);
});

test("provedores válidos", () => {
  for (const p of ["openai", "anthropic", "groq", "resend", "sms", "telegram", "evolution"]) {
    assert.equal(provedorValido(p), true);
  }
  assert.equal(provedorValido("gemini"), false);
  assert.equal(provedorValido(null), false);
});
