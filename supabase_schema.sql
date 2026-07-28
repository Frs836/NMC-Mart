-- ====================================================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA FOR RETAILFLOW POS & INVENTORY
-- ====================================================================
-- Salin dan Jalankan seluruh Script ini di SQL Editor Supabase Anda
-- untuk mengaktifkan sinkronisasi Cloud Database Multi-Branch.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER')),
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS TABLE (INVENTORY & SHELF STOCK)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    description TEXT,
    purchase_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_percent NUMERIC(5, 2) DEFAULT 0,
    stock INT NOT NULL DEFAULT 0, -- Stok Utama Gudang
    shelf_stock INT DEFAULT 0,    -- Stok Etalase / Rak Kasir
    min_stock INT DEFAULT 5,
    expiry_date DATE,
    supplier_name TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SHIFTS TABLE
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    cashier_id TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    opening_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
    expected_closing_cash NUMERIC(15, 2),
    actual_closing_cash NUMERIC(15, 2),
    cash_difference NUMERIC(15, 2),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    tx_uuid TEXT UNIQUE NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    shift_id TEXT REFERENCES public.shifts(id) ON DELETE SET NULL,
    cashier_id TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(15, 2) DEFAULT 0,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    pay_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'QRIS', 'BANK_TRANSFER')),
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REFUNDED', 'CANCELLED')),
    is_synced BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CASH MOVEMENTS TABLE (Kas Masuk / Keluar Operasional)
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    shift_id TEXT REFERENCES public.shifts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CASH_IN', 'EXPENSE_OUT')),
    amount NUMERIC(15, 2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TEAM MESSAGES TABLE (Realtime Chat & Urgent Alert)
CREATE TABLE IF NOT EXISTS public.team_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    recipient_role TEXT DEFAULT 'ALL',
    message TEXT NOT NULL,
    is_urgent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SHELF STOCK TRANSFERS TABLE (Restok Rak dari Gudang)
CREATE TABLE IF NOT EXISTS public.shelf_stock_transfers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity_transferred INT NOT NULL,
    operator_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PURCHASE ORDERS TABLE (Sistem PO Supplier untuk Manager)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    po_number TEXT UNIQUE NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED')),
    created_by TEXT NOT NULL,
    received_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    notes TEXT
);

-- 11. APPROVAL REQUESTS TABLE (Persetujuan Manager & Owner)
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    requested_by_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('VOID_TRANSACTION', 'MANUAL_DISCOUNT', 'STOCK_ADJUSTMENT', 'PRICE_CHANGE')),
    details TEXT NOT NULL,
    amount NUMERIC(15, 2),
    target_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by TEXT,
    approved_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. STORE EXPENSES TABLE (Beban Operasional Toko Laba Rugi)
CREATE TABLE IF NOT EXISTS public.store_expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('SEWA', 'GAJI', 'LISTRIK_AIR', 'KERUSAKAN_BARANG', 'OPERASIONAL', 'LAINNYA')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SALES TARGETS TABLE (Target Penjualan Cabang KPI Owner)
CREATE TABLE IF NOT EXISTS public.sales_targets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format YYYY-MM
    target_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0,
    target_profit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, month_year)
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 15. INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_uuid ON public.transactions(tx_uuid);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_team_messages_branch ON public.team_messages(branch_id, created_at);

-- 16. ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 17. PUBLIC ACCESS POLICIES (Simplifies POS Anon REST Key connection - Idempotent)
DROP POLICY IF EXISTS "Allow All Access" ON public.branches;
CREATE POLICY "Allow All Access" ON public.branches FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.users;
CREATE POLICY "Allow All Access" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.products;
CREATE POLICY "Allow All Access" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.shifts;
CREATE POLICY "Allow All Access" ON public.shifts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.transactions;
CREATE POLICY "Allow All Access" ON public.transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.cash_movements;
CREATE POLICY "Allow All Access" ON public.cash_movements FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.team_messages;
CREATE POLICY "Allow All Access" ON public.team_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.shelf_stock_transfers;
CREATE POLICY "Allow All Access" ON public.shelf_stock_transfers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.purchase_orders;
CREATE POLICY "Allow All Access" ON public.purchase_orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.approval_requests;
CREATE POLICY "Allow All Access" ON public.approval_requests FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.store_expenses;
CREATE POLICY "Allow All Access" ON public.store_expenses FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.sales_targets;
CREATE POLICY "Allow All Access" ON public.sales_targets FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Access" ON public.audit_logs;
CREATE POLICY "Allow All Access" ON public.audit_logs FOR ALL USING (true);

-- ====================================================================
-- SEED DATA DEFAULT BRANCH & INITIAL DATA (OPTIONAL)
-- ====================================================================
INSERT INTO public.branches (id, name, address, phone, is_active)
VALUES ('default-branch-001', 'Toko Utama (Pusat)', 'Jl. Malioboro No. 123, Yogyakarta', '081234567890', true)
ON CONFLICT (id) DO NOTHING;

-- SEED TARGET PENJUALAN
INSERT INTO public.sales_targets (id, branch_id, month_year, target_revenue, target_profit)
VALUES ('target-default-001', 'default-branch-001', '2026-07', 50000000, 15000000)
ON CONFLICT (branch_id, month_year) DO NOTHING;
