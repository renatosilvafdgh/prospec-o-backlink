-- Migration: Adicionar coluna de intervalo de envio nas campanhas
-- Execute este SQL no painel do Supabase → SQL Editor

ALTER TABLE campanhas
ADD COLUMN IF NOT EXISTS intervalo_envio_segundos integer NOT NULL DEFAULT 0;
