-- ==============================================================================
-- MIGRATION DE REFERÊNCIA: Estrutura de Estoque de Matéria-Prima por Cliente
-- SPRINT: Integração do Escritório com Matéria-Prima
-- NOTA: Arquivo de especificação arquitetural (execução manual no Supabase SQL Editor quando aprovado)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.estoque_cliente (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  fio_id BIGINT REFERENCES public.titulos_fio(id) ON DELETE SET NULL,
  fio_nome TEXT NOT NULL,
  tipo TEXT,
  cor TEXT NOT NULL,
  quantidade_caixas INTEGER NOT NULL DEFAULT 0,
  peso_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_estoque_cliente_fio_cor UNIQUE (cliente_id, fio_nome, cor)
);

-- Índices recomendados para busca de estoque
CREATE INDEX IF NOT EXISTS idx_estoque_cliente_cliente_id ON public.estoque_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_estoque_cliente_fio_nome ON public.estoque_cliente(fio_nome);

-- RLS
ALTER TABLE public.estoque_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica de estoque_cliente" ON public.estoque_cliente FOR SELECT USING (true);
CREATE POLICY "Permitir escrita autenticada de estoque_cliente" ON public.estoque_cliente FOR ALL USING (true);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
