import { test } from "node:test";
import assert from "node:assert/strict";
import { telefoneDeJid, extrairTexto, ehPedidoDeSaida, previa, podeEnviar } from "../conversas.ts";

test("telefone a partir do JID da Evolution", () => {
  assert.equal(telefoneDeJid("5511999999999@s.whatsapp.net"), "5511999999999");
  assert.equal(telefoneDeJid("5511999999999:12@s.whatsapp.net"), "5511999999999");
  assert.equal(telefoneDeJid("120363025246125486@g.us"), null);
  assert.equal(telefoneDeJid("status@broadcast"), null);
  assert.equal(telefoneDeJid("14155550100@s.whatsapp.net"), null);
  assert.equal(telefoneDeJid(null), null);
});

test("texto da mensagem", () => {
  assert.equal(extrairTexto({ conversation: "  oi  " }), "oi");
  assert.equal(extrairTexto({ extendedTextMessage: { text: "olá" } }), "olá");
  assert.equal(extrairTexto({ imageMessage: { caption: "foto do RG" } }), "foto do RG");
  assert.equal(extrairTexto({ imageMessage: {} }), "[imagem]");
  assert.equal(extrairTexto({ audioMessage: {} }), null);
  assert.equal(extrairTexto(null), null);
});

test("pedido de saída só vale para a mensagem inteira", () => {
  assert.equal(ehPedidoDeSaida("SAIR"), true);
  assert.equal(ehPedidoDeSaida("  parar. "), true);
  assert.equal(ehPedidoDeSaida("Stop!"), true);
  assert.equal(ehPedidoDeSaida("quero sair do plantão amanhã"), false);
  assert.equal(ehPedidoDeSaida("não vou parar de procurar emprego"), false);
});

test("prévia limita o tamanho e normaliza espaços", () => {
  assert.equal(previa("a   b\n c"), "a b c");
  assert.equal(previa("x".repeat(100), 10).length, 10);
  assert.ok(previa("x".repeat(100), 10).endsWith("…"));
});

test("regra de envio: descadastro vence tudo", () => {
  const r = podeEnviar({ descadastrado: true, jaRespondeu: true, candidaturaEmAndamento: true, consentimento: true });
  assert.equal(r.ok, false);
});

test("regra de envio: precisa de relação ativa ou consentimento", () => {
  const base = { descadastrado: false, jaRespondeu: false, candidaturaEmAndamento: false, consentimento: false };
  assert.equal(podeEnviar(base).ok, false);
  assert.equal(podeEnviar({ ...base, jaRespondeu: true }).ok, true);
  assert.equal(podeEnviar({ ...base, candidaturaEmAndamento: true }).ok, true);
  assert.equal(podeEnviar({ ...base, consentimento: true }).ok, true);
});
