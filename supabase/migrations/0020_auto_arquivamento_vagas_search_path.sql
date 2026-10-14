-- Fixa o search_path da função de auto-arquivamento (alerta do Supabase
-- "function_search_path_mutable"). Aplicada em produção em 14/10/2026 como
-- `auto_arquivamento_vagas_search_path`.

alter function public.arquivo_automatico_vagas() set search_path = public, pg_temp;
