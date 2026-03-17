-- Migration: Add Lead Comments (observacoes column)
-- Execute este script no Supabase Dashboard → SQL Editor

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS observacoes TEXT DEFAULT NULL;

-- Adiciona um comentário para documentar a finalidade da coluna
COMMENT ON COLUMN sites.observacoes IS 'Notas internas sobre o lead inseridas pelo usuário no Inbox';
