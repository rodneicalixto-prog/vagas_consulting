import { test } from "node:test";
import assert from "node:assert/strict";
import {
  modoPadrao,
  nomeDaInstancia,
  validarApelido,
  podeCriarLinha,
  estadoDaConexao,
  numeroDoJid,
  corpoDoWebhook,
  qrSeguro,
} from "../linhas.ts";

test("linha dedicada começa em sugestão; compartilhada em automático", () => {
  assert.equal(modoPadrao("u1"), "sugestao");
  assert.equal(modoPadrao(null), "automatico");
});

test("nome da instância: sem acento, sem caracteres inválidos e dentro do limite", () => {
  const n = nomeDaInstancia("Athenas Serviços Ltda.", "RH da Ana / SP", "k3f9");
  assert.equal(n, "athenas-servicos-l-rh-da-ana-sp-k3f9");
  assert.ok(/^[a-z0-9-]{2,60}$/.test(n));
  assert.ok(nomeDaInstancia("A".repeat(80), "B".repeat(80), "zzzzzz").length <= 60);
  assert.ok(nomeDaInstancia("!!!", "???", "ab12").startsWith("linha-"));
});

test("apelido válido", () => {
  assert.ok(validarApelido("a"));
  assert.ok(validarApelido("x".repeat(41)));
  assert.equal(validarApelido("RH Ana"), null);
});

test("limite de números: admin da empresa respeita, superadmin não", () => {
  assert.equal(podeCriarLinha({ role: "admin_empresa", ativas: 6, max: 6 }).ok, false);
  assert.equal(podeCriarLinha({ role: "admin_empresa", ativas: 5, max: 6 }).ok, true);
  assert.equal(podeCriarLinha({ role: "superadmin", ativas: 99, max: 1 }).ok, true);
});

test("estado da conexão e número do JID", () => {
  assert.equal(estadoDaConexao("open"), "conectada");
  assert.equal(estadoDaConexao("connecting"), "conectando");
  assert.equal(estadoDaConexao("close"), "desconectada");
  assert.equal(estadoDaConexao(undefined), "desconhecido");
  assert.equal(numeroDoJid("5511967128359:12@s.whatsapp.net"), "5511967128359");
  assert.equal(numeroDoJid("abc"), null);
});

test("webhook com os dois eventos e QR só aceita PNG base64", () => {
  const w = corpoDoWebhook("https://x.com/api/webhooks/evolution");
  assert.deepEqual(w.webhook.events, ["MESSAGES_UPSERT", "MESSAGES_UPDATE"]);
  assert.equal(w.webhook.enabled, true);
  const ok = "data:image/png;base64," + "A".repeat(200);
  assert.equal(qrSeguro(ok), ok);
  assert.equal(qrSeguro("javascript:alert(1)"), null);
  assert.equal(qrSeguro("data:image/svg+xml;base64,AAAA"), null);
});
