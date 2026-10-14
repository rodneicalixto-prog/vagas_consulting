# Backup do banco — segunda cópia no Google Drive

> **Projeto:** Vagas Consulting · **Documento:** Rotina de backup v1.0 · **Data:** 14/10/2026 · **Origem:** requisito do Rodnei (TRD, "segunda cópia do banco")

## O que faz

Exporta **todas** as tabelas do schema `public` (via API do Supabase, com a
service role), compacta em um único `.json.gz` e envia para o Google Drive,
pasta **Backups Vagas Consulting**. Guarda 8 cópias locais e 90 dias no Drive.
O script nunca imprime dados — só nomes de tabela e contagens.

Cobre **dados**. O schema (tabelas, funções, RLS) está nas migrations em
`supabase/migrations/` e no Git.

## Preparação (uma vez, no computador do Rodnei)

1. **Instalar o rclone** (PowerShell): `winget install Rclone.Rclone`
2. **Conectar ao Drive:** `rclone config` → `n` (new remote) → nome `gdrive`
   → tipo `drive` → aceitar os padrões → no navegador, entrar com
   `rodneicalixto@gmail.com` e autorizar. (Login feito por você, no navegador.)
3. **Chaves:** em `.env.local` (nunca vai para o Git) devem existir
   `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. A service role
   fica em Supabase Studio → Project Settings → API.
4. **Teste manual**, na raiz do projeto:

   ```powershell
   node --env-file=.env.local scripts/backup/backup-vagas.mjs
   ```

   Saída esperada: uma linha por tabela, `Arquivo: backups\vagas-consulting_….json.gz`
   e `Enviado para gdrive:Backups Vagas Consulting`.

## Agendar (semanal, domingo 03:00)

```powershell
schtasks /Create /SC WEEKLY /D SUN /ST 03:00 /TN "Backup Vagas Consulting" `
  /TR "cmd /c cd /d C:\Users\USER\Desktop\Vagas Consulting\vagas_consulting && node --env-file=.env.local scripts\backup\backup-vagas.mjs >> backups\log.txt 2>&1"
```

O computador precisa estar ligado nesse horário. Se não estiver, a tarefa
roda na próxima inicialização (ative "executar assim que possível" nas
propriedades da tarefa).

## Verificar um backup (rápido, sem restaurar)

```powershell
node --env-file=.env.local scripts/backup/verify-backup.mjs
```

Abre o `.json.gz` mais recente de `backups\`, valida a estrutura e compara a
contagem de linhas de cada tabela com o banco ao vivo (o banco pode ter mais
linhas que o backup, nunca menos). Resultado esperado: `RESULTADO: backup
íntegro.` Não substitui o teste de restauração abaixo.

## Restaurar (teste a cada 3 meses)

1. Baixar o `.json.gz` do Drive e descompactar (`7z x` ou `gzip -d`).
2. O arquivo é `{ projeto, gerado_em, tabelas: { <tabela>: [linhas…] } }`.
3. Recriar o schema com as migrations (`supabase/migrations/0001…0020`) em um
   projeto Supabase novo e inserir as linhas de cada tabela, na ordem de
   dependência (`profiles` → `companies` → `jobs` → `applications` …).
4. **Um backup que nunca foi restaurado não é backup:** faça o teste em um
   projeto Supabase descartável e registre o resultado em `PROJETO.md`.

## Lições da primeira configuração (14/10/2026)

- **Conta errada = `storageQuotaExceeded`.** O navegador padrão do Windows
  pode estar logado em outra conta Google (cheia). Confira com
  `rclone about gdrive:`: `Free: off` significa conta sem espaço.
  Reconecte com `rclone config reconnect gdrive:`; se o navegador abrir na
  conta errada, copie o link `http://127.0.0.1:53682/auth?...` do
  PowerShell e cole no Chrome da conta certa.
- **Escopo `drive.file`:** ao reconectar, o rclone tenta listar Drives
  compartilhados e mostra `ACCESS_TOKEN_SCOPE_INSUFFICIENT`. É inofensivo;
  o token já foi salvo. Confirme com `rclone about gdrive:`.
- **Aviso do `client_id` compartilhado:** o rclone avisa que o `client_id`
  dele será aposentado em 2026. Se o envio parar de funcionar, crie um
  `client_id` próprio no Google Cloud (grátis).
- **Conta usada:** a conta autorizada no rclone em 14/10/2026 é `sosmktcomercial@gmail.com` e tinha 15 GiB
  com 13,6 GiB livres. Primeiro envio bem-sucedido em 14/10/2026 às 14:23.

## Limites conhecidos

- **Auth:** `auth.users` (e-mails/senhas) não está no schema `public` e **não
  é exportado**. Em desastre total, candidatos precisariam recriar o acesso
  (recuperação de senha ainda não existe no app — ver backlog).
- **Storage:** arquivos (currículos) não são copiados por este script.
- Contém dados pessoais (LGPD): o Drive deve continuar privado.
