import React, { useState, useEffect } from 'react';
import { BarChart3, Award, AlertTriangle, Printer, Download, Database, Calendar, Filter, Wallet, Package, Clock, User, ShieldCheck, DollarSign, CheckCircle2 } from 'lucide-react';
import { Transaction, Product, UserRole, CashMovement, Shift, Refund } from '../../types';
import { formatCurrency, formatDate, toLocalDateKey } from '../../utils/formatters';
import { fetchCashMovementsFromCloud, fetchTransactionsFromCloud, fetchShiftsFromCloud, fetchProductsFromDatabase, fetchRefundsFromCloud } from '../../services/supabase';

interface ReportsDashboardProps {
  userRole?: UserRole;
  activeBranch?: any;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ userRole = 'MANAGER', activeBranch }) => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);

  // Filter Mode: 'TIMEFRAME' (by Calendar) vs 'SHIFT' (by Shift Kasir boundaries)
  const [filterMode, setFilterMode] = useState<'TIMEFRAME' | 'SHIFT'>('TIMEFRAME');

  // Timeframe Filter: HARI_INI | MINGGU_INI | BULAN_INI | KUSTOM
  const [timeframe, setTimeframe] = useState<'HARI_INI' | 'MINGGU_INI' | 'BULAN_INI' | 'KUSTOM'>('HARI_INI');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateKey(d);
  });
  const [endDate, setEndDate] = useState<string>(() => toLocalDateKey(new Date()));

  // Selected Shift ID
  const [selectedShiftId, setSelectedShiftId] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const branchId = activeBranch?.id || 'default-branch-001';
      const [cloudTxs, cloudCms, cloudShifts, cloudProds, cloudRefunds] = await Promise.all([
        fetchTransactionsFromCloud(branchId),
        fetchCashMovementsFromCloud(branchId),
        fetchShiftsFromCloud(branchId),
        fetchProductsFromDatabase(branchId),
        fetchRefundsFromCloud(branchId)
      ]);

      setAllTransactions(cloudTxs || []);
      setProducts(cloudProds || []);
      setCashMovements(cloudCms || []);
      setRefunds(cloudRefunds || []);

      const sortedShifts = (cloudShifts || []).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setShifts(sortedShifts);
    } catch (e) {
      console.warn('Error loading reports data:', e);
    }
  };

  const activeOrSelectedShift = shifts.find((s) => s.id === selectedShiftId);

  // Helper date boundary & shift check
  const isTxInFilter = (tx: Transaction) => {
    if (filterMode === 'SHIFT') {
      if (selectedShiftId === 'ALL') return true;
      if (!activeOrSelectedShift) return true;

      if (tx.shiftId === activeOrSelectedShift.id) return true;

      const txDate = new Date(tx.createdAt);
      const shiftStart = new Date(activeOrSelectedShift.startTime);
      const shiftEnd = activeOrSelectedShift.endTime ? new Date(activeOrSelectedShift.endTime) : new Date();

      return txDate >= shiftStart && txDate <= shiftEnd;
    }

    // TIMEFRAME mode
    const itemDate = new Date(tx.createdAt);
    const now = new Date();

    if (timeframe === 'HARI_INI') {
      return (
        itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (timeframe === 'MINGGU_INI') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    } else if (timeframe === 'BULAN_INI') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    } else if (timeframe === 'KUSTOM') {
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (itemDate < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`);
        if (itemDate > end) return false;
      }
      return true;
    }
    return true;
  };

  const isMovementInFilter = (cm: CashMovement) => {
    if (filterMode === 'SHIFT') {
      if (selectedShiftId === 'ALL') return true;
      if (!activeOrSelectedShift) return true;

      if (cm.shiftId === activeOrSelectedShift.id) return true;

      const cmDate = new Date(cm.createdAt);
      const shiftStart = new Date(activeOrSelectedShift.startTime);
      const shiftEnd = activeOrSelectedShift.endTime ? new Date(activeOrSelectedShift.endTime) : new Date();

      return cmDate >= shiftStart && cmDate <= shiftEnd;
    }

    // TIMEFRAME mode
    const itemDate = new Date(cm.createdAt);
    const now = new Date();

    if (timeframe === 'HARI_INI') {
      return (
        itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (timeframe === 'MINGGU_INI') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    } else if (timeframe === 'BULAN_INI') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    } else if (timeframe === 'KUSTOM') {
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (itemDate < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`);
        if (itemDate > end) return false;
      }
      return true;
    }
    return true;
  };

  // Filtered Transactions & Cash Movements (REFUNDED dikeluarkan)
  const filteredTransactions = allTransactions.filter(isTxInFilter).filter((t) => t.status !== 'REFUNDED');
  const filteredCashMovements = cashMovements.filter(isMovementInFilter);

  // Refund pada periode filter mengurangi omset
  const filteredTxIds = new Set(filteredTransactions.map((t) => t.id));
  const periodRefunds = refunds.filter((r) => filteredTxIds.has(r.transactionId));
  const periodRefundTotal = periodRefunds.reduce((a, r) => a + r.refundAmount, 0);

  // Financial Metrics Calculation
  const totalRevenue = filteredTransactions.reduce((acc, t) => acc + (t.grandTotal || 0), 0) - periodRefundTotal;
  const cashSalesTotal = filteredTransactions
    .filter((t) => t.paymentMethod === 'CASH')
    .reduce((acc, t) => acc + (t.grandTotal || 0), 0);
  const nonCashSalesTotal = totalRevenue - cashSalesTotal;
  const totalTransactionsCount = filteredTransactions.length;

  let totalGrossProfit = 0;
  let totalItemsSoldQty = 0;

  // Itemized Sales Breakdown Map (Item Outflow per SKU)
  const itemSalesMap: {
    [key: string]: {
      barcode: string;
      name: string;
      category: string;
      qty: number;
      revenue: number;
      cost: number;
      margin: number;
    };
  } = {};

  for (const tx of filteredTransactions) {
    if (Array.isArray(tx.items)) {
      for (const item of tx.items) {
        const cost = item.product.purchasePrice || 0;
        const sell = item.product.sellingPrice || 0;
        const itemProfit = (sell - cost) * item.quantity;
        totalGrossProfit += itemProfit;
        totalItemsSoldQty += item.quantity;

        const id = item.product.id || item.product.barcode;
        if (!itemSalesMap[id]) {
          itemSalesMap[id] = {
            barcode: item.product.barcode || '-',
            name: item.product.name,
            category: item.product.category || 'Umum',
            qty: 0,
            revenue: 0,
            cost: cost * item.quantity,
            margin: 0
          };
        }
        itemSalesMap[id].qty += item.quantity;
        itemSalesMap[id].revenue += item.subtotal;
        itemSalesMap[id].margin += itemProfit;
      }
    }
  }

  // Refund mengurangi laba kotor
  totalGrossProfit -= periodRefundTotal;

  const itemizedSalesList = Object.values(itemSalesMap).sort((a, b) => b.qty - a.qty);
  const topSellingList = itemizedSalesList.slice(0, 5);

  // Cash Movements Calculations (In vs Out vs Penarikan Owner)
  const totalCashIn = filteredCashMovements
    .filter((c) => c.type === 'CASH_IN')
    .reduce((acc, c) => acc + (c.amount || 0), 0);

  const totalExpenses = filteredCashMovements
    .filter((c) => c.type === 'EXPENSE_OUT')
    .reduce((acc, c) => acc + (c.amount || 0), 0);

  const totalOwnerDraw = filteredCashMovements
    .filter((c) => c.type === 'OWNER_DRAW')
    .reduce((acc, c) => acc + (c.amount || 0), 0);

  // Laba bersih operasional = laba kotor - beban (setoran/penarikan owner TIDAK mempengaruhi laba)
  const netOperationalProfit = totalGrossProfit - totalExpenses;

  const lowStockItems = products.filter((p) => p.stock <= p.minStock);

  const handlePrintOrPDF = () => {
    window.print();
  };

  // Detailed CSV Export Function
  const handleExportCSV = () => {
    const getFilterLabel = () => {
      if (filterMode === 'SHIFT') {
        if (selectedShiftId === 'ALL') return 'Semua Shift Kasir';
        if (activeOrSelectedShift) {
          return `Shift #${activeOrSelectedShift.id.slice(-6)} - Kasir: ${activeOrSelectedShift.cashierName} (${formatDate(activeOrSelectedShift.startTime)})`;
        }
      }
      if (timeframe === 'HARI_INI') return 'Hari Ini';
      if (timeframe === 'MINGGU_INI') return '7 Hari Terakhir';
      if (timeframe === 'BULAN_INI') return 'Bulan Ini';
      return `Kustom (${startDate} s/d ${endDate})`;
    };

    let csv = '';

    // SECTION 1: HEADER & METADATA
    csv += '==================================================\n';
    csv += 'LAPORAN AUDIT KEUANGAN & AUDIT SHIFT MINIMARKET\n';
    csv += '==================================================\n';
    csv += `Filter Mode,${filterMode === 'SHIFT' ? 'Berdasarkan Shift Kasir' : 'Berdasarkan Rentang Tanggal'}\n`;
    csv += `Periode Audit,${getFilterLabel()}\n`;
    csv += `Tanggal Diterbitkan,${new Date().toLocaleString('id-ID')}\n`;
    csv += `Mata Uang,IDR (Rupiah)\n\n`;

    // SECTION 2: SHIFT AUDIT DETAILS (If Shift Mode active)
    if (filterMode === 'SHIFT' && activeOrSelectedShift) {
      csv += '--- DETAIL SHIFT AUDIT KASIR ---\n';
      csv += `Shift ID,${activeOrSelectedShift.id}\n`;
      csv += `Kasir Bertugas,${activeOrSelectedShift.cashierName}\n`;
      csv += `Status Shift,${activeOrSelectedShift.status === 'OPEN' ? 'BERJALAN (OPEN)' : 'SUDAH DITUTUP (CLOSED)'}\n`;
      csv += `Waktu Buka Shift,${formatDate(activeOrSelectedShift.startTime)}\n`;
      csv += `Waktu Tutup Shift,${activeOrSelectedShift.endTime ? formatDate(activeOrSelectedShift.endTime) : 'Masih Terbuka'}\n`;
      csv += `Modal Kas Awal Laci,${activeOrSelectedShift.openingCash}\n`;
      csv += `Total Penjualan Tunai Shift,${cashSalesTotal}\n`;
      csv += `Total Kas Masuk (Deposit),${totalCashIn}\n`;
      csv += `Total Pengeluaran Kas (Out),${totalExpenses}\n`;
      csv += `Total Penarikan Owner,${totalOwnerDraw}\n`;
      csv += `Ekspektasi Kas Laci Register,${activeOrSelectedShift.openingCash + cashSalesTotal + totalCashIn - totalExpenses - totalOwnerDraw}\n`;
      csv += `Fisik Uang Kas Laci,${activeOrSelectedShift.actualClosingCash ?? '-'}\n`;
      csv += `Selisih Uang Kas Laci,${activeOrSelectedShift.cashDifference ?? '-'}\n\n`;
    }

    // SECTION 3: RINGKASAN METRIK AUDIT KEUANGAN
    csv += '--- RINGKASAN METRIK KEUANGAN OPERASIONAL ---\n';
    csv += 'Indikator Metrik,Nilai Rupiah / Jumlah\n';
    csv += `Total Omset Penjualan Kotor,${totalRevenue}\n`;
    csv += `Penjualan Tunai (Cash),${cashSalesTotal}\n`;
    csv += `Penjualan Nontunai (QRIS/Transfer),${nonCashSalesTotal}\n`;
    csv += `Total Margin Laba Kotor Penjualan,${totalGrossProfit}\n`;
    csv += `Total Setoran Kas Masuk (In),${totalCashIn}\n`;
    csv += `Total Pengeluaran Operasional (Out),${totalExpenses}\n`;
    csv += `Total Penarikan Owner,${totalOwnerDraw}\n`;
    csv += `Laba Bersih Operasional Real,${netOperationalProfit}\n`;
    csv += `Total Transaksi Struk,${totalTransactionsCount}\n`;
    csv += `Total Unit Barang Keluar Terjual,${totalItemsSoldQty}\n\n`;

    // SECTION 4: TABEL RINCIAN BARANG KELUAR TERJUAL PER SKU
    csv += '--- TABEL RINCIAN BARANG KELUAR / TERJUAL PER SKU ---\n';
    csv += 'Barcode,Nama Barang,Kategori,Jumlah Terjual (Unit),Total Omset (Rp),Margin Profit (Rp)\n';
    if (itemizedSalesList.length === 0) {
      csv += '-,Belum Ada Barang Terjual Pada Periode Ini,-,0,0,0\n';
    } else {
      itemizedSalesList.forEach((item) => {
        csv += `"${item.barcode}","${item.name.replace(/"/g, '""')}","${item.category}",${item.qty},${item.revenue},${item.margin}\n`;
      });
    }
    csv += '\n';

    // SECTION 5: DAFTAR DETAIL TRANSAKSI STRUK PENJUALAN
    csv += '--- RINCIAN TRANSAKSI STRUK PENJUALAN ---\n';
    csv += 'No Struk,Shift ID,Waktu Transaksi,Kasir,Metode Pembayaran,Rincian Barang (Nama x Qty),Total Unit,Grand Total (Rp)\n';
    if (filteredTransactions.length === 0) {
      csv += '-,Belum Ada Struk,-,-,-,-,0,0\n';
    } else {
      filteredTransactions.forEach((t) => {
        const itemsDetail = t.items
          ? t.items.map((i) => `${i.product.name} (${i.quantity}x)`).join('; ')
          : '-';
        const totalQty = t.items ? t.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
        csv += `"${t.txUuid}","${t.shiftId || '-'}","${formatDate(t.createdAt)}","${t.cashierName}","${t.paymentMethod}","${itemsDetail.replace(/"/g, '""')}",${totalQty},${t.grandTotal}\n`;
      });
    }
    csv += '\n';

    // SECTION 6: DAFTAR DETAIL ARUS KAS OPERASIONAL
    csv += '--- RINCIAN ARUS KAS OPERASIONAL (PETTY CASH IN & OUT) ---\n';
    csv += 'ID Transaksi Kas,Shift ID,Waktu,Tipe Arus Kas,Kategori,Keterangan,Operator,Nominal (Rp)\n';
    if (filteredCashMovements.length === 0) {
      csv += '-,Belum Ada Pencatatan Kas,-,-,-,-,-,0\n';
    } else {
      filteredCashMovements.forEach((c) => {
        csv += `"${c.id}","${c.shiftId || '-'}","${formatDate(c.createdAt)}","${c.type === 'CASH_IN' ? 'Kas Masuk (In)' : c.type === 'OWNER_DRAW' ? 'Penarikan Owner' : 'Pengeluaran (Out)'}","${c.category}","${(c.description || '-').replace(/"/g, '""')}","${c.createdBy}",${c.amount}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const label = filterMode === 'SHIFT' ? `shift-${selectedShiftId.slice(-6)}` : timeframe.toLowerCase();
    link.setAttribute('download', `laporan-audit-shift-${label}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800 print:p-0 print:space-y-4">
      {/* Printable Report Title (Only Visible in Print Mode) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-xl font-black uppercase text-slate-900">Laporan Financial Audit & Shift Audit Kasir</h1>
        <p className="text-xs text-slate-700 font-bold mt-1">
          Mode Audit: {filterMode === 'SHIFT' ? 'Berdasarkan Shift Kasir' : 'Berdasarkan Rentang Tanggal'} |
          {filterMode === 'SHIFT' && activeOrSelectedShift && ` Kasir: ${activeOrSelectedShift.cashierName} (Buka: ${formatDate(activeOrSelectedShift.startTime)})`}
          {filterMode === 'TIMEFRAME' && ` Periode: ${timeframe === 'HARI_INI' ? 'Hari Ini' : timeframe === 'MINGGU_INI' ? '7 Hari Terakhir' : timeframe === 'BULAN_INI' ? 'Bulan Ini' : `${startDate} s/d ${endDate}`}`}
          | Dicetak Pada: {new Date().toLocaleString('id-ID')}
        </p>
      </div>

      {/* Retention & Export Banner */}
      <div className="bg-emerald-950 text-white p-4.5 rounded-3xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-emerald-800 print:hidden">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <span className="font-extrabold text-xs text-emerald-300 uppercase tracking-wider block">
              Ekspor & Audit Shift Keuangan Terintegrasi
            </span>
            <p className="text-[11px] text-slate-300 font-medium">
              Data dikelompokkan secara ketat berdasarkan jam buka-tutup shift kasir atau tanggal kalender untuk mencegah penumpukan data antar-shift.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 font-extrabold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV Detail</span>
          </button>
          <button
            onClick={handlePrintOrPDF}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Save PDF Audit</span>
          </button>
        </div>
      </div>

      {/* Header & Dual-Mode Filter Controls Bar */}
      <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Laporan Financial Audit & Audit Shift Kasir</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pilih mode audit berdasarkan Shift Buka-Tutup Kasir atau Tanggal Kalender.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#eef2f6] p-1.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] shrink-0">
            <button
              onClick={() => setFilterMode('TIMEFRAME')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'TIMEFRAME'
                  ? 'bg-[#eef2f6] text-emerald-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Filter Tanggal</span>
            </button>
            <button
              onClick={() => setFilterMode('SHIFT')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'SHIFT'
                  ? 'bg-[#eef2f6] text-emerald-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Filter Shift Kasir</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        {filterMode === 'SHIFT' ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-200/40 p-3 rounded-2xl">
            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Pilih Shift Sesi Kasir:</span>
            </span>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="w-full sm:w-auto flex-1 bg-[#eef2f6] text-slate-800 font-extrabold text-xs p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            >
              <option value="ALL">-- Semua Shift Terdaftar --</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.status === 'OPEN' ? '[Shift AKTIF] ' : '[Shift TUTUP] '}
                  Kasir: {s.cashierName} | Buka: {formatDate(s.startTime)} {s.endTime ? `s/d ${formatDate(s.endTime)}` : '(Sedang Berjalan)'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'HARI_INI', label: 'Hari Ini' },
                { id: 'MINGGU_INI', label: '7 Hari Terakhir' },
                { id: 'BULAN_INI', label: 'Bulan Ini' },
                { id: 'KUSTOM', label: 'Kustom Tanggal' }
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    timeframe === tf.id
                      ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_2px_2px_4px_#cbd2d9] border border-emerald-300'
                      : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] hover:text-slate-800'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {timeframe === 'KUSTOM' && (
              <div className="flex items-center gap-2 bg-[#eef2f6] p-2 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] text-xs">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none"
                />
                <span className="text-slate-400 font-bold">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SHIFT AUDIT SUMMARY CARD (If a specific Shift is selected or Shift mode is active) */}
      {filterMode === 'SHIFT' && activeOrSelectedShift && (
        <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-emerald-300 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 shadow-[inset_1px_1px_2px_#cbd2d9]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <span>Hasil Audit Shift ID #{activeOrSelectedShift.id.slice(-6)}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-xl text-[10px] font-extrabold ${
                      activeOrSelectedShift.status === 'OPEN'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {activeOrSelectedShift.status === 'OPEN' ? 'Shift Sedang Aktif' : 'Shift Telah Ditutup'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Kasir: <strong className="text-slate-800">{activeOrSelectedShift.cashierName}</strong> | Buka:{' '}
                  {formatDate(activeOrSelectedShift.startTime)}{' '}
                  {activeOrSelectedShift.endTime ? `| Tutup: ${formatDate(activeOrSelectedShift.endTime)}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Modal Awal Laci</span>
              <span className="font-black text-slate-800 text-sm">{formatCurrency(activeOrSelectedShift.openingCash)}</span>
            </div>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Penjualan Tunai</span>
              <span className="font-black text-emerald-700 text-sm">+{formatCurrency(cashSalesTotal)}</span>
            </div>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Kas Masuk (In)</span>
              <span className="font-black text-teal-700 text-sm">+{formatCurrency(totalCashIn)}</span>
            </div>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Pengeluaran (Out)</span>
              <span className="font-black text-rose-600 text-sm">-{formatCurrency(totalExpenses)}</span>
            </div>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Penarikan Owner</span>
              <span className="font-black text-amber-600 text-sm">-{formatCurrency(totalOwnerDraw)}</span>
            </div>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Ekspektasi Kas Laci</span>
              <span className="font-black text-slate-900 text-sm">
                {formatCurrency(activeOrSelectedShift.openingCash + cashSalesTotal + totalCashIn - totalExpenses - totalOwnerDraw)}
              </span>
            </div>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
              <span className="text-[10px] font-bold text-slate-500 block">Fisik Kas & Selisih</span>
              {activeOrSelectedShift.status === 'CLOSED' ? (
                <div>
                  <span className="font-black text-slate-800 text-sm block">{formatCurrency(activeOrSelectedShift.actualClosingCash || 0)}</span>
                  <span className={`text-[10px] font-extrabold ${
                    (activeOrSelectedShift.cashDifference || 0) === 0
                      ? 'text-emerald-600'
                      : (activeOrSelectedShift.cashDifference || 0) < 0
                      ? 'text-rose-600'
                      : 'text-amber-600'
                  }`}>
                    {(activeOrSelectedShift.cashDifference || 0) === 0 ? '✓ Sesuai (0)' : `Selisih: ${formatCurrency(activeOrSelectedShift.cashDifference || 0)}`}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-slate-400 italic">Belum Tutup Shift</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Metrics Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60">
          <span className="text-xs font-bold text-slate-500">Total Omset Penjualan Kotor</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalRevenue)}</div>
          <span className="text-[10px] text-emerald-800 font-bold mt-1 block">
            Dari {totalTransactionsCount} Struk ({formatCurrency(cashSalesTotal)} Cash)
          </span>
        </div>

        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60">
          <span className="text-xs font-bold text-slate-500">Laba Margin Kotor Penjualan</span>
          <div className="text-xl sm:text-2xl font-black text-teal-700 mt-1">{formatCurrency(totalGrossProfit)}</div>
          <span className="text-[10px] text-teal-800 font-bold mt-1 block">Omset dikurangi modal kulakan</span>
        </div>

        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60">
          <span className="text-xs font-bold text-slate-500">Total Kas Masuk / Kas Keluar / Penarikan</span>
          <div className="text-sm font-black text-slate-800 mt-1 space-y-0.5">
            <span className="flex justify-between"><span className="text-emerald-700">Kas Masuk (In)</span><span className="text-emerald-700">+{formatCurrency(totalCashIn)}</span></span>
            <span className="flex justify-between"><span className="text-rose-600">Pengeluaran (Out)</span><span className="text-rose-600">-{formatCurrency(totalExpenses)}</span></span>
            <span className="flex justify-between"><span className="text-amber-600">Penarikan Owner</span><span className="text-amber-600">-{formatCurrency(totalOwnerDraw)}</span></span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold mt-1 block">Arus Kas Operasional Toko</span>
        </div>

        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60">
          <span className="text-xs font-bold text-emerald-800">Laba Bersih Operasional Real</span>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${netOperationalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(netOperationalProfit)}
          </div>
          <span className="text-[10px] text-slate-500 font-bold mt-1 block">Laba Kotor dikurangi Beban Operasional</span>
        </div>
      </div>

      {/* Itemized Products Outflow / Sales Breakdown */}
      <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Rincian Stok & Barang Keluar Terjual Per SKU ({itemizedSalesList.length} SKU)</span>
          </h3>
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
            Total Unit Keluar: {totalItemsSoldQty} Unit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-200/50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-300">
              <tr>
                <th className="p-3">Barcode</th>
                <th className="p-3">Nama Produk / SKU</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-center">Qty Terjual (Unit)</th>
                <th className="p-3 text-right">Total Value Omset (Rp)</th>
                <th className="p-3 text-right">Total Margin Profit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {itemizedSalesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 font-medium">
                    Belum ada barang terjual dalam periode / shift audit ini.
                  </td>
                </tr>
              ) : (
                itemizedSalesList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-200/40 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{item.barcode}</td>
                    <td className="p-3 font-extrabold text-slate-800">{item.name}</td>
                    <td className="p-3 font-semibold text-slate-600">{item.category}</td>
                    <td className="p-3 text-center font-black text-emerald-700 text-sm">{item.qty} unit</td>
                    <td className="p-3 text-right font-extrabold text-slate-800">{formatCurrency(item.revenue)}</td>
                    <td className="p-3 text-right font-black text-teal-700">{formatCurrency(item.margin)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Top 5 & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        {/* Top 5 Selling SKUs */}
        <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Award className="w-4 h-4 text-amber-600" />
            <span>5 Produk Paling Laris Pada Audit Ini</span>
          </h3>

          <div className="space-y-2.5">
            {topSellingList.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Belum ada transaksi penjualan tercatat</p>
            ) : (
              topSellingList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#eef2f6] p-3 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-800">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">{item.qty} unit terjual</span>
                    <span className="text-[10px] text-slate-500 font-bold">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Peringatan Stok Menipis (Butuh Kulakan)</span>
          </h3>

          <div className="space-y-2.5">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-emerald-700 py-6 text-center font-bold">
                ✓ Seluruh stok barang di toko dalam batas aman
              </p>
            ) : (
              lowStockItems.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-[#eef2f6] p-3 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] text-xs">
                  <div>
                    <span className="font-extrabold text-slate-800 block">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Barcode: {p.barcode}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl shadow-[inset_1px_1px_2px_#cbd2d9]">
                    Sisa: {p.stock} unit
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cash Movements Summary Table (Operational Cash In/Out) */}
      <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>Rincian Arus Kas Operasional (Petty Cash In & Out) ({filteredCashMovements.length} Entry)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-200/50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-300">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Tipe Arus Kas</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3">Dicatat Oleh</th>
                <th className="p-3 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredCashMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 font-medium">
                    Belum ada pencatatan arus kas operasional pada periode / shift audit ini.
                  </td>
                </tr>
              ) : (
                filteredCashMovements.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-200/40 transition-colors">
                    <td className="p-3 font-bold text-slate-600 text-[11px]">{formatDate(c.createdAt)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${c.type === 'CASH_IN' ? 'bg-emerald-100 text-emerald-800' : c.type === 'OWNER_DRAW' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {c.type === 'CASH_IN' ? 'Kas Masuk' : c.type === 'OWNER_DRAW' ? 'Penarikan Owner' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-slate-800">{c.category}</td>
                    <td className="p-3 text-slate-600">{c.description || '-'}</td>
                    <td className="p-3 font-bold text-slate-600">{c.createdBy}</td>
                    <td className={`p-3 text-right font-black ${c.type === 'CASH_IN' ? 'text-emerald-700' : c.type === 'OWNER_DRAW' ? 'text-amber-600' : 'text-rose-600'}`}>
                      {c.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(c.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
