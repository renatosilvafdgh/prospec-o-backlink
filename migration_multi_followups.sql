-- Migration: Adicionar suporte para múltiplos follow-ups
-- Execute este SQL no painel do Supabase → SQL Editor

-- 1. Adicionar coluna de sequência de follow-ups nas campanhas
ALTER TABLE campanhas 
ADD COLUMN IF NOT EXISTS sequencia_followup JSONB DEFAULT '[]'::jsonb;

-- 2. Adicionar coluna para rastrear o progresso do follow-up nos sites
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS followup_index INTEGER DEFAULT 0;

-- 3. (Opcional) Migrar dados existentes se necessário
-- UPDATE campanhas SET sequencia_followup = jsonb_build_array(jsonb_build_object('template_id', template_followup, 'dias', intervalo_followup_dias))
-- WHERE template_followup IS NOT NULL;
