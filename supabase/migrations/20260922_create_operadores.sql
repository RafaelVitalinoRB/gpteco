-- ==============================================================================
-- MIGRATION: Criação da Tabela public.operadores e Habilitação de Realtime
-- SPRINT 2.5.1 — Sincronização Definitiva de Operadores
-- ==============================================================================

-- 1. Criar tabela public.operadores caso ainda não exista
CREATE TABLE IF NOT EXISTS public.operadores (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  matricula TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  maquinas_autorizadas TEXT[] DEFAULT ARRAY['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'],
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso completas (SELECT, INSERT, UPDATE, DELETE para anon e authenticated)
DROP POLICY IF EXISTS "Permitir leitura publica de operadores" ON public.operadores;
CREATE POLICY "Permitir leitura publica de operadores" 
ON public.operadores FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de operadores" ON public.operadores;
CREATE POLICY "Permitir insercao de operadores" 
ON public.operadores FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de operadores" ON public.operadores;
CREATE POLICY "Permitir atualizacao de operadores" 
ON public.operadores FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de operadores" ON public.operadores;
CREATE POLICY "Permitir exclusao de operadores" 
ON public.operadores FOR DELETE 
USING (true);

-- 4. Habilitar Supabase Realtime para transmitir eventos INSERT, UPDATE e DELETE instantaneamente
ALTER TABLE public.operadores REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'operadores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operadores;
  END IF;
END $$;

-- 5. Recarregar cache de esquemas do PostgREST
NOTIFY pgrst, 'reload schema';
