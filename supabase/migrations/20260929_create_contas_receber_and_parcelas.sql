-- ==============================================================================
-- MIGRATION: Criação das Tabelas public.contas_receber e public.parcelas_receber
-- SPRINT BANCO 3 — CONTAS A RECEBER
-- ==============================================================================
-- OBJETIVO:
-- Controlar os valores a receber devidos pelos clientes originados de uma Expedição.
-- Fluxo Relacional:
-- EXPEDICOES (1) ────< (N) CONTAS_RECEBER (1) ────< (N) PARCELAS_RECEBER
--
-- DIRETRIZES:
-- 1. IDs como chave de relacionamento exclusiva (expedicao_id, cliente_id, conta_receber_id).
-- 2. numero_documento é apenas identificador de negócio legível.
-- 3. Sem vínculo direto com Rolos (a cobrança se dá pela Carga/Expedição consolidada).
-- 4. Formas e Condições de Pagamento padronizadas.
-- 5. RLS, Índices de Performance e Supabase Realtime habilitados.
-- ==============================================================================

-- 1. Tabela public.contas_receber (Cobrança originada de uma Expedição)
CREATE TABLE IF NOT EXISTS public.contas_receber (
  id BIGSERIAL PRIMARY KEY,
  numero_documento TEXT NOT NULL,
  
  -- Relacionamentos obrigatórios via IDs internos
  expedicao_id BIGINT NOT NULL REFERENCES public.expedicoes(id) ON DELETE RESTRICT,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  
  -- Valores financeiros (padronizados com 2 casas decimais)
  valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  valor_recebido NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  valor_saldo NUMERIC(12, 2) GENERATED ALWAYS AS (valor_total - valor_recebido) STORED,
  
  -- Condição Comercial
  forma_pagamento TEXT NOT NULL DEFAULT 'PIX'
    CHECK (forma_pagamento IN (
      'PIX',
      'BOLETO',
      'CHEQUE',
      'DEPOSITO',
      'TRANSFERENCIA',
      'DINHEIRO',
      'OUTRO'
    )),
    
  condicao_pagamento TEXT NOT NULL DEFAULT 'A_VISTA'
    CHECK (condicao_pagamento IN (
      'A_VISTA',
      '28_DIAS',
      '30_DIAS',
      '30_60',
      '30_60_90',
      'PERSONALIZADO'
    )),
    
  -- Situação / Status da Conta a Receber
  status TEXT NOT NULL DEFAULT 'EM_ABERTO'
    CHECK (status IN (
      'EM_ABERTO',
      'PARCIAL',
      'RECEBIDO',
      'CANCELADO'
    )),
    
  -- Datas de controle
  vencimento_primeira_parcela DATE,
  recebido_em TIMESTAMPTZ,
  observacoes TEXT,
  
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários na tabela contas_receber
COMMENT ON TABLE public.contas_receber IS 'Controle de valores a receber originados exclusivamente de expedições (RB Souza / TEXLOG)';
COMMENT ON COLUMN public.contas_receber.numero_documento IS 'Identificador de negócio legível (ex: FAT-2026-0001, DOC-0001)';
COMMENT ON COLUMN public.contas_receber.expedicao_id IS 'FK obrigatória da expedição que originou esta cobrança';
COMMENT ON COLUMN public.contas_receber.cliente_id IS 'FK obrigatória do cliente sacado / devedor';
COMMENT ON COLUMN public.contas_receber.status IS 'EM_ABERTO | PARCIAL | RECEBIDO | CANCELADO';

-- 2. Tabela public.parcelas_receber (Parcelas vinculadas à conta a receber)
CREATE TABLE IF NOT EXISTS public.parcelas_receber (
  id BIGSERIAL PRIMARY KEY,
  
  -- Relacionamento obrigatório com a conta principal via ID interno
  conta_receber_id BIGINT NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  
  numero_parcela INTEGER NOT NULL DEFAULT 1,
  vencimento DATE NOT NULL,
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  valor_pago NUMERIC(12, 2) DEFAULT 0.00,
  pago_em TIMESTAMPTZ,
  
  -- Status da Parcela
  status TEXT NOT NULL DEFAULT 'EM_ABERTO'
    CHECK (status IN (
      'EM_ABERTO',
      'PAGO',
      'ATRASADO',
      'CANCELADO'
    )),
    
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários na tabela parcelas_receber
COMMENT ON TABLE public.parcelas_receber IS 'Parcelas de vencimento associadas a uma conta a receber';
COMMENT ON COLUMN public.parcelas_receber.conta_receber_id IS 'FK para contas_receber';
COMMENT ON COLUMN public.parcelas_receber.numero_parcela IS 'Número ordinal da parcela (1, 2, 3...)';
COMMENT ON COLUMN public.parcelas_receber.status IS 'EM_ABERTO | PAGO | ATRASADO | CANCELADO';

-- Regra de Unicidade: cada conta tem parcelas com número sequencial único
CREATE UNIQUE INDEX IF NOT EXISTS uq_parcelas_receber_conta_numero 
ON public.parcelas_receber (conta_receber_id, numero_parcela);

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente_id ON public.contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_expedicao_id ON public.contas_receber(expedicao_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON public.contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON public.contas_receber(vencimento_primeira_parcela);
CREATE INDEX IF NOT EXISTS idx_contas_receber_criado_em ON public.contas_receber(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_contas_receber_numero_doc ON public.contas_receber(numero_documento);

CREATE INDEX IF NOT EXISTS idx_parcelas_receber_conta_id ON public.parcelas_receber(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_receber_vencimento ON public.parcelas_receber(vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_receber_status ON public.parcelas_receber(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_receber_criado_em ON public.parcelas_receber(criado_em DESC);

-- 4. Row Level Security (RLS) - Padronizado com o projeto
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_receber ENABLE ROW LEVEL SECURITY;

-- Políticas para public.contas_receber
DROP POLICY IF EXISTS "Permitir leitura publica de contas_receber" ON public.contas_receber;
CREATE POLICY "Permitir leitura publica de contas_receber" 
ON public.contas_receber FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de contas_receber" ON public.contas_receber;
CREATE POLICY "Permitir insercao de contas_receber" 
ON public.contas_receber FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de contas_receber" ON public.contas_receber;
CREATE POLICY "Permitir atualizacao de contas_receber" 
ON public.contas_receber FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de contas_receber" ON public.contas_receber;
CREATE POLICY "Permitir exclusao de contas_receber" 
ON public.contas_receber FOR DELETE 
USING (true);

-- Políticas para public.parcelas_receber
DROP POLICY IF EXISTS "Permitir leitura publica de parcelas_receber" ON public.parcelas_receber;
CREATE POLICY "Permitir leitura publica de parcelas_receber" 
ON public.parcelas_receber FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de parcelas_receber" ON public.parcelas_receber;
CREATE POLICY "Permitir insercao de parcelas_receber" 
ON public.parcelas_receber FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de parcelas_receber" ON public.parcelas_receber;
CREATE POLICY "Permitir atualizacao de parcelas_receber" 
ON public.parcelas_receber FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de parcelas_receber" ON public.parcelas_receber;
CREATE POLICY "Permitir exclusao de parcelas_receber" 
ON public.parcelas_receber FOR DELETE 
USING (true);

-- 5. Habilitar Supabase Realtime (REPLICA IDENTITY FULL e publicação)
ALTER TABLE public.contas_receber REPLICA IDENTITY FULL;
ALTER TABLE public.parcelas_receber REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'contas_receber'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contas_receber;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'parcelas_receber'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parcelas_receber;
  END IF;
END $$;

-- 6. Recarregar cache de esquemas do PostgREST
NOTIFY pgrst, 'reload schema';
