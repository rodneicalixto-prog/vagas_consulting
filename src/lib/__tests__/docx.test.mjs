import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { gerarDocx, escaparXml, nomeDeArquivo, blocosDeTexto, MIME_DOCX } from "../docx.ts";

test("docx tem as três partes obrigatórias e o texto escapado", () => {
  const bytes = gerarDocx([
    { tipo: "titulo", texto: "Carta <oferta> & cia" },
    { tipo: "paragrafo", texto: "Linha 1\nLinha 2" },
    { tipo: "item", texto: "Benefício \"VR\"" },
  ]);
  assert.equal(bytes[0], 0x50); // "P" de PK
  const z = unzipSync(bytes);
  assert.deepEqual(Object.keys(z).sort(), ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]);
  const doc = strFromU8(z["word/document.xml"]);
  assert.ok(doc.includes("Carta &lt;oferta&gt; &amp; cia"));
  assert.ok(doc.includes("<w:br/>"));
  assert.ok(doc.includes("Benefício &quot;VR&quot;"));
  assert.ok(strFromU8(z["[Content_Types].xml"]).includes("wordprocessingml.document.main+xml"));
});

test("escape remove caracteres de controle e nome de arquivo é seguro", () => {
  assert.equal(escaparXml("a\u0001b<c"), "ab&lt;c");
  assert.equal(nomeDeArquivo("Carta-oferta: João/Silva?"), "Carta-oferta-Joao-Silva.docx");
  assert.equal(nomeDeArquivo("???"), "documento.docx");
  assert.ok(MIME_DOCX.includes("wordprocessingml"));
});

test("texto com linhas em branco vira parágrafos", () => {
  const b = blocosDeTexto("a\nb\n\n\nc");
  assert.equal(b.length, 2);
  assert.equal(b[0].texto, "a\nb");
});
