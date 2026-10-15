/**
 * Gerador mínimo de .docx (WordprocessingML) sem dependência nova: um zip
 * com três partes. Serve a documentos simples (título, parágrafos, listas).
 * Puro: devolve bytes.
 */
import { strToU8, zipSync } from "fflate";

export type BlocoDocx =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "item"; texto: string }
  | { tipo: "espaco" };

export function escaparXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Texto com quebras de linha vira runs separados por <w:br/>. */
function runs(texto: string, opcoes: { negrito?: boolean; tamanho?: number } = {}): string {
  const props =
    `<w:rPr>${opcoes.negrito ? "<w:b/>" : ""}${opcoes.tamanho ? `<w:sz w:val="${opcoes.tamanho}"/>` : ""}</w:rPr>`;
  return texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((linha, i) => `${i > 0 ? `<w:r>${props}<w:br/></w:r>` : ""}<w:r>${props}<w:t xml:space="preserve">${escaparXml(linha)}</w:t></w:r>`)
    .join("");
}

function paragrafo(b: BlocoDocx): string {
  switch (b.tipo) {
    case "titulo":
      return `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr>${runs(b.texto, { negrito: true, tamanho: 36 })}</w:p>`;
    case "subtitulo":
      return `<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>${runs(b.texto, { negrito: true, tamanho: 26 })}</w:p>`;
    case "item":
      return `<w:p><w:pPr><w:ind w:left="360" w:hanging="240"/><w:spacing w:after="60"/></w:pPr>${runs(`• ${b.texto}`)}</w:p>`;
    case "espaco":
      return "<w:p/>";
    default:
      return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>${runs(b.texto)}</w:p>`;
  }
}

export function gerarDocx(blocos: BlocoDocx[]): Uint8Array {
  const corpo = blocos.map(paragrafo).join("");
  const documento =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo}` +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`;
  const tipos =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`;
  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;
  return zipSync({
    "[Content_Types].xml": strToU8(tipos),
    "_rels/.rels": strToU8(rels),
    "word/document.xml": strToU8(documento),
  });
}

export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Nome de arquivo seguro para o cabeçalho de download. */
export function nomeDeArquivo(base: string): string {
  const limpo = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${limpo || "documento"}.docx`;
}

/** Converte um texto com linhas em branco em blocos de parágrafo. */
export function blocosDeTexto(texto: string): BlocoDocx[] {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ tipo: "paragrafo" as const, texto: p }));
}
