import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tipoDoAnexo,
  nomeSeguro,
  extensaoDoMime,
  rotuloAnexo,
  detectarMidia,
  TAMANHO_MAX_ANEXO,
  TAMANHO_MAX_ENVIO,
  podeEnviar,
} from "../conversas.ts";

test("tipos permitidos e bloqueados", () => {
  assert.equal(tipoDoAnexo("image/jpeg"), "imagem");
  assert.equal(tipoDoAnexo("application/pdf"), "documento");
  assert.equal(tipoDoAnexo("audio/ogg; codecs=opus"), "audio");
  assert.equal(tipoDoAnexo("video/mp4"), "video");
  // Executáveis, scripts e HTML nunca passam.
  assert.equal(tipoDoAnexo("application/x-msdownload"), null);
  assert.equal(tipoDoAnexo("text/html"), null);
  assert.equal(tipoDoAnexo("image/svg+xml"), null);
  assert.equal(tipoDoAnexo("application/zip"), null);
  assert.equal(tipoDoAnexo(null), null);
});

test("nome de arquivo seguro para o caminho", () => {
  assert.equal(nomeSeguro("Currículo João (final).pdf"), "Curriculo_Joao_final_.pdf");
  assert.equal(nomeSeguro("../../etc/passwd"), "etc_passwd");
  assert.equal(nomeSeguro(""), "arquivo");
  assert.equal(nomeSeguro(null), "arquivo");
  assert.ok(nomeSeguro("a".repeat(300)).length <= 80);
});

test("extensão por mime e rótulo da prévia", () => {
  assert.equal(extensaoDoMime("image/jpeg"), "jpg");
  assert.equal(extensaoDoMime("algo/estranho"), "bin");
  assert.equal(rotuloAnexo("imagem"), "📷 Imagem");
  assert.equal(rotuloAnexo("documento", "rg.pdf"), "📎 rg.pdf");
  assert.equal(rotuloAnexo("imagem", null, "foto do RG"), "foto do RG");
  assert.equal(TAMANHO_MAX_ANEXO, 15 * 1024 * 1024);
});

test("detecta mídia recebida da Evolution", () => {
  const audio = detectarMidia({ audioMessage: { mimetype: "audio/ogg; codecs=opus", ptt: true } });
  assert.equal(audio.tipo, "audio");
  assert.equal(tipoDoAnexo(audio.mime), "audio");
  const doc = detectarMidia({
    documentWithCaptionMessage: { message: { documentMessage: { mimetype: "application/pdf", fileName: "cv.pdf", caption: "meu currículo" } } },
  });
  assert.equal(doc.tipo, "documento");
  assert.equal(doc.nome, "cv.pdf");
  assert.equal(doc.legenda, "meu currículo");
  assert.equal(detectarMidia({ conversation: "oi" }), null);
  assert.equal(detectarMidia(null), null);
  assert.equal(tipoDoAnexo("audio/webm;codecs=opus"), "audio");
  assert.equal(TAMANHO_MAX_ENVIO, 4 * 1024 * 1024);
});

test("contato de empresa cliente libera o envio, exceto descadastro", () => {
  const base = { descadastrado: false, jaRespondeu: false, candidaturaEmAndamento: false, consentimento: false };
  assert.equal(podeEnviar(base).ok, false);
  assert.equal(podeEnviar({ ...base, contatoDeCliente: true }).ok, true);
  assert.equal(podeEnviar({ ...base, contatoDeCliente: true, descadastrado: true }).ok, false);
});
