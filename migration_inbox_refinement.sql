-- Migration: Inbox Refinement (Read status and Lead Classification)
-- Execute este script no Supabase Dashboard → SQL Editor

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS lido BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS classificacao_lead TEXT DEFAULT NULL;

-- Comentário para documentar valores recomendados
COMMENT ON COLUMN sites.classificacao_lead IS 'Valores sugeridos: oportunidade, descartado, aguardando, parceria_fechada';

-- Criar um índice para melhorar a performance de filtragem no Inbox
CREATE INDEX IF NOT EXISTS idx_sites_user_status_lido ON sites(user_id, status_contato, lido);
