import { Product, Transaction, Shift, AuditLog, CashMovement, ShelfStockTransfer, TeamMessage, PurchaseOrder, StoreExpense, SalesTarget, User } from '../types';
import {
  getSupabaseClient,
  syncProductToCloud,
  deleteProductFromCloud,
  syncTransactionToCloud,
  syncShiftToCloud,
  syncAuditLogToCloud,
  fetchProductsFromDatabase,
  syncShelfTransferToCloud,
  syncTeamMessageToCloud,
  fetchTeamMessagesFromCloud,
  purgeCloudStoreData,
  fetchShiftsFromCloud
} from './supabase';

export const API_BASE = '/api';

/**
 * Fetch Products directly from Online Supabase Cloud Database
 */
export async function fetchServerProducts(branchId = 'default-branch-001'): Promise<Product[]> {
  try {
    const products = await fetchProductsFromDatabase(branchId);
    return products || [];
  } catch (e) {
    console.warn('Error fetching products from cloud:', e);
    return [];
  }
}

/**
 * Save / Update Product directly in Supabase Cloud
 */
export async function saveProduct(product: Partial<Product>, operatorName = 'Manager'): Promise<Product> {
  const isNew = !product.id;
  const shelfStockVal = product.shelfStock !== undefined
    ? Number(product.shelfStock)
    : (product.stock !== undefined ? Number(product.stock) : 0);

  const fullProduct: Product = {
    id: product.id || `prod-${Date.now()}`,
    branchId: product.branchId || 'default-branch-001',
    barcode: product.barcode || '',
    name: product.name || 'Unnamed SKU',
    brand: product.brand || 'Generic',
    category: product.category || 'General',
    description: product.description || '',
    purchasePrice: Number(product.purchasePrice) || 0,
    sellingPrice: Number(product.sellingPrice) || 0,
    taxPercent: Number(product.taxPercent) || 0,
    stock: Number(product.stock) || 0,
    shelfStock: shelfStockVal,
    minStock: Number(product.minStock) || 5,
    expiryDate: product.expiryDate || '2027-12-31',
    supplierName: product.supplierName || '',
    isAvailable: true,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Sync directly to Supabase Cloud
  await syncProductToCloud(fullProduct);

  await logAudit(
    isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
    'INVENTORY',
    `${isNew ? 'Menambah' : 'Memperbarui'} produk: ${fullProduct.name} (Stok: ${fullProduct.stock})`,
    operatorName
  );

  return fullProduct;
}

/**
 * Delete Product directly from Supabase Cloud
 */
export async function deleteProduct(productId: string, operatorName = 'Manager'): Promise<boolean> {
  try {
    const ok = await deleteProductFromCloud(productId);
    await logAudit('DELETE_PRODUCT', 'INVENTORY', `Menghapus SKU produk (ID: ${productId})`, operatorName);
    return ok;
  } catch (err) {
    console.error('Failed to delete product from cloud:', err);
    return false;
  }
}

/**
 * Process Completed Transaction directly in Supabase Cloud
 */
export async function processCompletedTransaction(tx: Transaction): Promise<{ success: boolean; synced: boolean }> {
  try {
    const supabaseSynced = await syncTransactionToCloud(tx);
    return { success: true, synced: supabaseSynced };
  } catch (err) {
    console.error('Failed to save transaction to cloud:', err);
    return { success: false, synced: false };
  }
}

/**
 * Trigger Background Sync Queue (No-op for pure online database)
 */
export async function triggerBackgroundSyncQueue(): Promise<boolean> {
  return true;
}

/**
 * Open Shift directly in Supabase Cloud
 */
export async function openShiftServer(cashierId: string, cashierName: string, openingCash: number, branchId = 'default-branch-001'): Promise<Shift> {
  // Prevent double open shift if a shift is already open across devices
  const existingShift = await getActiveShiftServer(branchId);
  if (existingShift) {
    console.log('✓ Found existing active shift, reusing:', existingShift.id);
    return existingShift;
  }

  const newShift: Shift = {
    id: `shift-${Date.now()}`,
    branchId,
    cashierId,
    cashierName,
    openingCash,
    startTime: new Date().toISOString(),
    status: 'OPEN'
  };

  // Persist locally immediately
  try {
    localStorage.setItem('minimarket_active_shift_v1', JSON.stringify(newShift));
  } catch (e) {}

  // Sync to Supabase directly
  await syncShiftToCloud(newShift);

  await logAudit(
    'OPEN_SHIFT',
    'POS_SHIFT',
    `Buka Shift oleh ${cashierName}. Modal Awal: Rp ${openingCash.toLocaleString('id-ID')}`,
    cashierName,
    cashierId,
    branchId
  );

  return newShift;
}

/**
 * Get Active Open Shift directly from Supabase Cloud with Local Fallback
 */
export async function getActiveShiftServer(branchId = 'default-branch-001'): Promise<Shift | null> {
  try {
    const shifts = await fetchShiftsFromCloud(branchId);
    let openShift = shifts.find((s) => String(s.status).toUpperCase() === 'OPEN' && !s.endTime);

    if (!openShift) {
      const allShifts = await fetchShiftsFromCloud();
      openShift = allShifts.find((s) => String(s.status).toUpperCase() === 'OPEN' && !s.endTime);
    }

    if (openShift) {
      try {
        localStorage.setItem('minimarket_active_shift_v1', JSON.stringify(openShift));
      } catch (e) {}
      return openShift;
    }
  } catch (e) {
    console.warn('Error checking active shift from cloud:', e);
  }

  // Fallback to localStorage
  try {
    const localActive = localStorage.getItem('minimarket_active_shift_v1');
    if (localActive) {
      const parsed = JSON.parse(localActive);
      if (parsed && String(parsed.status).toUpperCase() === 'OPEN' && !parsed.endTime) {
        return parsed;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Close Shift directly in Supabase Cloud
 */
export async function closeShiftServer(shiftId: string, actualClosingCash: number, notes?: string): Promise<Shift | null> {
  // Clear local active shift
  try {
    localStorage.removeItem('minimarket_active_shift_v1');
  } catch (e) {}

  const client = getSupabaseClient();
  let shiftData: any = null;

  if (client) {
    try {
      const { data } = await client.from('shifts').select('*').eq('id', shiftId).maybeSingle();
      shiftData = data;
    } catch (e) {}
  }

  const openingCash = Number(shiftData?.opening_cash || 100000);
  const cashierName = shiftData?.cashier_name || 'Kasir';
  const cashierId = shiftData?.cashier_id || shiftData?.user_id || 'user-001';
  const branchId = shiftData?.branch_id || 'default-branch-001';
  const startTime = shiftData?.start_time || new Date().toISOString();

  let cashSales = 0;
  let totalCashIn = 0;
  let totalExpenseOut = 0;

  if (client) {
    try {
      const { data: txsData } = await client
        .from('transactions')
        .select('grand_total, payment_method')
        .eq('shift_id', shiftId);

      cashSales = (txsData || [])
        .filter((t: any) => t.payment_method === 'CASH')
        .reduce((sum: number, t: any) => sum + Number(t.grand_total || 0), 0);

      const { data: cmData } = await client
        .from('cash_movements')
        .select('amount, type')
        .eq('shift_id', shiftId);

      totalCashIn = (cmData || [])
        .filter((m: any) => m.type === 'CASH_IN')
        .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

      totalExpenseOut = (cmData || [])
        .filter((m: any) => m.type === 'EXPENSE_OUT')
        .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);
    } catch (e) {}
  }

  const expectedClosingCash = openingCash + cashSales + totalCashIn - totalExpenseOut;
  const cashDifference = actualClosingCash - expectedClosingCash;

  const closedShift: Shift = {
    id: shiftId,
    branchId,
    cashierId,
    cashierName,
    openingCash,
    expectedClosingCash,
    actualClosingCash,
    cashDifference,
    startTime,
    endTime: new Date().toISOString(),
    status: 'CLOSED',
    notes: notes || ''
  };

  await syncShiftToCloud(closedShift);

  await logAudit(
    'CLOSE_SHIFT',
    'POS_SHIFT',
    `Tutup Shift oleh ${cashierName}. Kas Fisik: Rp ${actualClosingCash.toLocaleString('id-ID')} | Selisih: Rp ${cashDifference.toLocaleString('id-ID')}`,
    cashierName,
    cashierId,
    branchId
  );

  return closedShift;
}

/**
 * Log Audit Event directly to Supabase Cloud
 */
export async function logAudit(
  action: string,
  module: string,
  details: string,
  userName = 'Operator',
  userId = 'user-001',
  branchId = 'default-branch-001'
) {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    branchId,
    userId,
    userName,
    action,
    module,
    details,
    timestamp: new Date().toISOString()
  };

  await syncAuditLogToCloud(log);
}

/**
 * Transfer Product Stock from Warehouse to Retail Display Shelf directly in Supabase Cloud
 */
export async function transferStockToShelf(
  productId: string,
  quantity: number,
  operatorName = 'Kasir',
  notes = 'Pindah ke etalase/rak kasir'
): Promise<{ success: boolean; product?: Product; message?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Koneksi Supabase Cloud tidak tersedia.' };

  try {
    const { data: prodData, error } = await client.from('products').select('*').eq('id', productId).maybeSingle();
    if (error || !prodData) {
      return { success: false, message: 'Produk tidak ditemukan di database online.' };
    }

    const currentStock = Number(prodData.stock || 0);
    if (currentStock < quantity) {
      return {
        success: false,
        message: `Stok gudang tidak cukup! Stok gudang saat ini: ${currentStock} unit.`
      };
    }

    const currentShelf = prodData.shelf_stock !== null && prodData.shelf_stock !== undefined ? Number(prodData.shelf_stock) : currentStock;
    const newStock = currentStock - quantity;
    const newShelf = currentShelf + quantity;

    const updatedProduct: Product = {
      id: prodData.id,
      branchId: prodData.branch_id || 'default-branch-001',
      barcode: prodData.barcode,
      name: prodData.name,
      brand: prodData.brand || 'Generic',
      category: prodData.category || 'General',
      description: prodData.description || '',
      purchasePrice: Number(prodData.purchase_price || 0),
      sellingPrice: Number(prodData.selling_price || 0),
      taxPercent: Number(prodData.tax_percent || 0),
      stock: newStock,
      shelfStock: newShelf,
      minStock: Number(prodData.min_stock || 5),
      expiryDate: prodData.expiry_date || '2027-12-31',
      supplierName: prodData.supplier_name || '',
      isAvailable: prodData.is_active ?? true,
      createdAt: prodData.created_at,
      updatedAt: new Date().toISOString()
    };

    await syncProductToCloud(updatedProduct);

    const transferRecord: ShelfStockTransfer = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      branchId: updatedProduct.branchId || 'default-branch-001',
      productId: updatedProduct.id,
      productName: updatedProduct.name,
      quantityTransferred: quantity,
      operatorName,
      notes,
      createdAt: new Date().toISOString()
    };
    await syncShelfTransferToCloud(transferRecord);

    await logAudit(
      'SHELF_RESTOCK',
      'POS_INVENTORY',
      `Transfer dari Gudang ke Rak: +${quantity} unit untuk ${updatedProduct.name}. Stok Gudang: ${newStock} | Stok Rak: ${newShelf}`,
      operatorName
    );

    return { success: true, product: updatedProduct };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memindahkan stok ke rak.' };
  }
}

/**
 * Adjust Display Shelf Stock (Opname Rak POS) directly in Supabase Cloud
 */
export async function adjustShelfStock(
  productId: string,
  newShelfStock: number,
  operatorName = 'Kasir',
  notes = 'Opname Rak POS'
): Promise<{ success: boolean; product?: Product; message?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Koneksi database online tidak tersedia' };

  try {
    const { data: prodData } = await client.from('products').select('*').eq('id', productId).maybeSingle();
    if (!prodData) return { success: false, message: 'Produk tidak ditemukan' };

    const oldShelf = prodData.shelf_stock !== null ? Number(prodData.shelf_stock) : Number(prodData.stock || 0);
    const diff = newShelfStock - oldShelf;

    const updatedProduct: Product = {
      id: prodData.id,
      branchId: prodData.branch_id || 'default-branch-001',
      barcode: prodData.barcode,
      name: prodData.name,
      brand: prodData.brand || 'Generic',
      category: prodData.category || 'General',
      description: prodData.description || '',
      purchasePrice: Number(prodData.purchase_price || 0),
      sellingPrice: Number(prodData.selling_price || 0),
      taxPercent: Number(prodData.tax_percent || 0),
      stock: Number(prodData.stock || 0),
      shelfStock: Math.max(0, newShelfStock),
      minStock: Number(prodData.min_stock || 5),
      expiryDate: prodData.expiry_date || '2027-12-31',
      supplierName: prodData.supplier_name || '',
      isAvailable: prodData.is_active ?? true,
      createdAt: prodData.created_at,
      updatedAt: new Date().toISOString()
    };

    await syncProductToCloud(updatedProduct);

    await logAudit(
      'SHELF_OPNAME',
      'POS_INVENTORY',
      `Opname Rak POS: ${updatedProduct.name} disesuaikan dari ${oldShelf} -> ${newShelfStock} (Selisih: ${diff >= 0 ? '+' : ''}${diff}). Ket: ${notes}`,
      operatorName
    );

    return { success: true, product: updatedProduct };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal opname rak' };
  }
}

/**
 * Team Internal Chat & Messages
 */
export async function sendTeamMessage(msg: Omit<TeamMessage, 'id' | 'createdAt'>): Promise<TeamMessage> {
  const fullMsg: TeamMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    createdAt: new Date().toISOString()
  };

  await syncTeamMessageToCloud(fullMsg);
  return fullMsg;
}

export async function getBranchTeamMessages(branchId = 'default-branch-001'): Promise<TeamMessage[]> {
  const msgs = await fetchTeamMessagesFromCloud(branchId);
  if (msgs && msgs.length > 0) return msgs;

  return [{
    id: 'msg-welcome-001',
    branchId,
    senderId: 'user-001',
    senderName: 'Sistem Toko',
    senderRole: 'OWNER',
    recipientRole: 'ALL',
    message: 'Selamat bertugas! Gunakan fitur Chat Tim untuk koordinasi pergantian shift dan info mendesak.',
    isUrgent: false,
    createdAt: new Date().toISOString()
  }];
}

/**
 * Purchase Orders (PO) - Online direct query
 */
export async function getPurchaseOrders(branchId = 'default-branch-001'): Promise<PurchaseOrder[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data } = await client.from('purchase_orders').select('*').eq('branch_id', branchId).order('created_at', { ascending: false });
    if (data) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id,
        poNumber: d.po_number,
        supplierName: d.supplier_name,
        totalAmount: Number(d.total_amount || 0),
        status: d.status,
        items: d.items || [],
        createdBy: d.created_by || 'Admin',
        createdAt: d.created_at,
        receivedAt: d.received_at,
        receivedBy: d.received_by
      }));
    }
  } catch (e) {}
  return [];
}

export async function createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt'>): Promise<PurchaseOrder> {
  const newPO: PurchaseOrder = {
    ...po,
    id: `po-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    createdAt: new Date().toISOString()
  };

  const client = getSupabaseClient();
  if (client) {
    await client.from('purchase_orders').upsert({
      id: newPO.id,
      branch_id: newPO.branchId,
      po_number: newPO.poNumber,
      supplier_name: newPO.supplierName,
      total_amount: newPO.totalAmount,
      status: newPO.status,
      items: newPO.items,
      created_at: newPO.createdAt
    });
  }

  await logAudit(
    'CREATE_PURCHASE_ORDER',
    'INVENTORY_PO',
    `Buat PO #${newPO.poNumber} ke ${newPO.supplierName} Total: Rp ${newPO.totalAmount.toLocaleString('id-ID')}`,
    'Manager',
    'user-001',
    newPO.branchId
  );
  return newPO;
}

export async function updatePOStatus(poId: string, status: 'ORDERED' | 'RECEIVED' | 'CANCELLED', receivedBy?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { data: poData } = await client.from('purchase_orders').select('*').eq('id', poId).maybeSingle();
    if (!poData) return false;

    const oldStatus = poData.status;
    const items = poData.items || [];

    if (status === 'RECEIVED') {
      for (const item of items) {
        const { data: prodData } = await client.from('products').select('*').eq('id', item.productId).maybeSingle();
        if (prodData) {
          const currentStock = Number(prodData.stock || 0);
          const addedStock = Number(item.quantityReceived || item.quantityOrdered || 0);
          await client.from('products').update({
            stock: currentStock + addedStock,
            updated_at: new Date().toISOString()
          }).eq('id', item.productId);
        }
      }
    }

    await client.from('purchase_orders').update({
      status,
      received_at: status === 'RECEIVED' ? new Date().toISOString() : poData.received_at,
      received_by: status === 'RECEIVED' ? (receivedBy || 'Manager') : poData.received_by
    }).eq('id', poId);

    await logAudit(
      'UPDATE_PO_STATUS',
      'INVENTORY_PO',
      `Ubah status PO #${poData.po_number} dari ${oldStatus} -> ${status}`,
      receivedBy || 'Manager',
      'user-001',
      poData.branch_id
    );
    return true;
  } catch (err) {
    console.error('updatePOStatus error:', err);
    return false;
  }
}

/**
 * Store Expenses - Online direct query
 */
export async function getStoreExpenses(branchId = 'default-branch-001'): Promise<StoreExpense[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data } = await client.from('store_expenses').select('*').eq('branch_id', branchId).order('created_at', { ascending: false });
    if (data) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id,
        category: d.category,
        amount: Number(d.amount || 0),
        description: d.description || '',
        createdBy: d.created_by || 'Manager',
        createdAt: d.created_at
      }));
    }
  } catch (e) {}
  return [];
}

export async function addStoreExpense(expense: Omit<StoreExpense, 'id' | 'createdAt'>): Promise<StoreExpense> {
  const newExpense: StoreExpense = {
    ...expense,
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    createdAt: new Date().toISOString()
  };

  const client = getSupabaseClient();
  if (client) {
    await client.from('store_expenses').upsert({
      id: newExpense.id,
      branch_id: newExpense.branchId,
      category: newExpense.category,
      amount: newExpense.amount,
      description: newExpense.description,
      created_by: newExpense.createdBy,
      created_at: newExpense.createdAt
    });
  }

  await logAudit(
    'ADD_STORE_EXPENSE',
    'FINANCE_EXPENSE',
    `Catat beban ${newExpense.category}: Rp ${newExpense.amount.toLocaleString('id-ID')} (${newExpense.description})`,
    newExpense.createdBy,
    'user-001',
    newExpense.branchId
  );
  return newExpense;
}

/**
 * Sales Targets - Online direct query
 */
export async function getSalesTargets(branchId = 'default-branch-001'): Promise<SalesTarget[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data } = await client.from('sales_targets').select('*').eq('branch_id', branchId);
    if (data) {
      return data.map((d: any) => ({
        id: d.id,
        branchId: d.branch_id,
        monthYear: d.month_year,
        targetRevenue: Number(d.target_revenue || d.target_amount || 0),
        targetProfit: Number(d.target_profit || 0),
        createdAt: d.created_at
      }));
    }
  } catch (e) {}
  return [];
}

export async function saveSalesTarget(target: Omit<SalesTarget, 'id' | 'createdAt'>): Promise<SalesTarget> {
  const fullTarget: SalesTarget = {
    ...target,
    id: `target-${target.branchId}-${target.monthYear}`,
    createdAt: new Date().toISOString()
  };

  const client = getSupabaseClient();
  if (client) {
    await client.from('sales_targets').upsert({
      id: fullTarget.id,
      branch_id: fullTarget.branchId,
      month_year: fullTarget.monthYear,
      target_revenue: fullTarget.targetRevenue,
      target_profit: fullTarget.targetProfit,
      created_at: fullTarget.createdAt
    });
  }

  return fullTarget;
}

/**
 * Purge All Store Data in Supabase Cloud
 */
export async function purgeAllStoreData(ownerPassword: string, currentUser: User): Promise<{ success: boolean; message: string }> {
  if (currentUser.role !== 'OWNER') {
    return { success: false, message: 'Akses ditolak. Hanya Owner yang berhak mereset data toko.' };
  }

  let expectedPass = (currentUser.password || '123').trim();
  try {
    const savedUsersStr = localStorage.getItem('minimarket_users_v1');
    if (savedUsersStr) {
      const parsed: User[] = JSON.parse(savedUsersStr);
      const ownerUser = parsed.find((u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase() || u.role === 'OWNER');
      if (ownerUser && ownerUser.password) {
        expectedPass = ownerUser.password.trim();
      }
    }
  } catch (e) {}

  if (ownerPassword.trim() !== expectedPass) {
    return { success: false, message: 'Password / PIN Owner tidak valid! Reset data dibatalkan.' };
  }

  try {
    await purgeCloudStoreData();

    await logAudit(
      'FACTORY_RESET_PURGE',
      'SETTINGS',
      `Mereset seluruh data transaksi, keuangan, dan laporan toko oleh Owner ${currentUser.name}`,
      currentUser.name,
      currentUser.id
    );

    return {
      success: true,
      message: 'Berhasil mereset seluruh data transaksi, keuangan, shift, dan laporan toko di Supabase Cloud. Data kini murni bersih 0!'
    };
  } catch (err: any) {
    console.error('purgeAllStoreData error:', err);
    return {
      success: false,
      message: `Gagal mereset data toko: ${err.message || err}`
    };
  }
}
