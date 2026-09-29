-- ==============================================================================
-- MIGRATION: Criação e Estruturação Definitiva de public.expedicoes e public.expedicao_rolos
-- SPRINT BANCO 2 — EXPEDIÇÕES (REFINAMENTO / HOTFIX ARQUITETURAL)
-- ==============================================================================
-- DIRETRIZES CONSOLIDADAS:
-- 1. Representa a carga oficial enviada ao cliente com totais consolidados:
--    - peso_total, metros_total, quantidade_rolos.
-- 2. Rastreabilidade e auditoria interna:
--    - usuario_criacao_id, usuario_expedicao_id.
-- 3. Transporte e modalidade de entrega:
--    - tipo_entrega: RETIRADA_CLIENTE | ENTREGA_PROPRIA | TRANSPORTADORA.
-- 4. Status padronizado da expedição:
--    EM_PREPARACAO → PRONTA → EXPEDIDA → FATURADA (e CANCELADA).
-- 5. Relacionamentos exclusivamente por IDs internos:
--    - cliente_id, rolo_id, expedicao_id, usuario_criacao_id, usuario_expedicao_id.
--    Os campos numero_expedicao e numero_romaneio são apenas identificadores de negócio.
-- ==============================================================================

-- 1. Tabela public.expedicoes (Carga enviada ao cliente)
CREATE TABLE IF NOT EXISTS public.expedicoes (
  id BIGSERIAL PRIMARY KEY,
  numero_expedicao TEXT NOT NULL,
  numero_romaneio TEXT,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  
  -- Controle de Usuários (Auditoria interna via IDs)
  usuario_criacao_id BIGINT,
  usuario_expedicao_id BIGINT,
  
  -- Totais consolidados da carga (gravados no fechamento da expedição para relatórios rápidos)
  peso_total NUMERIC(12, 3) DEFAULT 0,
  metros_total NUMERIC(12, 2) DEFAULT 0,
  quantidade_rolos INTEGER DEFAULT 0,
  
  -- Transporte e Modalidade de Entrega
  tipo_entrega TEXT NOT NULL DEFAULT 'RETIRADA_CLIENTE'
    CHECK (tipo_entrega IN ('RETIRADA_CLIENTE', 'ENTREGA_PROPRIA', 'TRANSPORTADORA')),
  transportadora TEXT,
  motorista TEXT,
  placa_veiculo TEXT,
  
  -- Situação / Status padronizado da expedição
  status TEXT NOT NULL DEFAULT 'EM_PREPARACAO' 
    CHECK (status IN ('EM_PREPARACAO', 'PRONTA', 'EXPEDIDA', 'FATURADA', 'CANCELADA')),
  
  -- Observações gerais da carga
  observacoes TEXT,
  
  -- Datas de controle
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expedido_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários na tabela expedicoes
COMMENT ON TABLE public.expedicoes IS 'Representa a carga oficial de rolos enviada ao cliente (Expedição RB Souza)';
COMMENT ON COLUMN public.expedicoes.numero_expedicao IS 'Identificador de negócio interno da expedição (ex: EXP-2026-0001)';
COMMENT ON COLUMN public.expedicoes.numero_romaneio IS 'Identificador de negócio impresso no romaneio (ex: ROM-2026-0001)';
COMMENT ON COLUMN public.expedicoes.cliente_id IS 'ID relacional do cliente destinatário';
COMMENT ON COLUMN public.expedicoes.tipo_entrega IS 'RETIRADA_CLIENTE | ENTREGA_PROPRIA | TRANSPORTADORA';
COMMENT ON COLUMN public.expedicoes.status IS 'EM_PREPARACAO -> PRONTA -> EXPEDIDA -> FATURADA (ou CANCELADA)';
COMMENT ON COLUMN public.expedicoes.peso_total IS 'Peso total em kg gravado no fechamento da carga';
COMMENT ON COLUMN public.expedicoes.metros_total IS 'Metragem total gravada no fechamento da carga';
COMMENT ON COLUMN public.expedicoes.quantidade_rolos IS 'Quantidade de rolos associados à carga';

-- 2. Tabela de relacionamento public.expedicao_rolos (Muitos rolos para uma expedição via IDs)
CREATE TABLE IF NOT EXISTS public.expedicao_rolos (
  id BIGSERIAL PRIMARY KEY,
  expedicao_id BIGINT NOT NULL REFERENCES public.expedicoes(id) ON DELETE CASCADE,
  rolo_id BIGINT NOT NULL REFERENCES public.rolos(id) ON DELETE RESTRICT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários na tabela expedicao_rolos
COMMENT ON TABLE public.expedicao_rolos IS 'Relaciona rolos à expedição utilizando exclusivamente chaves relacionais (expedicao_id, rolo_id)';

-- Regra de Negócio: Um rolo só pode pertencer a uma expedição ativa
CREATE UNIQUE INDEX IF NOT EXISTS uq_expedicao_rolos_rolo_ativo 
ON public.expedicao_rolos (rolo_id);

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_expedicoes_cliente_id ON public.expedicoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_expedicoes_status ON public.expedicoes(status);
CREATE INDEX IF NOT EXISTS idx_expedicoes_tipo_entrega ON public.expedicoes(tipo_entrega);
CREATE INDEX IF NOT EXISTS idx_expedicoes_expedido_em ON public.expedicoes(expedido_em DESC);
CREATE INDEX IF NOT EXISTS idx_expedicoes_criado_em ON public.expedicoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_expedicoes_usuario_criacao ON public.expedicoes(usuario_criacao_id);
CREATE INDEX IF NOT EXISTS idx_expedicoes_usuario_expedicao ON public.expedicoes(usuario_expedicao_id);
CREATE INDEX IF NOT EXISTS idx_expedicoes_numero_romaneio ON public.expedicoes(numero_romaneio);
CREATE INDEX IF NOT EXISTS idx_expedicoes_numero_expedicao ON public.expedicoes(numero_expedicao);

CREATE INDEX IF NOT EXISTS idx_expedicao_rolos_expedicao_id ON public.expedicao_rolos(expedicao_id);
CREATE INDEX IF NOT EXISTS idx_expedicao_rolos_rolo_id ON public.expedicao_rolos(rolo_id);

-- 4. Row Level Security (RLS) - Padronizado com o projeto
ALTER TABLE public.expedicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedicao_rolos ENABLE ROW LEVEL SECURITY;

-- Políticas para public.expedicoes
DROP POLICY IF EXISTS "Permitir leitura publica de expedicoes" ON public.expedicoes;
CREATE POLICY "Permitir leitura publica de expedicoes" 
ON public.expedicoes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de expedicoes" ON public.expedicoes;
CREATE POLICY "Permitir insercao de expedicoes" 
ON public.expedicoes FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de expedicoes" ON public.expedicoes;
CREATE POLICY "Permitir atualizacao de expedicoes" 
ON public.expedicoes FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de expedicoes" ON public.expedicoes;
CREATE POLICY "Permitir exclusao de expedicoes" 
ON public.expedicoes FOR DELETE 
USING (true);

-- Políticas para public.expedicao_rolos
DROP POLICY IF EXISTS "Permitir leitura publica de expedicao_rolos" ON public.expedicao_rolos;
CREATE POLICY "Permitir leitura publica de expedicao_rolos" 
ON public.expedicao_rolos FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de expedicao_rolos" ON public.expedicao_rolos;
CREATE POLICY "Permitir insercao de expedicao_rolos" 
ON public.expedicao_rolos FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de expedicao_rolos" ON public.expedicao_rolos;
CREATE POLICY "Permitir atualizacao de expedicao_rolos" 
ON public.expedicao_rolos FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de expedicao_rolos" ON public.expedicao_rolos;
CREATE POLICY "Permitir exclusao de expedicao_rolos" 
ON public.expedicao_rolos FOR DELETE 
USING (true);

-- 5. Habilitar Supabase Realtime (REPLICA IDENTITY FULL e publicação)
ALTER TABLE public.expedicoes REPLICA IDENTITY FULL;
ALTER TABLE public.expedicao_rolos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expedicoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expedicoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expedicao_rolos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expedicao_rolos;
  END IF;
END $$;

-- 6. Recarregar cache de esquemas do PostgREST
NOTIFY pgrst, 'reload schema';
