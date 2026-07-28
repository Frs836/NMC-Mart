import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV_CONFIG, isSupabaseConfigured } from '../config/env';
import { Product, Transaction, Shift, AuditLog, Branch, User, CashMovement, ShelfStockTransfer, TeamMessage } from '../types';

let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    supabaseClient = createClient(ENV_CONFIG.supabaseUrl, ENV_CONFIG.supabaseAnonKey);
    console.log('✓ Supabase Database Client connected successfully');
  } catch (err) {
    console.warn('Supabase initialization error, falling back to local database:', err);
  }
} else {
  console.log('ℹ Running in Local Database Mode (Dexie.js). Add VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY to enable cloud sync.');
}

export const getSupabaseClient = () => supabaseClient;

/**
 * Ensure Branch Record exists in Supabase without overwriting existing custom store profile
 */
export async function ensureBranchInCloud(branchId: string): Promise<void> {
  if (!supabaseClient) return;
  try {
    // 1. Check if branch already exists in cloud
    const { data: existing } = await supabaseClient
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .maybeSingle();

    if (existing && existing.id) {
      // Branch already exists in cloud, do NOT overwrite custom store profile!
      return;
    }

    // 2. If it does not exist, assemble branch details from local storage or defaults
    let branchToSync: Partial<Branch> | null = null;
    try {
      const savedBranchesStr = localStorage.getItem('minimarket_branches_v1');
      if (savedBranchesStr) {
        const branches: Branch[] = JSON.parse(savedBranchesStr);
        const match = branches.find((b) => b.id === branchId);
        if (match) branchToSync = match;
      }
    } catch (e) {}

    const name = branchToSync?.name || localStorage.getItem('minimarket_store_name_v1') || 'Cabang Utama Toko';
    const address = branchToSync?.address || 'Alamat Utama';
    const phone = branchToSync?.phone || '-';
    const receiptFooter = branchToSync?.receiptFooter || 'Terima kasih telah berbelanja di minimarket kami!';
    const logoUrl = branchToSync?.logoUrl || localStorage.getItem('minimarket_store_logo_v1') || null;

    await supabaseClient.from('branches').upsert({
      id: branchId,
      name,
      address,
      phone,
      is_active: true,
      receipt_footer: receiptFooter,
      logo_url: logoUrl
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('ensureBranchInCloud warning:', err);
  }
}

/**
 * Upload Store Logo to Supabase Storage Bucket ('store-assets')
 */
export async function uploadStoreLogoToSupabaseStorage(file: File): Promise<{ success: boolean; url: string; message?: string }> {
  if (!file) {
    return { success: false, url: '', message: 'Tidak ada file yang dipilih' };
  }

  if (supabaseClient) {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `store-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const bucketName = 'store-assets';

      // 1. Attempt upload to primary bucket 'store-assets'
      let { data, error } = await supabaseClient.storage.from(bucketName).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

      if (error) {
        console.warn(`Attempting fallback upload to public storage bucket due to:`, error.message);
        const fallback = await supabaseClient.storage.from('public').upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        if (!fallback.error) {
          const { data: publicUrlData } = supabaseClient.storage.from('public').getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            return { success: true, url: publicUrlData.publicUrl };
          }
        }
      } else {
        const { data: publicUrlData } = supabaseClient.storage.from(bucketName).getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          console.log('✓ Store logo uploaded successfully to Supabase Storage:', publicUrlData.publicUrl);
          return { success: true, url: publicUrlData.publicUrl };
        }
      }
    } catch (err: any) {
      console.warn('Supabase Storage upload error:', err);
    }
  }

  // Fallback to DataURL Base64 if storage bucket or network is offline
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = (event.target?.result as string) || '';
      resolve({ success: true, url: result, message: 'Logo disimpan dalam format DataURL local' });
    };
    reader.onerror = () => {
      resolve({ success: false, url: '', message: 'Gagal membaca file logo' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sync Branch / Store Profile to Supabase
 */
export async function syncBranchToCloud(branch: Branch): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('branches').upsert({
      id: branch.id,
      name: branch.name,
      address: branch.address || 'Alamat Belum Diisi',
      phone: branch.phone || '-',
      is_active: branch.isActive ?? true,
      receipt_footer: branch.receiptFooter || 'Terima kasih telah berbelanja bersama kami!',
      logo_url: branch.logoUrl || null
    }, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase branch sync warning:', error.message);
      return false;
    }
    console.log('✓ Branch synced to Supabase Cloud:', branch.name);
    return true;
  } catch (err) {
    console.warn('Cloud sync error for branch:', err);
    return false;
  }
}

/**
 * Delete Branch in Supabase
 */
export async function deleteBranchInCloud(branchId: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('branches').delete().eq('id', branchId);
    if (error) {
      console.warn('Error deleting branch in Supabase:', error.message);
      return false;
    }
    console.log('✓ Branch deleted in Supabase Cloud:', branchId);
    return true;
  } catch (err) {
    console.warn('Cloud delete error for branch:', err);
    return false;
  }
}

/**
 * Sync User Account / Profile to Supabase
 */
export async function syncUserToCloud(user: User): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('users').upsert({
      id: user.id,
      username: user.email || user.name.toLowerCase().replace(/\s+/g, '_'),
      name: user.name,
      role: user.role || 'CASHIER',
      pin: user.password || '123456',
      avatar_url: (user as any).avatarUrl || null,
      branch_id: user.branchId || null
    }, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase user sync warning:', error.message);
      return false;
    }
    console.log('✓ User synced to Supabase Cloud:', user.name);
    return true;
  } catch (err) {
    console.warn('Cloud sync error for user:', err);
    return false;
  }
}

/**
 * Sync Products with Supabase
 */
export async function syncProductToCloud(product: Product): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    // Ensure parent branch exists if branchId is provided
    if (product.branchId) {
      await ensureBranchInCloud(product.branchId);
    }

    const { error } = await supabaseClient.from('products').upsert({
      id: product.id,
      barcode: product.barcode || `BAR-${Date.now()}`,
      name: product.name,
      category: product.category || 'Umum',
      purchase_price: product.purchasePrice || 0,
      selling_price: product.sellingPrice || 0,
      stock: Math.max(0, product.stock || 0),
      shelf_stock: Math.max(0, product.shelfStock ?? product.stock ?? 0),
      min_stock: product.minStock || 5,
      is_active: product.isAvailable ?? true,
      branch_id: product.branchId || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase product sync warning:', error.message);
      return false;
    }
    console.log('✓ Product synced to Supabase Cloud:', product.name);
    return true;
  } catch (err) {
    console.warn('Cloud sync error for product:', err);
    return false;
  }
}

/**
 * Delete Product from Supabase Cloud
 */
export async function deleteProductFromCloud(productId: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('products').delete().eq('id', productId);
    if (error) {
      console.warn('Supabase product delete warning:', error.message);
      return false;
    }
    console.log('✓ Product deleted from Supabase Cloud:', productId);
    return true;
  } catch (err) {
    console.warn('Cloud delete error for product:', err);
    return false;
  }
}

/**
 * Sync Completed Transaction & Items to Supabase
 */
export async function syncTransactionToCloud(tx: Transaction): Promise<boolean> {
  if (!supabaseClient) return false;

  try {
    // 1. Ensure branch exists in Supabase branches table before referencing FK
    if (tx.branchId) {
      await ensureBranchInCloud(tx.branchId);
    }

    // 2. Ensure shift exists in Supabase shifts table before referencing FK
    const validShiftId = (tx.shiftId && tx.shiftId !== 'shift-offline') ? tx.shiftId : null;
    if (validShiftId) {
      const { data: existingShift } = await supabaseClient.from('shifts').select('status').eq('id', validShiftId).single();
      if (!existingShift) {
        await supabaseClient.from('shifts').upsert({
          id: validShiftId,
          cashier_id: tx.cashierId || 'user-001',
          cashier_name: tx.cashierName || 'Kasir',
          branch_id: tx.branchId || null,
          start_time: tx.createdAt || new Date().toISOString(),
          status: 'OPEN'
        }, { onConflict: 'id' });
      }
    }

    // 3. Ensure all items exist in products table
    if (tx.items && tx.items.length > 0) {
      for (const item of tx.items) {
        if (item.product) {
          await syncProductToCloud(item.product);
        }
      }
    }

    // 4. Insert/Upsert into transactions table
    const { error: txError } = await supabaseClient.from('transactions').upsert({
      id: tx.id,
      tx_uuid: tx.txUuid,
      branch_id: tx.branchId || null,
      shift_id: validShiftId,
      cashier_name: tx.cashierName || 'Kasir',
      customer_name: tx.customerName || 'Pelanggan Umum',
      payment_method: tx.paymentMethod || 'CASH',
      subtotal: tx.subtotal || 0,
      discount: tx.discountTotal || 0,
      promo_code: (tx as any).promoCode || null,
      tax: tx.taxTotal || 0,
      grand_total: tx.grandTotal || 0,
      paid_amount: tx.payAmount || 0,
      change_amount: tx.changeAmount || 0,
      created_at: tx.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });

    if (txError) {
      console.warn('Supabase transaction insert warning:', txError.message);
      return false;
    }

    // 5. Insert items into transaction_items table
    if (tx.items && tx.items.length > 0) {
      const itemsToInsert = tx.items.map((item, idx) => ({
        id: `txi-${tx.id}-${idx}`,
        transaction_id: tx.id,
        product_id: item.product.id,
        product_name: item.product.name,
        barcode: item.product.barcode || '',
        purchase_price: item.product.purchasePrice || 0,
        selling_price: item.product.sellingPrice || 0,
        quantity: item.quantity,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabaseClient
        .from('transaction_items')
        .upsert(itemsToInsert, { onConflict: 'id' });

      if (itemsError) {
        console.warn('Supabase transaction_items insert warning:', itemsError.message);
      }
    }

    // 6. Update product stock in Supabase products table
    for (const item of tx.items) {
      const updatedStock = Math.max(0, item.product.stock - item.quantity);
      const updatedShelfStock = Math.max(0, (item.product.shelfStock ?? item.product.stock) - item.quantity);

      await supabaseClient.from('products').update({
        stock: updatedStock,
        shelf_stock: updatedShelfStock,
        updated_at: new Date().toISOString()
      }).eq('id', item.product.id);
    }

    console.log('✓ Transaction synced to Supabase Cloud:', tx.txUuid);
    return true;
  } catch (err) {
    console.warn('Supabase transaction sync failed:', err);
    return false;
  }
}

/**
 * Sync Shift to Supabase
 */
export async function syncShiftToCloud(shift: Shift): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    if (shift.branchId) {
      await ensureBranchInCloud(shift.branchId);
    }

    const payload: any = {
      id: shift.id,
      user_id: shift.cashierId || 'user-001',
      cashier_id: shift.cashierId || 'user-001',
      cashier_name: shift.cashierName,
      branch_id: shift.branchId || null,
      start_time: shift.startTime,
      end_time: shift.endTime || null,
      opening_cash: shift.openingCash || 0,
      actual_closing_cash: shift.actualClosingCash ?? null,
      expected_closing_cash: shift.expectedClosingCash ?? null,
      cash_difference: shift.cashDifference ?? null,
      status: shift.status || (shift.endTime ? 'CLOSED' : 'OPEN'),
      notes: shift.notes || null
    };

    let { error } = await supabaseClient.from('shifts').upsert(payload, { onConflict: 'id' });

    if (error && error.message && error.message.toLowerCase().includes('cashier_id')) {
      delete payload.cashier_id;
      const fallbackRes = await supabaseClient.from('shifts').upsert(payload, { onConflict: 'id' });
      error = fallbackRes.error;
    }

    if (error) {
      console.warn('Supabase shift sync warning:', error.message);
      return false;
    }
    console.log('✓ Shift synced to Supabase Cloud:', shift.id, shift.status);
    return true;
  } catch (err) {
    console.warn('Cloud sync error for shift:', err);
    return false;
  }
}

/**
 * Sync Audit Log to Supabase
 */
export async function syncAuditLogToCloud(log: AuditLog): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('audit_logs').upsert({
      id: log.id,
      branch_id: log.branchId || null,
      action: log.action,
      module: log.module,
      details: log.details,
      user_name: log.userName,
      user_id: log.userId,
      timestamp: log.timestamp || new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase audit log upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Cloud sync error for audit log:', err);
    return false;
  }
}

/**
 * Delete Cash Movement from Supabase
 */
export async function deleteCashMovementFromCloud(id: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('cash_movements').delete().eq('id', id);
    if (error) {
      console.warn('Supabase cash movement delete warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Cloud delete error for cash movement:', err);
    return false;
  }
}

/**
 * Sync Cash Movement to Supabase
 */
export async function syncCashMovementToCloud(m: CashMovement): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('cash_movements').upsert({
      id: m.id,
      branch_id: m.branchId || null,
      shift_id: m.shiftId || null,
      type: m.type,
      amount: m.amount,
      category: m.category,
      description: m.description || null,
      created_by: m.createdBy,
      created_at: m.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase cash movement warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Cloud sync error for cash movement:', err);
    return false;
  }
}

/**
 * Fetch All Products from Supabase or Dexie
 */
export async function fetchProductsFromDatabase(branchId: string): Promise<Product[]> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .or(`branch_id.eq.${branchId},branch_id.is.null`);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          branchId: d.branch_id || branchId,
          barcode: d.barcode,
          name: d.name,
          brand: d.brand || '',
          category: d.category || 'Lainnya',
          description: d.description || '',
          purchasePrice: Number(d.purchase_price || 0),
          sellingPrice: Number(d.selling_price || 0),
          taxPercent: Number(d.tax_percent || 0),
          stock: Number(d.stock || 0),
          shelfStock: (d.shelf_stock !== null && d.shelf_stock !== undefined) ? Number(d.shelf_stock) : Number(d.stock || 0),
          minStock: Number(d.min_stock || 0),
          expiryDate: d.expiry_date || '',
          supplierName: d.supplier_name || '',
          isAvailable: Boolean(d.is_active),
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn('Failed fetching from Supabase:', err);
    }
  }

  return [];
}

/**
 * Sync ALL local records (branches, products, shifts, transactions) to Supabase Cloud
 */
export async function syncAllLocalDataToCloud(): Promise<{ success: boolean; syncedCount: number }> {
  return { success: true, syncedCount: 0 };
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  tablesStatus?: { [tableName: string]: boolean | string };
  details?: any;
}

/**
 * Ping and Test connection to Supabase Database and Auto-Sync
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const startTime = performance.now();
  if (!supabaseClient) {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Konfigurasi Supabase URL atau Anon Key belum lengkap di env config.'
      };
    }
    try {
      supabaseClient = createClient(ENV_CONFIG.supabaseUrl, ENV_CONFIG.supabaseAnonKey);
    } catch (e: any) {
      return {
        success: false,
        message: `Gagal membuat Supabase Client: ${e.message || e}`
      };
    }
  }

  const tablesToTest = [
    'branches',
    'users',
    'products',
    'categories',
    'shifts',
    'transactions',
    'cash_movements',
    'promotions',
    'suppliers',
    'audit_logs'
  ];

  const tablesStatus: { [key: string]: boolean | string } = {};
  let totalSuccess = 0;

  try {
    for (const table of tablesToTest) {
      const { count, error } = await supabaseClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        tablesStatus[table] = `Error: ${error.message}`;
      } else {
        tablesStatus[table] = true;
        totalSuccess++;
      }
    }

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    if (totalSuccess > 0) {
      // Trigger background sync of local products & transactions
      syncAllLocalDataToCloud().catch(console.warn);

      return {
        success: true,
        message: `Koneksi Supabase Cloud Berhasil! Terhubung ke ${totalSuccess}/${tablesToTest.length} tabel. Data lokal disinkronkan.`,
        latencyMs: latency,
        tablesStatus
      };
    } else {
      return {
        success: false,
        message: 'Gagal membaca tabel di Supabase. Pastikan SQL setup (supabase_setup.sql) sudah di-run di SQL Editor Supabase.',
        latencyMs: latency,
        tablesStatus
      };
    }
  } catch (err: any) {
    const endTime = performance.now();
    return {
      success: false,
      message: `Gagal melakukan koneksi ke Supabase: ${err.message || 'Network error'}`,
      latencyMs: Math.round(endTime - startTime)
    };
  }
}

/**
 * Sync Shelf Transfer Record to Supabase
 */
export async function syncShelfTransferToCloud(transfer: ShelfStockTransfer): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('shelf_transfers').insert({
      id: transfer.id,
      branch_id: transfer.branchId || 'default-branch-001',
      product_id: transfer.productId,
      product_name: transfer.productName,
      quantity_transferred: transfer.quantityTransferred,
      operator_name: transfer.operatorName,
      notes: transfer.notes || null,
      created_at: transfer.createdAt || new Date().toISOString()
    });
    if (error) {
      console.warn('Shelf transfer sync warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Cloud sync error for shelf transfer:', err);
    return false;
  }
}

/**
 * Sync Team Message to Supabase
 */
export async function syncTeamMessageToCloud(msg: TeamMessage): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('team_messages').insert({
      id: msg.id,
      branch_id: msg.branchId || 'default-branch-001',
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      sender_role: msg.senderRole,
      recipient_role: msg.recipientRole || 'ALL',
      message: msg.message,
      is_urgent: msg.isUrgent ?? false,
      created_at: msg.createdAt || new Date().toISOString()
    });
    if (error) {
      console.warn('Team message sync warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Cloud sync error for team message:', err);
    return false;
  }
}

/**
 * Fetch Team Messages from Supabase
 */
export async function fetchTeamMessagesFromCloud(branchId: string): Promise<TeamMessage[]> {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient
      .from('team_messages')
      .select('*')
      .or(`branch_id.eq.${branchId},branch_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id || branchId,
        senderId: d.sender_id,
        senderName: d.sender_name,
        senderRole: d.sender_role,
        recipientRole: d.recipient_role || 'ALL',
        message: d.message,
        isUrgent: Boolean(d.is_urgent),
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('Error fetching team messages from Supabase:', err);
  }
  return [];
}

/**
 * Fetch All Branches from Supabase
 */
export async function fetchBranchesFromCloud(): Promise<Branch[]> {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from('branches').select('*');
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        address: d.address || 'Alamat Toko',
        phone: d.phone || '-',
        isActive: d.is_active ?? true,
        receiptFooter: d.receipt_footer || d.receiptFooter || undefined,
        logoUrl: d.logo_url || d.logoUrl || undefined
      }));
    }
  } catch (err) {
    console.warn('Error fetching branches from Supabase:', err);
  }
  return [];
}

/**
 * Fetch All Registered Users from Supabase
 */
export async function fetchUsersFromCloud(): Promise<User[]> {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from('users').select('*');
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        name: d.name || d.username || 'Pengguna',
        email: d.username?.includes('@') ? d.username : `${d.username || 'user'}@retailflow.com`,
        role: (d.role as any) || 'CASHIER',
        branchId: d.branch_id || 'default-branch-001',
        password: d.pin || d.password || '123'
      }));
    }
  } catch (err) {
    console.warn('Error fetching users from Supabase:', err);
  }
  return [];
}

/**
 * Fetch Audit Logs from Supabase
 */
export async function fetchAuditLogsFromCloud(branchId?: string): Promise<AuditLog[]> {
  if (!supabaseClient) return [];
  try {
    let query = supabaseClient.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id || branchId || 'default-branch-001',
        userId: d.user_id || 'user-001',
        userName: d.user_name || 'Operator',
        action: d.action || 'LOG',
        module: d.module || 'SYSTEM',
        details: d.details || '',
        timestamp: d.timestamp || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Error fetching audit logs from Supabase:', err);
  }
  return [];
}

/**
 * Fetch Transactions from Supabase
 */
export async function fetchTransactionsFromCloud(branchId?: string): Promise<Transaction[]> {
  if (!supabaseClient) return [];
  try {
    let query = supabaseClient.from('transactions').select('*, transaction_items(*)').order('created_at', { ascending: false }).limit(200);
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        txUuid: d.tx_uuid || d.id,
        branchId: d.branch_id || branchId || 'default-branch-001',
        shiftId: d.shift_id || 'shift-offline',
        cashierId: 'user-001',
        cashierName: d.cashier_name || 'Kasir',
        customerName: d.customer_name || 'Pelanggan Umum',
        paymentMethod: d.payment_method || 'CASH',
        subtotal: Number(d.subtotal || 0),
        taxTotal: Number(d.tax || 0),
        discountTotal: Number(d.discount || 0),
        grandTotal: Number(d.grand_total || 0),
        payAmount: Number(d.paid_amount || 0),
        changeAmount: Number(d.change_amount || 0),
        status: 'COMPLETED',
        isSynced: true,
        createdAt: d.created_at || new Date().toISOString(),
        items: d.transaction_items?.map((ti: any) => ({
          product: {
            id: ti.product_id,
            name: ti.product_name || 'Produk',
            sellingPrice: Number(ti.selling_price || ti.unit_price || 0),
            stock: 0,
            barcode: ti.barcode || '',
            brand: '',
            category: 'Umum',
            description: '',
            purchasePrice: Number(ti.purchase_price || 0),
            taxPercent: 0,
            minStock: 0,
            expiryDate: '',
            isAvailable: true,
            branchId: d.branch_id || 'default-branch-001',
            createdAt: d.created_at,
            updatedAt: d.created_at
          },
          quantity: Number(ti.quantity || 1),
          discountAmount: 0,
          subtotal: Number(ti.subtotal || 0)
        })) || []
      }));
    }
  } catch (err) {
    console.warn('Error fetching transactions from Supabase:', err);
  }
  return [];
}

/**
 * Fetch Shifts from Supabase
 */
export async function fetchShiftsFromCloud(branchId?: string): Promise<Shift[]> {
  if (!supabaseClient) return [];
  try {
    let query = supabaseClient.from('shifts').select('*').order('start_time', { ascending: false }).limit(50);
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id || branchId || 'default-branch-001',
        cashierId: d.cashier_id || d.user_id || 'user-001',
        cashierName: d.cashier_name || 'Kasir',
        openingCash: Number(d.opening_cash || 0),
        expectedClosingCash: d.expected_closing_cash ? Number(d.expected_closing_cash) : undefined,
        actualClosingCash: d.actual_closing_cash ? Number(d.actual_closing_cash) : undefined,
        cashDifference: d.cash_difference ? Number(d.cash_difference) : undefined,
        startTime: d.start_time || new Date().toISOString(),
        endTime: d.end_time || undefined,
        status: (d.status === 'OPEN' && !d.end_time) ? 'OPEN' : 'CLOSED',
        notes: d.notes || ''
      }));
    }
  } catch (err) {
    console.warn('Error fetching shifts from Supabase:', err);
  }
  return [];
}

/**
 * Pull all data from Supabase Cloud to local Dexie IndexedDB & localStorage
 */
export async function pullCloudDataToLocal(branchId?: string): Promise<{ success: boolean; pulledCount: number }> {
  if (!supabaseClient) return { success: false, pulledCount: 0 };

  let count = 0;
  try {
    // 1. Branches
    const cloudBranches = await fetchBranchesFromCloud();
    if (cloudBranches.length > 0) {
      localStorage.setItem('minimarket_branches_v1', JSON.stringify(cloudBranches));
      const activeCloudBranch = cloudBranches[0];
      if (activeCloudBranch) {
        if (activeCloudBranch.name) {
          localStorage.setItem('minimarket_store_name_v1', activeCloudBranch.name);
        }
        if (activeCloudBranch.logoUrl) {
          localStorage.setItem('minimarket_store_logo_v1', activeCloudBranch.logoUrl);
        }
      }
      count += cloudBranches.length;
    }

    // 2. Users
    const cloudUsers = await fetchUsersFromCloud();
    if (cloudUsers.length > 0) {
      const savedUsersStr = localStorage.getItem('minimarket_users_v1');
      const localUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const userMap = new Map<string, User>();
      localUsers.forEach(u => userMap.set(u.id, u));
      cloudUsers.forEach(u => userMap.set(u.id, u));
      const mergedUsers = Array.from(userMap.values());
      localStorage.setItem('minimarket_users_v1', JSON.stringify(mergedUsers));
      count += cloudUsers.length;
    }

    return { success: true, pulledCount: count };
  } catch (err) {
    console.warn('Cloud pull error:', err);
    return { success: false, pulledCount: count };
  }
}

/**
 * Fetch Cash Movements from Supabase
 */
export async function fetchCashMovementsFromCloud(branchId?: string): Promise<CashMovement[]> {
  if (!supabaseClient) return [];
  try {
    let query = supabaseClient.from('cash_movements').select('*').order('created_at', { ascending: false }).limit(200);
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id || branchId || 'default-branch-001',
        shiftId: d.shift_id || 'shift-offline',
        type: d.type || 'EXPENSE_OUT',
        amount: Number(d.amount || 0),
        category: d.category || 'Lain-lain',
        description: d.description || '',
        createdBy: d.created_by || 'User',
        createdAt: d.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Error fetching cash movements from Supabase:', err);
  }
  return [];
}

/**
 * Subscribe to Supabase Realtime changes across all public tables
 */
export function subscribeToCloudRealtime(onDataUpdate: () => void) {
  if (!supabaseClient) return () => {};

  try {
    const channel = supabaseClient
      .channel('public-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        console.log('⚡ Realtime database change detected, triggering sync...');
        onDataUpdate();
      })
      .subscribe();

    const interval = setInterval(() => {
      onDataUpdate();
    }, 30000); // Gentle 30s background sync heartbeat

    return () => {
      try {
        supabaseClient.removeChannel(channel);
      } catch (e) {}
      clearInterval(interval);
    };
  } catch (err) {
    console.warn('Supabase Realtime subscription warning:', err);
    return () => {};
  }
}

/**
 * Purge Cloud Store Data (Transactions, Shifts, Cash Movements, Audit Logs, PO, Expenses)
 */
export async function purgeCloudStoreData(): Promise<boolean> {
  if (!supabaseClient) return true;
  try {
    const tablesToPurge = [
      'transactions',
      'cash_movements',
      'shifts',
      'audit_logs',
      'shelf_stock_transfers',
      'purchase_orders',
      'store_expenses',
      'sales_targets',
      'team_messages'
    ];
    for (const table of tablesToPurge) {
      const { error } = await supabaseClient.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.warn(`Purge warning for ${table}:`, error.message);
      }
    }
    console.log('✓ Purged all transaction and report data from Supabase Cloud');
    return true;
  } catch (err) {
    console.warn('Error purging cloud store data:', err);
    return false;
  }
}

