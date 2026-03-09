-- Migration: Adiciona colunas necessárias para a planilha base de prospecção de backlinks
-- Execute este script no Supabase Dashboard → SQL Editor

ALTER TABLE sites
  -- DA (Domain Authority) e PA (Page Authority)
  ADD COLUMN IF NOT EXISTS da INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pa INTEGER DEFAULT NULL,

  -- Spam Score em porcentagem
  ADD COLUMN IF NOT EXISTS spam INTEGER DEFAULT NULL,

  -- Nomes dos contatos para cada e-mail
  -- Obs: o campo `email` existente será tratado como email_1
  ADD COLUMN IF NOT EXISTS nome_1 TEXT DEFAULT NULL,

  -- Segundo e-mail e respectivo nome
  ADD COLUMN IF NOT EXISTS email_2 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nome_2  TEXT DEFAULT NULL,

  -- Terceiro e-mail e respectivo nome
  ADD COLUMN IF NOT EXISTS email_3 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nome_3  TEXT DEFAULT NULL,

  -- Redes sociais
  ADD COLUMN IF NOT EXISTS facebook  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linkedin  TEXT DEFAULT NULL;

-- ------------------------------------------------------------
-- Política RLS: permite que usuários autenticados leiam
-- os sites da base compartilhada (user_id IS NULL)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura base compartilhada" ON sites;

CREATE POLICY "Leitura base compartilhada"
  ON sites
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()   -- sites próprios do usuário
    OR user_id IS NULL     -- sites da base compartilhada
  );

-- Confirma as colunas adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sites'
  AND column_name IN (
    'da', 'pa', 'spam',
    'email', 'nome_1',
    'email_2', 'nome_2',
    'email_3', 'nome_3',
    'facebook', 'instagram', 'linkedin'
  )
ORDER BY column_name;
