import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  PlusCircle,
  Sparkles,
  PackageCheck,
  CheckCircle2,
  DollarSign,
  Clock,
  ArrowRight,
  Eye,
  Receipt,
  Target,
  Edit3,
  X,
  Check
} from 'lucide-react';
import { Product, Transaction, Shift, UserRole, SalesTarget } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReceiptModal } from '../pos/ReceiptModal';
import { getSalesTargets, saveSalesTarget, logAudit } from '../../services/api';
import { fetchProductsFromDatabase, fetchTransactionsFromCloud } from '../../services/supabase';

interface DashboardOverviewProps {
  userRole: UserRole;
  activeBranch: any;
  activeShift: Shift | null;
  setActiveTab: (tab: any) => void;
  onOpenShift: () => void;
  setIsAIAssistantOpen: (open: boolean) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  userRole,
  activeBranch,
  activeShift,
  setActiveTab,
  onOpenShift,
  setIsAIAssistantOpen
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState('Operasional');
  const [isExpenseSuccess, setIsExpenseSuccess] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  // Sales Target KPI State
  const [salesTarget, setSalesTarget] = useState<SalesTarget | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [monthlyProfit, setMonthlyProfit] = useState<number>(0);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetRevInput, setTargetRevInput] = useState<number>(50000000);
  const [targetProfitInput, setTargetProfitInput] = useState<number>(15000000);

  useEffect(() => {
    loadDashboardData();
  }, [activeBranch]);

  const loadDashboardData = async () => {
    try {
      const allProducts = await fetchProductsFromDatabase(activeBranch.id);
      setProducts(allProducts);

      const allTx = await fetchTransactionsFromCloud(activeBranch.id);
      setAllTransactions(allTx);

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const isCompleted = (status?: string) => !status || String(status).toUpperCase() === 'COMPLETED';
      const isSameDay = (dateStr: string, targetDate: Date) => {
        if (!dateStr) return false;
        try {
          const d = new Date(dateStr);
          return (
            d.getFullYear() === targetDate.getFullYear() &&
            d.getMonth() === targetDate.getMonth() &&
            d.getDate() === targetDate.getDate()
          );
        } catch (e) {
          return dateStr.startsWith(targetDate.toISOString().slice(0, 10));
        }
      };

      const isSameMonth = (dateStr: string, targetDate: Date) => {
        if (!dateStr) return false;
        try {
          const d = new Date(dateStr);
          return (
            d.getFullYear() === targetDate.getFullYear() &&
            d.getMonth() === targetDate.getMonth()
          );
        } catch (e) {
          return dateStr.startsWith(targetDate.toISOString().slice(0, 7));
        }
      };

      const filteredToday = allTx.filter((t) => isSameDay(t.createdAt, now) && isCompleted(t.status));
      setTodayTransactions(filteredToday);

      // Calculate monthly revenue and profit
      const monthTx = allTx.filter((t) => isSameMonth(t.createdAt, now) && isCompleted(t.status));
      const mRev = monthTx.reduce((acc, t) => acc + t.grandTotal, 0);
      let mCogs = 0;
      monthTx.forEach((tx) => {
        tx.items.forEach((it) => {
          mCogs += (it.product?.purchasePrice || 0) * it.quantity;
        });
      });
      setMonthlyRevenue(mRev);
      setMonthlyProfit(mRev - mCogs);

      // Load Sales Target for current branch
      const targets = await getSalesTargets(activeBranch?.id || 'default-branch-001');
      const currentTarget = targets.find((t) => t.monthYear === currentMonthStr);
      if (currentTarget) {
        setSalesTarget(currentTarget);
        setTargetRevInput(currentTarget.targetRevenue);
        setTargetProfitInput(currentTarget.targetProfit);
      } else {
        setSalesTarget({
          id: 'default-target',
          branchId: activeBranch?.id || 'default-branch-001',
          monthYear: currentMonthStr,
          targetRevenue: 50000000,
          targetProfit: 15000000,
          createdAt: new Date().toISOString()
        });
      }

      const sortedRecent = [...allTx].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
      setRecentTransactions(sortedRecent);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const updated = await saveSalesTarget({
      branchId: activeBranch?.id || 'default-branch-001',
      monthYear: currentMonthStr,
      targetRevenue: Number(targetRevInput) || 0,
      targetProfit: Number(targetProfitInput) || 0
    });
    setSalesTarget(updated);
    setIsEditingTarget(false);
  };

  // Metrics calculation
  const totalRevenueToday = todayTransactions.reduce((acc, t) => acc + t.grandTotal, 0);
  const totalTxCount = todayTransactions.length;
  const avgBasketValue = totalTxCount > 0 ? totalRevenueToday / totalTxCount : 0;

  // Stock & Expiry Alerts
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
  const today = new Date();
  const ninetyDaysLater = new Date();
  ninetyDaysLater.setDate(today.getDate() + 90);

  const expiringProducts = products.filter((p) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp <= ninetyDaysLater;
  });

  // Calculate COGS and Gross Profit for today's transactions
  let totalCogsToday = 0;
  todayTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      totalCogsToday += item.product.purchasePrice * item.quantity;
    });
  });
  const grossProfitToday = totalRevenueToday - totalCogsToday;

  // Top selling products computation
  const productSalesMap: { [id: string]: { name: string; qty: number; revenue: number } } = {};
  todayTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      if (!productSalesMap[item.product.id]) {
        productSalesMap[item.product.id] = { name: item.product.name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.product.id].qty += item.quantity;
      productSalesMap[item.product.id].revenue += item.subtotal;
    });
  });

  const topSellingList = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Trend Calculation for 7 Days or 30 Days (1 Month)
  const lastXDays = Array.from({ length: trendDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (trendDays - 1 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    const dayName = trendDays === 7 
      ? d.toLocaleDateString('id-ID', { weekday: 'short' })
      : `${d.getDate()}/${d.getMonth() + 1}`;
    return { dateObj: d, dateStr, dayName };
  });

  const trendData = lastXDays.map((day) => {
    const amount = allTransactions
      .filter((t) => {
        const isComp = !t.status || String(t.status).toUpperCase() === 'COMPLETED';
        if (!isComp) return false;
        try {
          const dt = new Date(t.createdAt);
          return (
            dt.getFullYear() === day.dateObj.getFullYear() &&
            dt.getMonth() === day.dateObj.getMonth() &&
            dt.getDate() === day.dateObj.getDate()
          );
        } catch (e) {
          return t.createdAt.startsWith(day.dateStr);
        }
      })
      .reduce((acc, t) => acc + t.grandTotal, 0);
    return {
      day: day.dayName,
      dateStr: day.dateStr,
      amount: amount
    };
  });

  const maxTrendAmount = Math.max(...trendData.map((d) => d.amount), 500000);
  const minTrendAmount = Math.min(...trendData.map((d) => d.amount));
  const totalTrendRevenue = trendData.reduce((acc, d) => acc + d.amount, 0);
  const avgTrendRevenue = Math.round(totalTrendRevenue / trendData.length);
  
  // Growth Rate (comparing second half to first half of period)
  const halfIndex = Math.floor(trendData.length / 2);
  const firstHalfSum = trendData.slice(0, halfIndex).reduce((acc, d) => acc + d.amount, 0) || 1;
  const secondHalfSum = trendData.slice(halfIndex).reduce((acc, d) => acc + d.amount, 0);
  const growthPercentage = Math.round(((secondHalfSum - firstHalfSum) / firstHalfSum) * 100);

  const handleQuickAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) return;

    try {
      await logAudit(
        'PENGELUARAN_CEPAT',
        'KEUANGAN',
        `Catat pengeluaran [${expenseCategory}]: Rp ${expenseAmount} - ${expenseNote || 'Tanpa Catatan'}`,
        'Sistem',
        'current-user',
        activeBranch.id
      );

      setExpenseNote('');
      setExpenseAmount('');
      setIsExpenseSuccess(true);
      setTimeout(() => setIsExpenseSuccess(false), 3000);
    } catch (err) {
      console.error('Add expense error:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 md:pb-12 text-slate-800 max-w-full overflow-x-hidden">
      {/* Top Welcome & Shift Status Banner */}
      <div className="bg-[#eef2f6] rounded-3xl p-5 sm:p-6 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shadow-[inset_1px_1px_2px_#cbd2d9]">
              Ringkasan Minimarket
            </span>
            <span className="text-xs text-slate-500 font-medium">{formatDate(new Date().toISOString())}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">
            Selamat Datang di {activeBranch?.name || 'RetailFlow POS'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Kelola transaksi kasir, stok minimarket, dan laporan keuangan dalam satu dashboard pintar.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {activeShift ? (
            <div className="bg-[#eef2f6] shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Shift Aktif</p>
                <p className="text-xs font-extrabold text-slate-800">{activeShift.cashierName}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenShift}
              className="w-full md:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3),-4px_-4px_10px_rgba(255,255,255,0.8)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2 transition-all"
            >
              <Clock className="w-4 h-4" />
              <span>Buka Shift Kasir Baru</span>
            </button>
          )}

          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="px-4 py-3 bg-[#eef2f6] text-emerald-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Analisis AI</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Daily Revenue */}
        <div className="bg-[#eef2f6] rounded-3xl p-4 sm:p-5 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Omset Hari Ini</span>
            <div className="w-9 h-9 rounded-2xl bg-[#eef2f6] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(totalRevenueToday)}</p>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{totalTxCount} Transaksi Berhasil</span>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-[#eef2f6] rounded-3xl p-4 sm:p-5 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Transaksi</span>
            <div className="w-9 h-9 rounded-2xl bg-[#eef2f6] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-center text-teal-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">{totalTxCount} Struk</p>
          <p className="text-[11px] font-medium text-slate-500">Rata-rata: {formatCurrency(avgBasketValue)} /Struk</p>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-[#eef2f6] rounded-3xl p-4 sm:p-5 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-2 cursor-pointer hover:shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Stok Menipis</span>
            <div className="w-9 h-9 rounded-2xl bg-[#eef2f6] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">{lowStockProducts.length} Produk</p>
          <p className="text-[11px] font-bold text-amber-700">Memerlukan Restok Segera →</p>
        </div>

        {/* Profit Estimation (Owner/Manager) */}
        {userRole !== 'CASHIER' ? (
          <div className="bg-[#eef2f6] rounded-3xl p-4 sm:p-5 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Laba Kotor Hari Ini</span>
              <div className="w-9 h-9 rounded-2xl bg-[#eef2f6] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-center text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(grossProfitToday)}</p>
            <p className="text-[11px] font-medium text-slate-500">Margin kotor bersih estimasi</p>
          </div>
        ) : (
          <div className="bg-[#eef2f6] rounded-3xl p-4 sm:p-5 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Kadaluarsa Dekat</span>
              <div className="w-9 h-9 rounded-2xl bg-[#eef2f6] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-center text-rose-600">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">{expiringProducts.length} Produk</p>
            <p className="text-[11px] font-medium text-slate-500">Kadaluarsa dalam 90 hari</p>
          </div>
        )}
      </div>

      {/* Sales Target KPI Section (Owner & Manager) */}
      {userRole !== 'CASHIER' && (
        <div className="bg-[#eef2f6] rounded-3xl p-5 sm:p-6 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-[inset_2px_2px_4px_#cbd2d9]">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800">Target & KPI Penjualan Bulan Ini</h3>
                <p className="text-xs text-slate-500 font-bold">
                  Pencapaian Omset & Laba Toko Cabang {activeBranch?.name || ''}
                </p>
              </div>
            </div>

            {userRole === 'OWNER' && (
              <button
                onClick={() => setIsEditingTarget(!isEditingTarget)}
                className="px-3.5 py-2 bg-[#eef2f6] text-indigo-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] flex items-center gap-1.5 hover:text-indigo-900 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingTarget ? 'Batal' : 'Atur Target'}</span>
              </button>
            )}
          </div>

          {isEditingTarget ? (
            <form onSubmit={handleSaveTarget} className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black text-slate-800">Ubah Target Bulanan Cabang Ini</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Omset (Rp)</label>
                  <input
                    type="number"
                    value={targetRevInput}
                    onChange={(e) => setTargetRevInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs font-bold border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Laba Bersih (Rp)</label>
                  <input
                    type="number"
                    value={targetProfitInput}
                    onChange={(e) => setTargetProfitInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs font-bold border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Simpan Target Baru
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Omset Target Progress */}
              <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Realisasi Omset Bulanan</span>
                  <span className="font-black text-indigo-700">
                    {Math.round((monthlyRevenue / (salesTarget?.targetRevenue || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-slate-800">{formatCurrency(monthlyRevenue)}</span>
                  <span className="text-xs text-slate-500 font-bold">Target: {formatCurrency(salesTarget?.targetRevenue || 50000000)}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((monthlyRevenue / (salesTarget?.targetRevenue || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Laba Target Progress */}
              <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Realisasi Laba Bulanan</span>
                  <span className="font-black text-emerald-700">
                    {Math.round((monthlyProfit / (salesTarget?.targetProfit || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-emerald-800">{formatCurrency(monthlyProfit)}</span>
                  <span className="text-xs text-slate-500 font-bold">Target: {formatCurrency(salesTarget?.targetProfit || 15000000)}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((monthlyProfit / (salesTarget?.targetProfit || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid Section: Sales Trend & Top SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Sales Trend Line/Area Chart */}
        <div className="lg:col-span-2 bg-[#eef2f6] rounded-3xl p-4 sm:p-6 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">Grafik & Tren Penjualan</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  growthPercentage >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {growthPercentage >= 0 ? `+${growthPercentage}%` : `${growthPercentage}%`} vs Periode Lalu
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Total Omset: <span className="font-extrabold text-slate-800">{formatCurrency(totalTrendRevenue)}</span> • Rerata: <span className="font-extrabold text-emerald-700">{formatCurrency(avgTrendRevenue)}/hari</span>
              </p>
            </div>

            {/* Timeframe Toggle Buttons: 7 Hari vs 30 Hari */}
            <div className="flex bg-[#eef2f6] p-1 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] shrink-0 self-start sm:self-center">
              <button
                onClick={() => setTrendDays(7)}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                  trendDays === 7
                    ? 'bg-[#eef2f6] text-emerald-700 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setTrendDays(30)}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                  trendDays === 30
                    ? 'bg-[#eef2f6] text-emerald-700 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                30 Hari (1 Bulan)
              </button>
            </div>
          </div>

          {/* SVG Line / Area Chart */}
          <div className="pt-2 pb-1">
            <div className="bg-[#eef2f6] shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] rounded-2xl p-3 sm:p-4 w-full">
              <div className="h-44 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#cbd2d9" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#cbd2d9" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#cbd2d9" strokeWidth="0.5" strokeDasharray="3 3" />

                  {/* Build SVG Path Points */}
                  {(() => {
                    const width = 500;
                    const height = 120;
                    const padding = 15;
                    const count = trendData.length;
                    const points = trendData.map((d, idx) => {
                      const x = (idx / (count - 1 || 1)) * width;
                      const ratio = (d.amount - minTrendAmount * 0.8) / ((maxTrendAmount - minTrendAmount * 0.8) || 1);
                      const y = height - Math.max(10, Math.min(height - 10, ratio * (height - padding))) + 10;
                      return { x, y, amount: d.amount, day: d.day, dateStr: d.dateStr };
                    });

                    const pathD = points.reduce((acc, p, idx) => {
                      return idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
                    }, '');

                    const areaD = `${pathD} L ${points[points.length - 1].x},140 L ${points[0].x},140 Z`;

                    return (
                      <>
                        {/* Area Fill */}
                        <path d={areaD} fill="url(#salesGrad)" />
                        {/* Line Path */}
                        <path d={pathD} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Data Points */}
                        {points.map((p, i) => (
                          <g key={i} className="group cursor-pointer">
                            <circle cx={p.x} cy={p.y} r="4" fill="#059669" stroke="#ffffff" strokeWidth="2" className="transition-all group-hover:r-6" />
                            {/* Hover Tooltip */}
                            <foreignObject x={Math.max(0, Math.min(380, p.x - 60))} y={Math.max(0, p.y - 35)} width="120" height="30" className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-slate-900 text-white text-[9px] font-extrabold px-2 py-1 rounded shadow-lg text-center truncate">
                                {p.day}: {formatCurrency(p.amount)}
                              </div>
                            </foreignObject>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between items-center pt-3 text-[9px] sm:text-[10px] text-slate-500 font-extrabold border-t border-slate-300/60 mt-1">
                {trendDays === 7 ? (
                  trendData.map((d, idx) => (
                    <span key={idx} className="text-center">{d.day}</span>
                  ))
                ) : (
                  // For 30 days, sample 6 key dates to keep x-axis uncluttered
                  trendData.filter((_, idx) => idx % 5 === 0 || idx === trendData.length - 1).map((d, idx) => (
                    <span key={idx} className="text-center">{d.day}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Selling SKUs Widget */}
        <div className="bg-[#eef2f6] rounded-3xl p-5 sm:p-6 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-800">5 Produk Terlaris</h3>
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">Top 5 SKU</span>
          </div>

          <div className="space-y-3">
            {topSellingList.length > 0 ? (
              topSellingList.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#eef2f6] p-3 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{item.qty} unit terjual</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700 shrink-0 ml-2">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <PackageCheck className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs font-semibold">Belum ada transaksi hari ini</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Fast Expense Quick-Add & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Expense Quick-Add Form */}
        <div className="bg-[#eef2f6] rounded-3xl p-5 sm:p-6 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base text-slate-800">Tambah Pengeluaran Cepat (Kas Keluar)</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">Catat biaya operasional kecil seperti uang kebersihan, perlengkapan toko, atau konsumsi secara instan.</p>

          <form onSubmit={handleQuickAddExpense} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Kategori Biaya</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 text-xs font-bold rounded-2xl px-3 py-2.5 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Operasional">Operasional Toko</option>
                  <option value="Perlengkapan">Perlengkapan Kasir</option>
                  <option value="Konsumsi">Konsumsi Karyawan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 25000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 text-xs font-bold rounded-2xl px-3 py-2.5 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Keterangan Catatan</label>
              <input
                type="text"
                placeholder="Contoh: Beli kantong plastik dan struk thermal"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                className="w-full bg-[#eef2f6] text-slate-800 text-xs font-bold rounded-2xl px-3 py-2.5 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {isExpenseSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengeluaran berhasil dicatat!</span>
                </div>
              )}
              <button
                type="submit"
                className="ml-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] transition-all"
              >
                Simpan Pengeluaran
              </button>
            </div>
          </form>
        </div>

        {/* Recent Transactions Stream with Scroll Box */}
        <div className="bg-[#eef2f6] rounded-3xl p-5 sm:p-6 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-800">Transaksi Terbaru</h3>
            <button onClick={() => setActiveTab('pos')} className="text-xs text-emerald-700 font-bold hover:underline">
              Ke Kasir POS →
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-[#eef2f6] p-3 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">#{tx.txUuid.slice(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                        {tx.paymentMethod}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {tx.cashierName} • {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-emerald-700">{formatCurrency(tx.grandTotal)}</span>
                    <button
                      onClick={() => setSelectedTxForReceipt(tx)}
                      className="p-1.5 bg-[#eef2f6] text-slate-600 hover:text-emerald-700 rounded-xl shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                      title="Lihat Detail Struk"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs font-semibold">Belum ada riwayat transaksi</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable / WhatsApp Receipt Modal for Manager/Owner */}
      {selectedTxForReceipt && (
        <ReceiptModal
          tx={selectedTxForReceipt}
          branch={activeBranch}
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}
    </div>
  );
};
