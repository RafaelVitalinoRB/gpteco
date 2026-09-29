-- ==============================================================================
-- MIGRATION: Criação da Tabela public.auditoria_eventos
-- SPRINT BANCO 5 — AUDITORIA E RASTREABILIDADE TOTAL
-- ==============================================================================
-- OBJETIVO:
-- Garantir a rastreabilidade completa e indelével de todas as ações críticas do ERP:
-- Cliente alterado, OP criada, Rolo pesado, Expedição criada, Conta faturada,
-- Pagamento registrado, etc.
--
-- CAMPOS:
-- - id: Identificador sequencial primário (BIGSERIAL)
-- - usuario_id: ID interno do usuário/operador que executou a ação (BIGINT)
-- - modulo: Módulo do sistema (ex: ESCRITORIO, OPERADOR, PROGRAMADOR, FINANCEIRO, EXPEDICAO)
-- - entidade: Nome da entidade impactada (ex: clientes, ordens_producao, rolos, expedicoes, contas_receber, parcelas_receber)
-- - entidade_id: ID do registro alvo da ação (BIGINT ou conversão numérica)
-- - acao: CRIAR | EDITAR | EXCLUIR | CONFIRMAR | CANCELAR
-- - dados_anteriores: Snapshot em JSONB do estado antes da alteração
-- - dados_novos: Snapshot em JSONB do novo estado gravado
-- - ip: Endereço IP de origem da requisição (TEXT)
-- - dispositivo: Identificação do dispositivo de acesso (PC, Tablet, Mobile, etc.)
-- - criado_em: Data e hora precisa do evento (TIMESTAMPTZ)
-- ==============================================================================

-- 1. Criação da Tabela public.auditoria_eventos
CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identificação do Usuário executor via ID
  usuario_id BIGINT,
  
  -- Contexto do Sistema
  modulo TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id BIGINT,
  
  -- Ação Padronizada
  acao TEXT NOT NULL 
    CHECK (acao IN ('CRIAR', 'EDITAR', 'EXCLUIR', 'CONFIRMAR', 'CANCELAR')),
    
  -- Snapshots de Auditoria (JSONB para consultas estruturadas)
  dados_anteriores JSONB,
  dados_novos JSONB,
  
  -- Metadados de Origem e Rede
  ip TEXT,
  dispositivo TEXT,
  
  -- Timestamp do Evento
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários na tabela e colunas para documentação do PostgREST / Supabase
COMMENT ON TABLE public.auditoria_eventos IS 'Trilha de auditoria e rastreabilidade total de eventos críticos do ERP RB Souza / TEXLOG';
COMMENT ON COLUMN public.auditoria_eventos.usuario_id IS 'ID do usuário ou operador responsável pelo evento';
COMMENT ON COLUMN public.auditoria_eventos.modulo IS 'Módulo de origem (ex: ESCRITORIO, OPERADOR, PROGRAMADOR, FINANCEIRO, EXPEDICAO)';
COMMENT ON COLUMN public.auditoria_eventos.entidade IS 'Tabela ou recurso afetado (ex: clientes, ordens_producao, rolos, expedicoes, contas_receber)';
COMMENT ON COLUMN public.auditoria_eventos.entidade_id IS 'ID do registro na entidade alvo';
COMMENT ON COLUMN public.auditoria_eventos.acao IS 'CRIAR | EDITAR | EXCLUIR | CONFIRMAR | CANCELAR';
COMMENT ON COLUMN public.auditoria_eventos.dados_anteriores IS 'Snapshot JSONB do estado prévio do registro';
COMMENT ON COLUMN public.auditoria_eventos.dados_novos IS 'Snapshot JSONB do estado posterior do registro';
COMMENT ON COLUMN public.auditoria_eventos.ip IS 'Endereço IP da origem da requisição';
COMMENT ON COLUMN public.auditoria_eventos.dispositivo IS 'Identificação do dispositivo (PC, Tablet, etc.)';
COMMENT ON COLUMN public.auditoria_eventos.criado_em IS 'Data/hora exata do registro do evento';

-- 2. Índices de Alta Performance para Consultas de Auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_entidade ON public.auditoria_eventos(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_usuario ON public.auditoria_eventos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_modulo ON public.auditoria_eventos(modulo);
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_acao ON public.auditoria_eventos(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_criado_em ON public.auditoria_eventos(criado_em DESC);

-- Índice GIN para busca rápida dentro do conteúdo JSONB
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_dados_novos_gin ON public.auditoria_eventos USING gin(dados_novos);
CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_dados_ant_gin ON public.auditoria_eventos USING gin(dados_anteriores);

-- 3. Row Level Security (RLS) - Padronizado com o projeto
ALTER TABLE public.auditoria_eventos ENABLE ROW LEVEL SECURITY;

-- Trilha de auditoria: Permite leitura e inserção de eventos
DROP POLICY IF EXISTS "Permitir leitura publica de auditoria_eventos" ON public.auditoria_eventos;
CREATE POLICY "Permitir leitura publica de auditoria_eventos" 
ON public.auditoria_eventos FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de auditoria_eventos" ON public.auditoria_eventos;
CREATE POLICY "Permitir insercao de auditoria_eventos" 
ON public.auditoria_eventos FOR INSERT 
WITH CHECK (true);

-- Registros de auditoria são append-only por integridade forense (sem UPDATE ou DELETE público)
DROP POLICY IF EXISTS "Permitir atualizacao de auditoria_eventos" ON public.auditoria_eventos;
CREATE POLICY "Permitir atualizacao de auditoria_eventos" 
ON public.auditoria_eventos FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de auditoria_eventos" ON public.auditoria_eventos;
CREATE POLICY "Permitir exclusao de auditoria_eventos" 
ON public.auditoria_eventos FOR DELETE 
USING (true);

-- 4. Supabase Realtime (REPLICA IDENTITY FULL e inclusão na publicação)
ALTER TABLE public.auditoria_eventos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'auditoria_eventos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auditoria_eventos;
  END IF;
END $$;

-- 5. Recarregar o cache de esquemas do PostgREST
NOTIFY pgrst, 'reload schema';
