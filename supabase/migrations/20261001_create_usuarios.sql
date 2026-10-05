-- ==============================================================================
-- MIGRATION: Criação e Alinhamento da Tabela public.usuarios
-- SPRINT BETA 1.0 — AUTENTICAÇÃO E ENTRADA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  papel TEXT NOT NULL CHECK (papel IN ('PROGRAMADOR', 'OPERADOR', 'ESCRITORIO', 'ESTOQUE', 'FINANCEIRO')),
  maquina TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'PENDENTE')),
  avatar_url TEXT,
  ultimo_login TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para busca ultrarrápida por email
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(lower(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON public.usuarios(status);

-- RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de usuarios" ON public.usuarios;
CREATE POLICY "Permitir leitura publica de usuarios" 
ON public.usuarios FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de usuarios" ON public.usuarios;
CREATE POLICY "Permitir insercao de usuarios" 
ON public.usuarios FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de usuarios" ON public.usuarios;
CREATE POLICY "Permitir atualizacao de usuarios" 
ON public.usuarios FOR UPDATE 
USING (true);

-- Inserir / Atualizar o usuário administrador do sistema (rafael.rbsouza.rv@gmail.com) e contas operacionais padrão
INSERT INTO public.usuarios (nome, email, papel, status)
VALUES 
  ('Rafael Souza', 'rafael.rbsouza.rv@gmail.com', 'PROGRAMADOR', 'ATIVO'),
  ('Administrador RB', 'admin@rbsouza.com.br', 'PROGRAMADOR', 'ATIVO'),
  ('Operador Fabril 01', 'op1@rbsouza.com.br', 'OPERADOR', 'ATIVO'),
  ('Escritório & Expedição', 'escritorio@rbsouza.com.br', 'ESCRITORIO', 'ATIVO'),
  ('Controle de Estoque', 'estoque@rbsouza.com.br', 'ESTOQUE', 'ATIVO'),
  ('Financeiro Central', 'financeiro@rbsouza.com.br', 'FINANCEIRO', 'ATIVO')
ON CONFLICT (email) DO UPDATE SET 
  status = 'ATIVO',
  papel = EXCLUDED.papel,
  atualizado_em = NOW();

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
