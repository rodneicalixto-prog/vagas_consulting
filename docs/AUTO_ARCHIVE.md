# Auto-Arquivamento de Vagas Expiradas

## O Quê

Sistema automático que **arquiva vagas** cuja data de expiração (`expira_em`) já passou. Vagas arquivadas ficam com `status = 'arquivada'` e desaparecem de listagens públicas/de candidatos.

## Quando

- **Diariamente** às **02:00 AM UTC** (2hs da manhã, em Cron: `0 2 * * *`)
- Configurado em `vercel.json` → Edge Function `/api/cron/archive-jobs`

## Como Funciona

```
1. Vercel Cron chama GET /api/cron/archive-jobs (sem chamada manual necessária)
2. Valida Authorization header com CRON_SECRET
3. Chama função Supabase: arquivo_automatico_vagas()
4. Função SQL executa:
   UPDATE jobs SET status = 'arquivada', updated_at = NOW()
   WHERE status = 'publicada' AND expira_em IS NOT NULL AND expira_em <= NOW()
5. Retorna lista de vagas arquivadas (debug/logs)
```

## Setup

### 1. Variável de Ambiente

Adicione a `CRON_SECRET` ao `.env.production` (Vercel):

```bash
CRON_SECRET=seu-token-securo-aleatorio-muito-longo
```

Gere um token forte:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Migração Supabase

A migração `0018_auto_arquivamento_vagas.sql` já:
- ✅ Adiciona novo status `'arquivada'` ao enum `status_vaga`
- ✅ Adiciona coluna `expira_em timestamp` à tabela `jobs`
- ✅ Cria índice `jobs_expira_em_idx` pra performance
- ✅ Define função `arquivo_automatico_vagas()`

Aplicar:
```bash
supabase db push
```

### 3. Deployar na Vercel

O arquivo `vercel.json` declara a rota do Cron. Ao fazer push → Vercel lê `vercel.json` e agenda o job automaticamente.

Confirme o agendamento em Vercel Dashboard → Settings → Crons.

## Usar Manualmente

Pra arquivar vagas **agora** (sem esperar o cron):

```sql
-- Diretamente no Supabase SQL Editor
SELECT * FROM arquivo_automatico_vagas();
```

Ou via URL de admin (se habilitado):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://vagas-consulting-umber.vercel.app/api/cron/archive-jobs
```

## Campos Obrigatórios

Pra que o auto-arquivamento funcione:

| Campo | Tipo | Obrigatório? | Exemplo |
|---|---|---|---|
| `id` | uuid | ✅ | UUID auto-gerado |
| `status` | enum | ✅ | `'publicada'` |
| `expira_em` | timestamp | ❌ | `2026-12-31 23:59:59+00` |

**Regra:** vagas SEM `expira_em` **nunca** serão arquivadas automaticamente. Apenas vagas com `expira_em <= NOW()` e `status = 'publicada'`.

## Respostas do Cron

### Sucesso (200)
```json
{
  "success": true,
  "archived_count": 3,
  "archived": [
    { "id": "uuid-1", "titulo": "Vaga A", "status_novo": "arquivada" },
    { "id": "uuid-2", "titulo": "Vaga B", "status_novo": "arquivada" },
    { "id": "uuid-3", "titulo": "Vaga C", "status_novo": "arquivada" }
  ],
  "timestamp": "2026-09-22T02:00:15.123Z"
}
```

### Erro de Autorização (401)
```json
{ "error": "Unauthorized" }
```

### Erro no Banco (500)
```json
{
  "error": "Erro ao executar arquivo automático",
  "details": { "message": "...", "code": "..." }
}
```

## Troubleshooting

| Problema | Solução |
|---|---|
| Vagas não estão sendo arquivadas | (1) Verificar se `expira_em` está definido; (2) Verificar se `status = 'publicada'`; (3) Testar manualmente via SQL |
| `Unauthorized` no logs | `CRON_SECRET` não está configurada na Vercel ou não bate com o header |
| Função SQL não encontrada | Migração não foi aplicada (`supabase db push`) |
| Cron não está rodando | Verificar em Vercel Dashboard → Deployments → Crons; confirmar `vercel.json` está no root |

## Próximas Melhorias

- [ ] Notificar empresa quando vaga é arquivada
- [ ] Reativar vaga expirada (btn "Estender prazo")
- [ ] Dashboard → Vagas expiradas próximamente (warning com dias restantes)
- [ ] Histórico de arquivo (audit log)

---

**Última atualização:** 2026-09-22 · Função: `arquivo_automatico_vagas()` · Rota: `/api/cron/archive-jobs`
