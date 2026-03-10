-- Adição de opção de envio humano na tabela de campanas
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS usar_intervalo_humano BOOLEAN DEFAULT FALSE;
