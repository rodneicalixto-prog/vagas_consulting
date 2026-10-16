/**
 * Gera o índice do assistente de ajuda a partir do manual (docs/manual/**).
 * Determinístico: sem datas, para o teste detectar índice desatualizado.
 * Uso: npm run ajuda:indice
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANUAL = join(RAIZ, "docs", "manual");
const SAIDA = join(RAIZ, "src", "lib", "ajuda", "indice.json");

const IGNORAR_ARQUIVOS = new Set(["README.md", "CHANGELOG.md", "CONFERENCIA.md"]);
const IGNORAR_SECOES = [/^tópicos a escrever/i, /^fontes para escrever/i, /^para validar/i, /^veja também/i];
const MAX_TEXTO = 1800;
const TODOS = ["operador", "admin_empresa", "admin", "superadmin"];

/** Quem pode receber o conteúdo de cada arquivo (papéis internos). */
export function papeisDoArquivo(arq) {
  if (arq.startsWith("apendices/")) return TODOS;
  if (arq.startsWith("05-plataforma")) return ["admin", "superadmin"];
  if (arq.startsWith("04-admin-empresa")) return ["admin_empresa", "admin", "superadmin"];
  if (arq.startsWith("01-candidato")) return TODOS;
  return TODOS;
}

function listar(dir) {
  const out = [];
  for (const nome of readdirSync(dir).sort()) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listar(p));
    else if (nome.endsWith(".md") && !IGNORAR_ARQUIVOS.has(nome)) out.push(p);
  }
  return out;
}

function estadoDe(texto) {
  const m = texto.match(/\*\*Estado:\*\*\s*([^\n]+)/i);
  const linha = (m ? m[1] : "").toLowerCase();
  if (linha.includes("validado") && !linha.includes("rascunho")) return "validado";
  if (linha.includes("esqueleto") && !linha.includes("rascunho")) return "esqueleto";
  return "rascunho";
}

function limpar(s) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/^>.*$/gm, (l) => (l.includes("**Estado:**") ? "" : l.replace(/^>\s?/, "")))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cortar(s) {
  if (s.length <= MAX_TEXTO) return s;
  const corte = s.lastIndexOf("\n", MAX_TEXTO);
  return `${s.slice(0, corte > 600 ? corte : MAX_TEXTO).trim()}\n…`;
}

function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function gerarIndice(manualDir = MANUAL) {
  const pedacos = [];
  for (const caminho of listar(manualDir)) {
    const arq = relative(manualDir, caminho).split(sep).join("/").replace(/\.md$/, "");
    const bruto = readFileSync(caminho, "utf8").replace(/\r\n/g, "\n");
    const estado = estadoDe(bruto);
    if (estado === "esqueleto") continue;
    const capitulo = (bruto.match(/^#\s+(.+)$/m) ?? [null, arq])[1].trim();
    const papeis = papeisDoArquivo(arq);

    if (arq === "apendices/glossario") {
      // Um pedaço por termo: "**Termo.** definição".
      for (const par of bruto.split(/\n\n+/)) {
        const m = par.trim().match(/^\*\*([^*]+?)\.\*\*\s+([\s\S]+)$/);
        if (!m) continue;
        pedacos.push({
          id: `${arq}#${slug(m[1])}`,
          arquivo: arq,
          capitulo,
          titulo: m[1].trim(),
          texto: cortar(`${m[1].trim()}: ${m[2].replace(/\n/g, " ").trim()}`),
          papeis,
          estado,
        });
      }
      continue;
    }

    const partes = bruto.split(/^(?=##{1,2} )/m);
    for (const parte of partes) {
      const cab = parte.match(/^##{1,2} (.+)$/m);
      if (!cab) continue; // introdução do arquivo
      const titulo = cab[1].trim();
      if (IGNORAR_SECOES.some((re) => re.test(titulo))) continue;
      const texto = limpar(parte.replace(/^##{1,2} .+\n?/, ""));
      if (texto.length < 40) continue;
      pedacos.push({
        id: `${arq}#${slug(titulo)}`,
        arquivo: arq,
        capitulo,
        titulo,
        texto: cortar(texto),
        papeis,
        estado,
      });
    }
  }
  const versao = createHash("sha256").update(JSON.stringify(pedacos)).digest("hex").slice(0, 12);
  return { versao, pedacos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const indice = gerarIndice();
  writeFileSync(SAIDA, `${JSON.stringify(indice, null, 1)}\n`, "utf8");
  console.log(`Índice do assistente: ${indice.pedacos.length} pedaços (versão ${indice.versao}).`);
}
