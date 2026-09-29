-- ==============================================================================
-- MIGRATION: Alinhamento Arquitetural Definitivo da Tabela public.rolos
-- SPRINT BANCO 1 — ROLOS (REFINAMENTO / HOTFIX ARQUITETURAL)
-- ==============================================================================
-- DIRETRIZES CONSOLIDADAS:
-- 1. IDs como chave de relacionamento exclusiva (cliente_id, op_id, operador_id,
--    romaneio_id, faturamento_id). O campo numero_rolo é apenas identificador de negócio.
-- 2. Simplificação do ciclo de vida do rolo:
--    Removidos: PENDENTE, PESADO.
--    Ciclo canônico definitivo:
--    EM_PRODUCAO → AGUARDANDO_PESAGEM → EM_ESTOQUE → EXPEDIDO → FATURADO → CANCELADO
-- 3. Padronização rigorosa dos campos de peso:
--    - peso_bruto_kg (NUMERIC 10, 3)
--    - peso_liquido_kg (NUMERIC 10, 3)
--    - tara_kg (NUMERIC 10, 3)
--    - peso_estimado_kg (NUMERIC 10, 3)
-- ==============================================================================

-- 1. Criação base se não existir
CREATE TABLE IF NOT EXISTS public.rolos (
  id BIGSERIAL PRIMARY KEY,
  op_id BIGINT REFERENCES public.ordens_producao(id) ON DELETE SET NULL,
  numero_rolo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'EM_PRODUCAO',
  sequencia INTEGER DEFAULT 1,
  portadas_total INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Referências relacionais exclusivamente por IDs internos
ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS operador_id BIGINT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS cliente_id BIGINT REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS romaneio_id BIGINT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS faturamento_id BIGINT;

-- 3. Padronização dos Campos de Peso (RB Souza / TEXLOG)
ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS peso_estimado_kg NUMERIC(10, 3);

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS peso_bruto_kg NUMERIC(10, 3);

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS tara_kg NUMERIC(10, 3);

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS peso_liquido_kg NUMERIC(10, 3);

-- Compatibilidade retroativa durante transição
ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS peso_real_kg NUMERIC(10, 3);

-- 4. Constraint do Ciclo de Vida Simplificado do Rolo
-- EM_PRODUCAO → AGUARDANDO_PESAGEM → EM_ESTOQUE → EXPEDIDO → FATURADO → CANCELADO
DO $$
BEGIN
  -- Se houver constraint antiga, remove para atualizar os valores permitidos
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_rolos_status' AND conrelid = 'public.rolos'::regclass
  ) THEN
    ALTER TABLE public.rolos DROP CONSTRAINT chk_rolos_status;
  END IF;

  ALTER TABLE public.rolos 
  ADD CONSTRAINT chk_rolos_status 
  CHECK (status IN (
    'EM_PRODUCAO',
    'AGUARDANDO_PESAGEM',
    'EM_ESTOQUE',
    'EXPEDIDO',
    'FATURADO',
    'CANCELADO'
  ));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Atributos Técnicos do Rolo
ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS maquina TEXT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS metros NUMERIC(10, 2);

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS voltas INTEGER;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS quantidade_portadas INTEGER;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS titulo_fio TEXT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS tipo_fio TEXT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS cor TEXT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS total_fios INTEGER;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS rolete TEXT;

-- 6. Timestamps das fases do ciclo de vida
ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS pesado_em TIMESTAMPTZ;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS expedido_em TIMESTAMPTZ;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS faturado_em TIMESTAMPTZ;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS localizacao_estoque TEXT;

ALTER TABLE public.rolos 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Comentários na tabela rolos
COMMENT ON TABLE public.rolos IS 'Entidade Rolo com ciclo de vida simplificado e rastreabilidade total (RB Souza / TEXLOG)';
COMMENT ON COLUMN public.rolos.numero_rolo IS 'Identificador de negócio exibido ao usuário (não utilizado como chave de relacionamento)';
COMMENT ON COLUMN public.rolos.status IS 'EM_PRODUCAO -> AGUARDANDO_PESAGEM -> EM_ESTOQUE -> EXPEDIDO -> FATURADO (ou CANCELADO)';
COMMENT ON COLUMN public.rolos.peso_liquido_kg IS 'Peso líquido canônico oficial em kg (peso_bruto - tara)';

-- 7. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_rolos_op_id ON public.rolos(op_id);
CREATE INDEX IF NOT EXISTS idx_rolos_cliente_id ON public.rolos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_rolos_operador_id ON public.rolos(operador_id);
CREATE INDEX IF NOT EXISTS idx_rolos_romaneio_id ON public.rolos(romaneio_id);
CREATE INDEX IF NOT EXISTS idx_rolos_faturamento_id ON public.rolos(faturamento_id);
CREATE INDEX IF NOT EXISTS idx_rolos_status ON public.rolos(status);
CREATE INDEX IF NOT EXISTS idx_rolos_numero_rolo ON public.rolos(numero_rolo);
CREATE INDEX IF NOT EXISTS idx_rolos_criado_em ON public.rolos(criado_em DESC);

-- 8. RLS & Realtime
ALTER TABLE public.rolos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de rolos" ON public.rolos;
CREATE POLICY "Permitir leitura publica de rolos" ON public.rolos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao de rolos" ON public.rolos;
CREATE POLICY "Permitir insercao de rolos" ON public.rolos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de rolos" ON public.rolos;
CREATE POLICY "Permitir atualizacao de rolos" ON public.rolos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de rolos" ON public.rolos;
CREATE POLICY "Permitir exclusao de rolos" ON public.rolos FOR DELETE USING (true);

ALTER TABLE public.rolos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rolos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rolos;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
