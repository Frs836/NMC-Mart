-- =============================================================
-- RETAILFLOW POS - SUPABASE DATABASE SCHEMA V2 (RETAIL & SHELF STOCK)
-- Jalankan skrip ini di Supabase SQL Editor milik Anda.
-- =============================================================

-- 1. Tambah kolom shelf_stock ke tabel products jika belum ada
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shelf_stock INTEGER DEFAULT 0;

-- 2. Buat tabel shelf_transfers (Riwayat Pemindahan Barang dari Gudang ke Rak Etalase POS)
CREATE TABLE IF NOT EXISTS public.shelf_transfers (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity_transferred INTEGER NOT NULL CHECK (quantity_transferred > 0),
  operator_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS untuk shelf_transfers
ALTER TABLE public.shelf_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to shelf_transfers" ON public.shelf_transfers;
CREATE POLICY "Allow public full access to shelf_transfers"
  ON public.shelf_transfers FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Buat tabel team_messages (Fitur Chat Internal Antar Staff & Role)
CREATE TABLE IF NOT EXISTS public.team_messages (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  recipient_role TEXT DEFAULT 'ALL',
  message TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS untuk team_messages
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to team_messages" ON public.team_messages;
CREATE POLICY "Allow public full access to team_messages"
  ON public.team_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index performa pencarian
CREATE INDEX IF NOT EXISTS idx_products_shelf_stock ON public.products(shelf_stock);
CREATE INDEX IF NOT EXISTS idx_shelf_transfers_product ON public.shelf_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_branch ON public.team_messages(branch_id, created_at DESC);

-- =============================================================
-- SELESAI: Skema V2 siap digunakan untuk integrasi AI & POS Kasir
-- =============================================================
