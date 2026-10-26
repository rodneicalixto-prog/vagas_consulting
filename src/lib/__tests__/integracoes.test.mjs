import { test } from "node:test";
import assert from "node:assert/strict";
import {
  urlEvolutionSegura,
  instanciaValida,
  provedorValido,
  validarAcessoEmprego,
  automacaoPermitida,
  ehPlataformaDeEmprego,
  testeAutomaticoDisponivel,
} from "../integracoes.ts";

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

test("plataformas de emprego são provedores válidos e reconhecidas", () => {
  for (const p of ["vagascom", "infojobs", "linkedin"]) {
    assert.equal(provedorValido(p), true);
    assert.equal(ehPlataformaDeEmprego(p), true);
  }
  assert.equal(ehPlataformaDeEmprego("openai"), false);
});

test("acesso por login exige usuário e senha; por API exige só a chave", () => {
  const base = { provedor: "vagascom", usuario: "", segredo: "", jaTemSegredo: false };
  assert.ok(validarAcessoEmprego({ ...base, tipo: "login", segredo: "senha-longa" }));
  assert.ok(validarAcessoEmprego({ ...base, tipo: "login", usuario: "rh@empresa.com" }));
  assert.equal(validarAcessoEmprego({ ...base, tipo: "login", usuario: "rh@empresa.com", segredo: "senha-longa" }), null);
  assert.equal(validarAcessoEmprego({ ...base, tipo: "api", segredo: "chave-de-api-123" }), null);
  assert.ok(validarAcessoEmprego({ ...base, tipo: "api" }));
});

test("segredo vazio mantém o atual quando já existe um guardado", () => {
  assert.equal(
    validarAcessoEmprego({ provedor: "infojobs", tipo: "login", usuario: "rh@empresa.com", segredo: "", jaTemSegredo: true }),
    null,
  );
});

test("valores absurdos e tipo desconhecido são recusados", () => {
  assert.ok(validarAcessoEmprego({ provedor: "infojobs", tipo: "login", usuario: "rh@empresa.com", segredo: "x".repeat(401), jaTemSegredo: false }));
  assert.ok(validarAcessoEmprego({ provedor: "infojobs", tipo: "cookie", usuario: "", segredo: "abcdefgh", jaTemSegredo: false }));
  assert.ok(validarAcessoEmprego({ provedor: "openai", tipo: "api", usuario: "", segredo: "abcdefgh", jaTemSegredo: false }));
});

test("LinkedIn: usuário e senha NÃO são guardados; só token de API de parceiro", () => {
  const e = validarAcessoEmprego({ provedor: "linkedin", tipo: "login", usuario: "rh@empresa.com", segredo: "senha-longa", jaTemSegredo: false });
  assert.ok(e && /LinkedIn/.test(e));
  assert.equal(validarAcessoEmprego({ provedor: "linkedin", tipo: "api", usuario: "", segredo: "token-de-parceiro", jaTemSegredo: false }), null);
});

test("uso automático: só com marca explícita, e nunca no LinkedIn por login", () => {
  assert.equal(automacaoPermitida("vagascom", { tipo_acesso: "login" }), false);
  assert.equal(automacaoPermitida("vagascom", { tipo_acesso: "login", automacao: "sim" }), true);
  assert.equal(automacaoPermitida("vagascom", null), false);
  assert.equal(automacaoPermitida("linkedin", { tipo_acesso: "login", automacao: "sim" }), false);
  assert.equal(automacaoPermitida("linkedin", { tipo_acesso: "api", automacao: "sim" }), true);
  assert.equal(automacaoPermitida("openai", { automacao: "sim" }), false);
});

test("teste de conexão automático não existe para plataformas de emprego", () => {
  assert.equal(testeAutomaticoDisponivel("vagascom"), false);
  assert.equal(testeAutomaticoDisponivel("openai"), true);
});
