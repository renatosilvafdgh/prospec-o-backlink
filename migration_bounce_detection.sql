-- Migration: Sistema de Detecção de Bounce e Lista de Bloqueio Global
-- Execute este script no Supabase Dashboard → SQL Editor

-- 1. Tabela de e-mails inválidos (ocorrências por campanha)
CREATE TABLE IF NOT EXISTS invalid_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    tipo_erro TEXT, -- 'hard_bounce', 'soft_bounce', etc.
    motivo TEXT,    -- Detalhes da mensagem de erro se disponível
    data_deteccao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Lista de bloqueio global (impede envios futuros para esses e-mails)
CREATE TABLE IF NOT EXISTS global_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    motivo TEXT DEFAULT 'bounce_detectado',
    data_adicao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, email)
);

-- 3. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_invalid_emails_campanha ON invalid_emails(campanha_id);
CREATE INDEX IF NOT EXISTS idx_global_blocklist_email ON global_blocklist(user_id, email);

-- 4. Habilitar RLS
ALTER TABLE invalid_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_blocklist ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas RLS
CREATE POLICY "Usuários podem ver seus próprios e-mails inválidos"
    ON invalid_emails FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver sua própria blocklist"
    ON global_blocklist FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir em sua própria blocklist"
    ON global_blocklist FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 6. Adicionar status 'invalid' no comentário da tabela sites para documentação (opcional)
COMMENT ON COLUMN sites.status_contato IS 'Status do contato: lead, contatado, respondeu, em_aguardo, invalid';
