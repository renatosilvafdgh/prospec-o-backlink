-- Adição de colunas para rastreamento de e-mail na tabela email_logs
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid();
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS aberturas INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS primeira_abertura TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS ultima_abertura TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS cliques INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS ultimo_clique TIMESTAMP WITH TIME ZONE;

-- Índice para busca rápida por tracking_id
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_id ON email_logs(tracking_id);
