import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra segredos (chaves de API) com AES-256-GCM.
 * A chave-mestra vem de INTEGRATIONS_ENCRYPTION_KEY (32 bytes em base64) e
 * nunca é gravada no repositório nem no banco.
 */
const VERSAO = "v1";

export class ChaveMestraAusente extends Error {
  constructor() {
    super("A chave-mestra de criptografia não está configurada no servidor.");
  }
}

function chaveMestra(): Buffer {
  const bruta = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!bruta) throw new ChaveMestraAusente();
  const chave = Buffer.from(bruta, "base64");
  if (chave.length !== 32) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY deve ter exatamente 32 bytes em base64.");
  }
  return chave;
}

export function chaveMestraConfigurada(): boolean {
  try {
    chaveMestra();
    return true;
  } catch {
    return false;
  }
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chaveMestra(), iv);
  const ct = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSAO, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decifrar(valor: string): string {
  const [versao, iv, tag, ct] = valor.split(":");
  if (versao !== VERSAO || !iv || !tag || !ct) throw new Error("Segredo em formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", chaveMestra(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

/** Últimos 4 caracteres, para exibição mascarada. */
export function ultimos4(texto: string): string {
  return texto.slice(-4);
}
