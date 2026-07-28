-- ==============================================================================
-- SCRIPT AUTO-SETUP SUPABASE DATABASE & BUCKET STORAGE
-- MINIMARKET POS / RETAILFLOW SYSTEM
-- ==============================================================================
-- Petunjuk Penggunaan:
-- 1. Buka Dashboard Supabase Anda (https://supabase.com)
-- 2. Masuk ke menu "SQL Editor" di bilah navigasi kiri
-- 3. Salin (copy) seluruh isi file ini dan tempel (paste) di SQL Editor
-- 4. Klik tombol "Run" untuk mengeksekusi semua pembuatan tabel, RLS, bucket & seed data.
-- ==============================================================================

-- 1. EXTENSIONS SETUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABEL SCHEMAS
-- ==============================================================================

-- A. TABEL CABANG / BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY DEFAULT 'branch-' || extract(epoch from now())::text,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT 'Alamat Belum Diisi',
    phone TEXT NOT NULL DEFAULT '-',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. TABEL PENGGUNA / USERS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT 'user-' || extract(epoch from now())::text,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER', 'WAREHOUSE')),
    pin TEXT NOT NULL DEFAULT '123456',
    avatar_url TEXT,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. TABEL KATEGORI PRODUK / CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT 'cat-' || extract(epoch from now())::text,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. TABEL PRODUK & STOK INVENTORY / PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT 'prod-' || extract(epoch from now())::text,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Umum',
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'pcs',
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. TABEL SHIFT KASIR / SHIFTS
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY DEFAULT 'shift-' || extract(epoch from now())::text,
    user_id TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
    actual_closing_cash NUMERIC(12,2),
    expected_closing_cash NUMERIC(12,2),
    cash_difference NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
);

-- F. TABEL TRANSAKSI PENJUALAN STRUK / TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT 'tx-' || extract(epoch from now())::text,
    tx_uuid TEXT UNIQUE NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    shift_id TEXT REFERENCES public.shifts(id) ON DELETE SET NULL,
    cashier_name TEXT NOT NULL,
    customer_name TEXT DEFAULT 'Pelanggan Umum',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'QRIS', 'DEBIT', 'TRANSFER')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    promo_code TEXT,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- G. TABEL RINCIAN ITEM STRUK / TRANSACTION_ITEMS
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id TEXT PRIMARY KEY DEFAULT 'txi-' || extract(epoch from now())::text,
    transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- H. TABEL ARUS KAS MASUK & KELUAR / CASH_MOVEMENTS
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id TEXT PRIMARY KEY DEFAULT 'cash-' || extract(epoch from now())::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    shift_id TEXT REFERENCES public.shifts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('CASH_IN', 'EXPENSE_OUT')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- I. TABEL LOG AUDIT SISTEM / AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'audit-' || extract(epoch from now())::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- J. TABEL PROMOSI & DISKON / PROMOTIONS
CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY DEFAULT 'promo-' || extract(epoch from now())::text,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_until TIMESTAMPTZ NOT NULL
);

-- K. TABEL SUPPLIER / SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY DEFAULT 'sup-' || extract(epoch from now())::text,
    name TEXT NOT NULL,
    contact_person TEXT DEFAULT '-',
    phone TEXT DEFAULT '-',
    address TEXT DEFAULT '-'
);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Penuh (Permissive Policy) untuk Anon & Authenticated Key
DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow All Access" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow All Access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 4. SUPABASE STORAGE BUCKET CREATION & POLICIES
-- ==============================================================================

-- Buat storage bucket 'store-assets' (untuk Logo & Gambar Produk) dan 'backups'
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('store-assets', 'store-assets', true),
    ('backups', 'backups', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Akses Publik untuk Storage Objects
DROP POLICY IF EXISTS "Allow Public Bucket Read Write" ON storage.objects;
CREATE POLICY "Allow Public Bucket Read Write"
ON storage.objects FOR ALL
USING (bucket_id IN ('store-assets', 'backups'))
WITH CHECK (bucket_id IN ('store-assets', 'backups'));

-- ==============================================================================
-- 5. SEED DATA AWAL (INITIAL MASTER DATA)
-- ==============================================================================

-- Seed Cabang Utama
INSERT INTO public.branches (id, name, address, phone, is_active)
VALUES ('default-branch-001', 'Minimarket RetailFlow Pusat', 'Jl. Jendral Sudirman No. 88, Bandung', '+62 812-3456-7890', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Akun Pengguna Awal (Owner, Manager, Kasir)
INSERT INTO public.users (id, username, name, role, pin, branch_id)
VALUES 
    ('user-owner', 'owner', 'Bapak Pemilik Toko (Owner)', 'OWNER', '123456', 'default-branch-001'),
    ('user-manager', 'manager', 'Manager Operasional', 'MANAGER', '123456', 'default-branch-001'),
    ('user-kasir', 'kasir1', 'Siti Rahma (Kasir 1)', 'CASHIER', '123456', 'default-branch-001')
ON CONFLICT (username) DO NOTHING;

-- Seed Kategori Produk
INSERT INTO public.categories (id, name)
VALUES 
    ('cat-01', 'Makanan & Camilan'),
    ('cat-02', 'Minuman'),
    ('cat-03', 'Perlengkapan Mandi & Rumah'),
    ('cat-04', 'Sembako & Bumbu')
ON CONFLICT (name) DO NOTHING;

-- Seed Produk Awal
INSERT INTO public.products (id, barcode, name, category, purchase_price, selling_price, stock, min_stock, unit, branch_id)
VALUES 
    ('prod-01', '8999999000012', 'Indomie Goreng Spesial 85g', 'Makanan & Camilan', 2800, 3500, 150, 20, 'pcs', 'default-branch-001'),
    ('prod-02', '8999999000029', 'Teh Pucuk Harum 350ml', 'Minuman', 2900, 4000, 80, 15, 'pcs', 'default-branch-001'),
    ('prod-03', '8999999000036', 'Air Mineral Le Minerale 600ml', 'Minuman', 2100, 3000, 120, 24, 'pcs', 'default-branch-001'),
    ('prod-04', '8999999000043', 'Sabun Lifebuoy Total 10 110g', 'Perlengkapan Mandi & Rumah', 3800, 5000, 45, 10, 'pcs', 'default-branch-001'),
    ('prod-05', '8999999000050', 'Minyak Goreng Bimoli 1 Liter', 'Sembako & Bumbu', 16500, 20000, 30, 8, 'pcs', 'default-branch-001')
ON CONFLICT (barcode) DO NOTHING;

-- Seed Promo Awal
INSERT INTO public.promotions (id, code, title, discount_type, discount_value, min_purchase, is_active, valid_until)
VALUES 
    ('promo-01', 'DISKON10', 'Diskon Harian 10%', 'PERCENTAGE', 10, 50000, true, NOW() + INTERVAL '30 days'),
    ('promo-02', 'HEMAT5K', 'Potongan Langsung Rp 5.000', 'FIXED', 5000, 100000, true, NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;

-- Seed Log Audit Pertama
INSERT INTO public.audit_logs (id, branch_id, action, module, details, user_name, user_id)
VALUES 
    ('audit-init', 'default-branch-001', 'INISIALISASI_DATABASE', 'SISTEM', 'Database Supabase berhasil di-setup dan siap digunakan secara penuh.', 'System Administrator', 'user-owner')
ON CONFLICT (id) DO NOTHING;

-- Selesai!
