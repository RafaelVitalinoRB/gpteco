-- ==============================================================================
-- MIGRATION: Alinhamento Definitivo da Tabela public.ordens_producao com o Frontend
-- Descrição: Adiciona colunas faltantes que causavam erro "Could not find column ... in schema cache"
-- ==============================================================================

-- 1. Coluna de Observações de Produção enviada pelo formulário de criação/edição da OP (src/pages/Programador/OPs.tsx)
ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS observacoes_producao TEXT;

-- 2. Colunas complementares utilizadas pelo fluxo operacional e rastreabilidade (src/pages/Operador/Dashboard.tsx)
ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS inicio TIMESTAMPTZ;

ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS fim TIMESTAMPTZ;

ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS maquina_preparacao TEXT;

ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS rolo_desenho TEXT;

ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 3. Atualizar o cache de esquemas do PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
