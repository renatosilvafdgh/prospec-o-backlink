-- Fix RLS for sites table to allow users to link sites to campaigns
-- Execute this in Supabase SQL Editor

-- 1. Allow authenticated users to UPDATE sites they own OR sites with no owner (claiming them)
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios sites ou sites órfãos" ON sites;
CREATE POLICY "Usuários podem atualizar seus próprios sites ou sites órfãos"
  ON sites
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR user_id IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 2. Ensure INSERT logic also sets user_id (if not already handled)
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios sites" ON sites;
CREATE POLICY "Usuários podem inserir seus próprios sites"
  ON sites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 3. (Optional) Fix existing orphan sites that have a campaign but no user_id
-- This helps if some sites were previously linked but remained user_id = null
-- UPDATE sites SET user_id = 'YOUR_USER_ID' WHERE campanha_id IS NOT NULL AND user_id IS NULL;
