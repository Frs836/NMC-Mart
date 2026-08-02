import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// CORS Headers Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// URL Path Normalizer Middleware for Serverless Rewrites
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api/') && req.url !== '/api') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// In-Memory Database Store for Server Persistence Demonstration
let serverProducts: any[] = [
  {
    id: 'prod-001',
    branchId: 'default-branch-001',
    barcode: '89999990001',
    name: 'Mineral Water 600ml',
    brand: 'Aqua',
    category: 'Beverages',
    description: 'Refreshing pure spring water 600ml bottle',
    purchasePrice: 2500,
    sellingPrice: 4000,
    taxPercent: 0,
    stock: 142,
    shelfStock: 24,
    minStock: 20,
    expiryDate: '2027-01-01',
    supplierName: 'PT Tirta Investama',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-002',
    branchId: 'default-branch-001',
    barcode: '89999990002',
    name: 'Potato Chips BBQ 68g',
    brand: 'Lays',
    category: 'Snacks',
    description: 'Crispy savory barbecue flavor potato chips',
    purchasePrice: 7500,
    sellingPrice: 10500,
    taxPercent: 0,
    stock: 8,
    shelfStock: 2,
    minStock: 15,
    expiryDate: '2026-11-15',
    supplierName: 'Indofood Sukses Makmur',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-003',
    branchId: 'default-branch-001',
    barcode: '89999990003',
    name: 'Instant Noodles Chicken 85g',
    brand: 'Indomie',
    category: 'Groceries',
    description: 'Classic chicken flavor instant fried noodles',
    purchasePrice: 2800,
    sellingPrice: 3500,
    taxPercent: 0,
    stock: 250,
    shelfStock: 48,
    minStock: 50,
    expiryDate: '2026-08-20',
    supplierName: 'Indofood Sukses Makmur',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-004',
    branchId: 'default-branch-001',
    barcode: '89999990004',
    name: 'Full Cream Milk 1L',
    brand: 'Ultra Milk',
    category: 'Dairy',
    description: 'UHT fresh full cream liquid milk 1 Liter',
    purchasePrice: 16500,
    sellingPrice: 21000,
    taxPercent: 0,
    stock: 5,
    shelfStock: 1,
    minStock: 10,
    expiryDate: '2026-04-10',
    supplierName: 'PT Ultrajaya Milk',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-005',
    branchId: 'default-branch-001',
    barcode: '89999990005',
    name: 'White Bread Sliced',
    brand: 'Sari Roti',
    category: 'Bakery',
    description: 'Soft white sandwich bread slice pack',
    purchasePrice: 11000,
    sellingPrice: 14500,
    taxPercent: 0,
    stock: 12,
    shelfStock: 4,
    minStock: 8,
    expiryDate: '2026-03-01',
    supplierName: 'PT Nippon Indosari Corp',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-006',
    branchId: 'default-branch-001',
    barcode: '89999990006',
    name: 'Green Tea Bottle 500ml',
    brand: 'Teh Pucuk',
    category: 'Beverages',
    description: 'Jasmine green tea sweet flavor 500ml',
    purchasePrice: 3000,
    sellingPrice: 4500,
    taxPercent: 0,
    stock: 88,
    shelfStock: 18,
    minStock: 25,
    expiryDate: '2027-02-14',
    supplierName: 'PT Mayora Indah',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-007',
    branchId: 'default-branch-001',
    barcode: '89999990007',
    name: 'Dishwashing Liquid 780ml',
    brand: 'Sunlight',
    category: 'Household',
    description: 'Lime power dishwashing liquid refill 780ml',
    purchasePrice: 13500,
    sellingPrice: 17500,
    taxPercent: 0,
    stock: 34,
    shelfStock: 8,
    minStock: 10,
    expiryDate: '2028-05-01',
    supplierName: 'Unilever Indonesia',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-008',
    branchId: 'default-branch-001',
    barcode: '89999990008',
    name: 'Chocolate Wafer Bar 45g',
    brand: 'KitKat',
    category: 'Snacks',
    description: 'Crispy wafer fingers in milk chocolate',
    purchasePrice: 6000,
    sellingPrice: 8500,
    taxPercent: 0,
    stock: 3,
    shelfStock: 1,
    minStock: 12,
    expiryDate: '2026-03-15',
    supplierName: 'Nestle Indonesia',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let serverTransactions: any[] = [];
let serverShifts: any[] = [];
let serverAuditLogs: any[] = [
  {
    id: 'audit-001',
    branchId: 'default-branch-001',
    userId: 'user-001',
    userName: 'Budi (Owner)',
    action: 'SYSTEM_INITIALIZATION',
    module: 'SYSTEM',
    details: 'RetailFlow POS Initialized with default minimarket master catalog.',
    timestamp: new Date().toISOString()
  }
];

// Lazy Gemini AI Setup
const STALE_DEFAULT_ENV_KEY = 'AQ.Ab8RN6J7-c5m4Qr6SpneKbZVxjgLiGRS0Wmc859uKKkQcd6K4A';

function getGeminiClient(customKey?: string): GoogleGenAI | null {
  const apiKey = (customKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === STALE_DEFAULT_ENV_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// REST API Endpoints

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'RetailFlow POS Server',
    time: new Date().toISOString(),
    productsCount: serverProducts.length,
    transactionsCount: serverTransactions.length
  });
});

// 2. Products API
app.get('/api/products', (req, res) => {
  const branchId = (req.query.branchId as string) || 'default-branch-001';
  const filtered = serverProducts.filter((p) => !p.branchId || p.branchId === branchId || branchId === 'default-branch-001');
  res.json({ success: true, data: filtered });
});

app.post('/api/products', (req, res) => {
  const newProduct = {
    ...req.body,
    id: req.body.id || `prod-${Date.now()}`,
    branchId: req.body.branchId || 'default-branch-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const existingIdx = serverProducts.findIndex((p) => p.id === newProduct.id);
  if (existingIdx !== -1) {
    serverProducts[existingIdx] = newProduct;
  } else {
    serverProducts.push(newProduct);
  }

  serverAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    branchId: newProduct.branchId || 'default-branch-001',
    userId: req.body.operatorId || 'system',
    userName: req.body.operatorName || 'Manager',
    action: 'ADD_PRODUCT',
    module: 'INVENTORY',
    details: `Added new SKU: ${newProduct.name} (${newProduct.barcode}) with stock ${newProduct.stock}`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, data: newProduct });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = serverProducts.findIndex((p) => p.id === id);
  if (index === -1) {
    const newProduct = {
      ...req.body,
      id,
      branchId: req.body.branchId || 'default-branch-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    serverProducts.push(newProduct);
    res.json({ success: true, data: newProduct });
    return;
  }
  const oldProduct = serverProducts[index];
  const updated = {
    ...oldProduct,
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  serverProducts[index] = updated;

  serverAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    branchId: updated.branchId || 'default-branch-001',
    userId: req.body.operatorId || 'system',
    userName: req.body.operatorName || 'Manager',
    action: 'UPDATE_PRODUCT',
    module: 'INVENTORY',
    details: `Updated SKU ${updated.name}: Stock (${oldProduct.stock} -> ${updated.stock}), Price (${oldProduct.sellingPrice} -> ${updated.sellingPrice})`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, data: updated });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = serverProducts.findIndex((p) => p.id === id);
  if (index !== -1) {
    const deletedProduct = serverProducts[index];
    serverProducts.splice(index, 1);
    serverAuditLogs.unshift({
      id: `audit-${Date.now()}`,
      branchId: deletedProduct.branchId || 'default-branch-001',
      userId: 'system',
      userName: 'Manager',
      action: 'DELETE_PRODUCT',
      module: 'INVENTORY',
      details: `Deleted SKU: ${deletedProduct.name} (${deletedProduct.barcode})`,
      timestamp: new Date().toISOString()
    });
  }
  res.json({ success: true, message: 'Product deleted successfully' });
});

// 3. Transactions Sync API (Offline Sync Processor)
app.post('/api/transactions/sync', (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    res.status(400).json({ success: false, error: 'Invalid payload, array expected' });
    return;
  }

  const syncedUuids: string[] = [];

  for (const tx of transactions) {
    // Check deduplication
    const existingIndex = serverTransactions.findIndex((t) => t.txUuid === tx.txUuid);
    if (existingIndex === -1) {
      serverTransactions.push({ ...tx, isSynced: true });
      syncedUuids.push(tx.txUuid);

      // Decrement server product stock automatically
      if (Array.isArray(tx.items)) {
        for (const item of tx.items) {
          const prodIndex = serverProducts.findIndex((p) => p.id === item.product.id || p.barcode === item.product.barcode);
          if (prodIndex !== -1) {
            const currentShelf = serverProducts[prodIndex].shelfStock ?? serverProducts[prodIndex].stock ?? 0;
            serverProducts[prodIndex].shelfStock = Math.max(0, currentShelf - item.quantity);
          }
        }
      }

      // Log transaction sync audit
      serverAuditLogs.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        branchId: tx.branchId || 'default-branch-001',
        userId: tx.cashierId || 'cashier-01',
        userName: tx.cashierName || 'Cashier',
        action: 'PROCESS_SALE',
        module: 'POS',
        details: `Completed Sale ${tx.txUuid.substring(0, 8)} Total: Rp ${tx.grandTotal?.toLocaleString()} via ${tx.paymentMethod}`,
        timestamp: new Date().toISOString()
      });
    } else {
      syncedUuids.push(tx.txUuid); // Already synced
    }
  }

  res.json({
    success: true,
    syncedUuids,
    totalSynced: syncedUuids.length
  });
});

// 4. Shift API
app.get('/api/shifts/active', (req, res) => {
  const cashierId = req.query.cashierId as string;
  const activeShift = serverShifts.find((s) => s.status === 'OPEN' && (!cashierId || s.cashierId === cashierId));
  res.json({ success: true, data: activeShift || null });
});

app.post('/api/shifts/open', (req, res) => {
  const newShift = {
    id: `shift-${Date.now()}`,
    branchId: req.body.branchId || 'default-branch-001',
    cashierId: req.body.cashierId || 'cashier-001',
    cashierName: req.body.cashierName || 'Siti (Cashier)',
    openingCash: Number(req.body.openingCash) || 0,
    startTime: new Date().toISOString(),
    status: 'OPEN',
    notes: req.body.notes || ''
  };
  serverShifts.push(newShift);

  serverAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    branchId: newShift.branchId,
    userId: newShift.cashierId,
    userName: newShift.cashierName,
    action: 'OPEN_SHIFT',
    module: 'SHIFT',
    details: `Opened Shift with Rp ${newShift.openingCash.toLocaleString()} cash float`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, data: newShift });
});

app.post('/api/shifts/close', (req, res) => {
  const { shiftId, actualClosingCash, notes } = req.body;
  const shiftIndex = serverShifts.findIndex((s) => s.id === shiftId);

  const shift = shiftIndex !== -1 ? serverShifts[shiftIndex] : {
    id: shiftId,
    branchId: 'default-branch-001',
    cashierId: 'user-001',
    cashierName: 'Pemilik Mart',
    openingCash: 0,
    startTime: new Date().toISOString()
  };

  // Calculate expected cash sales
  const shiftSales = serverTransactions
    .filter((t) => t.shiftId === shiftId && t.paymentMethod === 'CASH')
    .reduce((sum, t) => sum + (t.grandTotal || 0), 0);

  const expectedClosingCash = (shift.openingCash || 0) + shiftSales;
  const cashDifference = (Number(actualClosingCash) || 0) - expectedClosingCash;

  const closedShift = {
    ...shift,
    expectedClosingCash,
    actualClosingCash: Number(actualClosingCash) || 0,
    cashDifference,
    endTime: new Date().toISOString(),
    status: 'CLOSED',
    notes: notes || ''
  };

  if (shiftIndex !== -1) {
    serverShifts[shiftIndex] = closedShift;
  } else {
    serverShifts.push(closedShift);
  }

  serverAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    branchId: shift.branchId,
    userId: shift.cashierId,
    userName: shift.cashierName,
    action: 'CLOSE_SHIFT',
    module: 'SHIFT',
    details: `Closed Shift. Expected Cash: Rp ${expectedClosingCash.toLocaleString()}, Actual: Rp ${closedShift.actualClosingCash.toLocaleString()}, Difference: Rp ${cashDifference.toLocaleString()}`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, data: closedShift });
});

// 5. Audit Logs API
app.get('/api/audit-logs', (_req, res) => {
  res.json({ success: true, data: serverAuditLogs });
});

app.post('/api/audit-logs', (req, res) => {
  const log = {
    id: `audit-${Date.now()}`,
    branchId: req.body.branchId || 'default-branch-001',
    userId: req.body.userId || 'system',
    userName: req.body.userName || 'User',
    action: req.body.action || 'ACTION',
    module: req.body.module || 'GENERAL',
    details: req.body.details || '',
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(log);
  res.json({ success: true, data: log });
});

// 6. Read-Only Gemini AI Business Insights & Interactive Chat Endpoint
app.get('/api/ai/status', async (req, res) => {
  const customHeaderKey = req.headers['x-gemini-api-key'] as string | undefined;
  const rawKey = (customHeaderKey || process.env.GEMINI_API_KEY || '').trim();
  const isDefaultStaleKey = rawKey === STALE_DEFAULT_ENV_KEY;
  const hasKey = Boolean(rawKey.length > 0 && !isDefaultStaleKey);
  let isFunctional = false;
  let message = '';

  if (!hasKey) {
    message = 'Kunci GEMINI_API_KEY belum terkonfigurasi. Silakan masukkan API Key Gemini Anda di menu Pengaturan AI.';
  } else {
    try {
      const ai = getGeminiClient(rawKey);
      if (!ai) {
        throw new Error('Format Kunci API Tidak Valid');
      }
      const testRes = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: 'Ping',
        config: { maxOutputTokens: 5 }
      });
      if (testRes.text) {
        isFunctional = true;
        message = 'Koneksi API Gemini AI (gemini-flash-latest) Aktif & Terverifikasi!';
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('UNAUTHENTICATED') || errMsg.includes('401') || errMsg.includes('invalid authentication credentials')) {
        console.warn('Gemini Status Ping Auth Info:', 'API Key tidak memiliki otentikasi valid.');
        message = 'Kunci API Gemini yang dipasang tidak valid atau telah kadaluarsa.';
      } else {
        console.warn('Gemini Status Ping Warning:', errMsg);
        message = `Kunci API terdeteksi namun terjadi kendala koneksi: ${errMsg}`;
      }
    }
  }

  res.json({
    hasKey,
    isFunctional,
    message,
    model: 'gemini-flash-latest'
  });
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const customHeaderKey = req.headers['x-gemini-api-key'] as string | undefined;
    const { message, history, dbContext, customApiKey } = req.body;
    const apiKey = customHeaderKey || customApiKey || process.env.GEMINI_API_KEY;
    const ai = getGeminiClient(apiKey);

    const storeName = dbContext?.storeName || 'Minimarket RetailFlow';
    const totalSales = dbContext?.totalSalesAmount ?? serverTransactions.reduce((acc, t) => acc + (t.grandTotal || 0), 0);
    const txCount = dbContext?.totalTransactionsCount ?? serverTransactions.length;
    const lowStockItems = dbContext?.lowStockItems ?? serverProducts.filter((p) => p.stock <= p.minStock).map((p) => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      category: p.category,
      barcode: p.barcode
    }));
    const recentAudits = dbContext?.recentAuditSummary ?? serverAuditLogs.slice(0, 30).map((a) => ({
      timestamp: a.timestamp,
      userName: a.userName,
      action: a.action,
      module: a.module,
      details: a.details
    }));
    const sampleProducts = dbContext?.sampleProducts ?? serverProducts.slice(0, 30).map((p) => ({
      name: p.name,
      stock: p.stock,
      price: p.sellingPrice,
      category: p.category
    }));

    if (!ai) {
      // Local fallback reply
      res.json({
        success: false,
        fallback: true,
        message: 'Google Gemini API Key belum terkonfigurasi atau tidak valid. Menggunakan Engine Analisis Lokal terintegrasi.',
        reply: null
      });
      return;
    }

    const systemPrompt = `Anda adalah Asisten Bisnis Pintar Gemini AI untuk toko ${storeName}.
Tugas Utama Anda:
1. Menjawab pertanyaan pengguna secara ramah, lugas, profesional, dan solutif HANYA DALAM BAHASA INDONESIA.
2. Menganalisis penjualan, omset, ketersediaan stok produk, peringatan restock, dan strategi retail berdasarkan DATABASE REAL-TIME TOKO.
3. Membantu pengguna mencari dan membaca audit log transaksi/keuangan jika ditanyakan.
4. Memberikan rekomendasi paket promo, bundling produk, atau solusi operasional minimarket.
5. PENTING: Anda adalah penasihat analisis (baca data saja). Jangan pernah berpura-pura mengubah database secara langsung.

DATABASE REAL-TIME TOKO (${storeName}):
- Total Transaksi Penjualan: ${txCount} transaksi (Total Volume Penjualan/Omset: Rp ${Number(totalSales).toLocaleString('id-ID')})
- Produk Stok Menipis/Habis (${lowStockItems.length} SKU): ${JSON.stringify(lowStockItems)}
- Sampel Katalog Produk (${sampleProducts.length} SKU): ${JSON.stringify(sampleProducts)}
- Audit Log Aktivitas Keuangan/Transaksi Terakhir (${recentAudits.length} entri): ${JSON.stringify(recentAudits)}`;

    let contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      contents = [...history];
    }
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nPertanyaan Pengguna: ${message || 'Berikan analisis performa toko saat ini.'}` }]
    });

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents,
      config: {
        systemInstruction: 'Anda adalah Penasihat Bisnis Minimarket Indonesia. WAJIB menjawab seluruhnya dalam Bahasa Indonesia yang jelas, akurat, dan solutif.',
        temperature: 0.7
      }
    });

    res.json({ success: true, reply: aiResponse.text });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('UNAUTHENTICATED') || errMsg.includes('401') || errMsg.includes('invalid authentication credentials')) {
      console.warn('Gemini AI Chat Auth Notice:', 'API key unauthenticated or expired.');
    } else {
      console.warn('Gemini AI Chat Notice:', errMsg);
    }
    res.json({
      success: false,
      fallback: true,
      errorDetails: errMsg,
      reply: null
    });
  }
});

app.post('/api/ai/insights', async (req, res) => {
  let dbContext: any = req.body?.dbContext || null;
  try {
    const customHeaderKey = req.headers['x-gemini-api-key'] as string | undefined;
    const apiKey = customHeaderKey || req.body?.customApiKey || process.env.GEMINI_API_KEY;
    const ai = getGeminiClient(apiKey);

    const storeName = dbContext?.storeName || 'Minimarket RetailFlow';
    const totalSales = dbContext?.totalSalesAmount ?? serverTransactions.reduce((acc, t) => acc + (t.grandTotal || 0), 0);
    const txCount = dbContext?.totalTransactionsCount ?? serverTransactions.length;
    const lowStockItems = dbContext?.lowStockItems ?? serverProducts.filter((p) => p.stock <= p.minStock).map((p) => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      category: p.category
    }));
    const nearExpiryItems = dbContext?.nearExpiryItems ?? serverProducts.filter((p) => {
      if (!p.expiryDate) return false;
      const daysUntilExpiry = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return daysUntilExpiry < 90;
    }).map((p) => ({
      name: p.name,
      expiryDate: p.expiryDate,
      stock: p.stock
    }));

    if (!ai) {
      res.json({
        success: false,
        fallback: true,
        insights: null
      });
      return;
    }

    const prompt = `Analisis metrik bisnis retail minimarket "${storeName}" berikut dan kembalikan objek JSON dengan wawasan strategis DALAM BAHASA INDONESIA:
    - Total Omset Penjualan: Rp ${Number(totalSales).toLocaleString('id-ID')} (${txCount} transaksi)
    - Produk Stok Menipis (${lowStockItems.length} SKU): ${JSON.stringify(lowStockItems)}
    - Produk Mendekati Kadaluarsa (${nearExpiryItems.length} SKU): ${JSON.stringify(nearExpiryItems)}

    Tanggapi HANYA dalam format JSON dengan kunci berikut (SELURUH TEKS WAJIB DALAM BAHASA INDONESIA):
    1. "executiveSummary": Ringkasan 2 kalimat dalam Bahasa Indonesia mengenai kesehatan bisnis & performa toko terkini.
    2. "restockUrgent": Array dari string rekomendasi pembelian stok produk mendesak dalam Bahasa Indonesia.
    3. "promotionalAdvice": Array dari string ide paket promo/bundling dalam Bahasa Indonesia untuk perputaran produk.
    4. "revenueGrowthTip": String 1 kalimat saran strategis kunci untuk meningkatkan omset dan margin harian dalam Bahasa Indonesia.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction: 'Anda adalah Konsultan Strategis Retail Minimarket Indonesia. WAJIB memberikan jawaban seluruhnya dalam BAHASA INDONESIA dalam format JSON.',
        responseMimeType: 'application/json'
      }
    });

    const parsedText = aiResponse.text || '{}';
    let resultJson: any = {};
    try {
      resultJson = JSON.parse(parsedText);
    } catch {
      resultJson = { executiveSummary: parsedText };
    }

    res.json({ success: true, insights: resultJson });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('UNAUTHENTICATED') || errMsg.includes('401') || errMsg.includes('invalid authentication credentials')) {
      console.warn('Gemini AI Insights Auth Notice:', 'API key unauthenticated or expired.');
    } else {
      console.warn('Gemini AI Insights Notice:', errMsg);
    }
    res.json({
      success: false,
      fallback: true,
      insights: null
    });
  }
});

// Root API Health Probe (Vercel rewrites /api/* to this function)
app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'RetailFlow POS Server',
    time: new Date().toISOString(),
    routes: ['/api/health', '/api/products', '/api/transactions/sync', '/api/shifts/*', '/api/audit-logs', '/api/ai/status', '/api/ai/chat', '/api/ai/insights']
  });
});

// Global Error Handler (mencegah 500 tanpa detail & agar error terlihat di serverless)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[Server Error]', err?.message || err);
  res.status(err?.status || 500).json({
    success: false,
    error: err?.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack
  });
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RetailFlow POS Server] running at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
