import { test } from "node:test";
import assert from "node:assert/strict";
import { cronAutorizado } from "../cron-auth.ts";

const req = (auth) => new Request("https://x.test/api/cron/a", { headers: auth ? { authorization: auth } : {} });

test("cron fecha sem CRON_SECRET, com segredo errado e sem cabeçalho", () => {
  const antes = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal(cronAutorizado(req("Bearer undefined")), false);
    assert.equal(cronAutorizado(req("Bearer ")), false);
    process.env.CRON_SECRET = "segredo-de-teste-com-32-caracteres!!";
    assert.equal(cronAutorizado(req()), false);
    assert.equal(cronAutorizado(req("Bearer outro")), false);
    assert.equal(cronAutorizado(req("Bearer segredo-de-teste-com-32-caracteres!!")), true);
    assert.equal(cronAutorizado(req("segredo-de-teste-com-32-caracteres!!")), false);
  } finally {
    if (antes === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = antes;
  }
});
