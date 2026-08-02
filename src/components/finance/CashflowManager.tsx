import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, Receipt, X, Edit2, Trash2, Search, Calendar, Filter, CheckCircle, ShieldAlert } from 'lucide-react';
import { CashMovement, UserRole } from '../../types';
import { formatCurrency, formatDate, toLocalDateKey } from '../../utils/formatters';
import { logAudit } from '../../services/api';
import { syncCashMovementToCloud, deleteCashMovementFromCloud, fetchCashMovementsFromCloud, fetchShiftsFromCloud } from '../../services/supabase';

interface CashflowManagerProps {
  userRole: UserRole;
  currentUser: any;
  activeBranch: any;
}

export const CashflowManager: React.FC<CashflowManagerProps> = ({ userRole, currentUser, activeBranch }) => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timeframe filter state
  const [timeframe, setTimeframe] = useState<'HARI_INI' | 'SEMINGGU' | 'SEBULAN' | 'KUSTOM'>('HARI_INI');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateKey(d);
  });
  const [endDate, setEndDate] = useState<string>(() => toLocalDateKey(new Date()));

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<CashMovement | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State for Add / Edit
  const [movementType, setMovementType] = useState<'CASH_IN' | 'EXPENSE_OUT'>('EXPENSE_OUT');
  const [amount, setAmount] = useState<number>(50000);
  const [category, setCategory] = useState('Perlengkapan Toko');
  const [description, setDescription] = useState('');
  const [customTxDate, setCustomTxDate] = useState<string>('');

  useEffect(() => {
    loadMovements();
  }, [activeBranch]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadMovements = async () => {
    try {
      const cloudMovements = await fetchCashMovementsFromCloud(activeBranch?.id);
      const branchFiltered = activeBranch
        ? cloudMovements.filter((m) => !m.branchId || m.branchId === activeBranch.id)
        : cloudMovements;
      setMovements(branchFiltered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      console.warn('Error loading cash movements:', e);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setMovementType('EXPENSE_OUT');
    setAmount(50000);
    setCategory('Perlengkapan Toko');
    setDescription('');
    setCustomTxDate(new Date().toISOString().slice(0, 16)); // format for datetime-local
    setIsAddExpenseOpen(true);
  };

  // Create Cash Movement
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'CASHIER') {
      showToast('Akses ditolak: Kasir tidak dapat mencatat arus kas.');
      return;
    }
    const txTimestamp = customTxDate ? new Date(customTxDate).toISOString() : new Date().toISOString();
    
    const allShifts = await fetchShiftsFromCloud(activeBranch?.id);
    const currentActiveShift = allShifts.find((s) => s.status === 'OPEN');

    const newMovement: CashMovement = {
      id: `cash-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      branchId: activeBranch?.id || 'default-branch-001',
      shiftId: currentActiveShift?.id || 'active-shift',
      type: movementType,
      amount: Number(amount) || 0,
      category,
      description,
      createdBy: currentUser?.name || 'Operator',
      createdAt: txTimestamp
    };

    try {
      await syncCashMovementToCloud(newMovement);

      // Log Audit
      await logAudit(
        movementType === 'EXPENSE_OUT' ? 'PENCATATAN_PENGELUARAN' : 'PENCATATAN_KAS_MASUK',
        'KEUANGAN',
        `[TAMBAH ${movementType === 'CASH_IN' ? 'KAS MASUK' : 'PENGELUARAN'}] Nominal: ${formatCurrency(amount)}, Kategori: ${category}, Ket: ${description || '-'}`,
        currentUser?.name || 'Operator',
        currentUser?.id || 'user-001',
        activeBranch?.id || 'default-branch-001'
      );

      setIsAddExpenseOpen(false);
      showToast(`Berhasil mencatat ${movementType === 'CASH_IN' ? 'Kas Masuk' : 'Pengeluaran'} baru sebesar ${formatCurrency(amount)}.`);
      loadMovements();
    } catch (err: any) {
      console.error('Gagal mencatat arus kas:', err);
      showToast('Gagal menyimpan arus kas. Periksa koneksi dan coba lagi.');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (movement: CashMovement) => {
    setEditingMovement(movement);
    setMovementType(movement.type);
    setAmount(movement.amount);
    setCategory(movement.category);
    setDescription(movement.description);
    setCustomTxDate(new Date(movement.createdAt).toISOString().slice(0, 16));
  };

  // Save Edit Cash Movement
  const handleSaveEditMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;
    if (userRole === 'CASHIER') {
      showToast('Akses ditolak: Kasir tidak dapat mengubah arus kas.');
      return;
    }

    const oldAmount = editingMovement.amount;
    const oldType = editingMovement.type;

    const updated: CashMovement = {
      ...editingMovement,
      type: movementType,
      amount: Number(amount) || 0,
      category,
      description,
      createdAt: customTxDate ? new Date(customTxDate).toISOString() : editingMovement.createdAt
    };

    try {
      await syncCashMovementToCloud(updated);

      // Log Audit
      await logAudit(
        'EDIT_TRANSAKSI_KAS',
        'KEUANGAN',
        `[EDIT KAS] ID: ${editingMovement.id}. Sebelum: ${oldType} (${formatCurrency(oldAmount)}) -> Sesudah: ${movementType} (${formatCurrency(amount)}). Ket: ${description}`,
        currentUser?.name || 'Operator',
        currentUser?.id || 'user-001',
        activeBranch?.id || 'default-branch-001'
      );

      setEditingMovement(null);
      showToast('Pembaruan data arus kas berhasil disimpan & dicatat di Log Audit.');
      loadMovements();
    } catch (err: any) {
      console.error('Gagal edit arus kas:', err);
      showToast('Gagal memperbarui arus kas. Periksa koneksi dan coba lagi.');
    }
  };

  // Delete Cash Movement
  const handleConfirmDelete = async () => {
    if (!deletingMovement) return;

    try {
      await deleteCashMovementFromCloud(deletingMovement.id);

      // Log Audit
      await logAudit(
        'HAPUS_TRANSAKSI_KAS',
        'KEUANGAN',
        `[HAPUS KAS] Dihapus ${deletingMovement.type} sebesar ${formatCurrency(deletingMovement.amount)} [${deletingMovement.category}] - ${deletingMovement.description}`,
        currentUser?.name || 'Operator',
        currentUser?.id || 'user-001',
        activeBranch?.id || 'default-branch-001'
      );

      setDeletingMovement(null);
      showToast('Pencatatan arus kas telah berhasil dihapus dari sistem & audit.');
      loadMovements();
    } catch (err: any) {
      console.error('Gagal hapus arus kas:', err);
      showToast('Gagal menghapus arus kas. Periksa koneksi dan coba lagi.');
    }
  };

  // Filter movements by timeframe and date range
  const filteredMovements = movements.filter((m) => {
    const mDate = new Date(m.createdAt);
    const now = new Date();

    // Timeframe check
    if (timeframe === 'HARI_INI') {
      const isToday =
        mDate.getDate() === now.getDate() &&
        mDate.getMonth() === now.getMonth() &&
        mDate.getFullYear() === now.getFullYear();
      if (!isToday) return false;
    } else if (timeframe === 'SEMINGGU') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      if (mDate < sevenDaysAgo) return false;
    } else if (timeframe === 'SEBULAN') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      if (mDate < thirtyDaysAgo) return false;
    } else if (timeframe === 'KUSTOM') {
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (mDate < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`);
        if (mDate > end) return false;
      }
    }

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = m.category.toLowerCase().includes(q);
      const matchDesc = m.description.toLowerCase().includes(q);
      const matchUser = m.createdBy.toLowerCase().includes(q);
      const matchAmount = m.amount.toString().includes(q);
      if (!matchCat && !matchDesc && !matchUser && !matchAmount) return false;
    }

    return true;
  });

  const totalCashIn = filteredMovements.filter((m) => m.type === 'CASH_IN').reduce((acc, m) => acc + m.amount, 0);
  const totalExpenses = filteredMovements.filter((m) => m.type === 'EXPENSE_OUT').reduce((acc, m) => acc + m.amount, 0);
  const netCashflow = totalCashIn - totalExpenses;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white font-bold text-xs p-3.5 rounded-2xl shadow-lg flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-200" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Date Range Filter Bar */}
      <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span>Manajemen Keuangan & Kas Toko</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Pencatatan CRUD Kas Masuk (In), Pengeluaran (Out), dan Audit Keuangan Terintegrasi.</p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi Kas Baru</span>
          </button>
        </div>

        {/* Timeframe Filter Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter Periode:</span>
            </span>

            {[
              { id: 'HARI_INI', label: 'Hari Ini' },
              { id: 'SEMINGGU', label: '7 Hari Terakhir' },
              { id: 'SEBULAN', label: 'Bulan Ini' },
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

          {/* Date Picker Range if KUSTOM selected */}
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
      </div>

      {/* Finance Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Kas Masuk (In Deposit)</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalCashIn)}</div>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">{filteredMovements.filter(m => m.type === 'CASH_IN').length} Transaksi</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9] text-emerald-600">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Kas Keluar (Biaya Operasional)</span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{formatCurrency(totalExpenses)}</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">{filteredMovements.filter(m => m.type === 'EXPENSE_OUT').length} Transaksi</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9] text-rose-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Saldo Kas Bersih Operasional</span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(netCashflow)}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Filter Periode Terpilih</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9] text-teal-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Cash Movements Table */}
      <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Buku Kas Utama & Riwayat Operasional</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Daftar transaksi arus kas masuk & pengeluaran yang tercatat secara audit.</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari deskripsi, kategori, operator..."
              className="w-full bg-[#eef2f6] text-slate-800 text-xs font-bold pl-9 pr-3 py-2.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-200/50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-300">
              <tr>
                <th className="p-3.5">Tanggal & Waktu</th>
                <th className="p-3.5">Jenis Arus Kas</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Keterangan / Catatan</th>
                <th className="p-3.5">Dicatat Oleh</th>
                <th className="p-3.5 text-right">Nominal (Rp)</th>
                <th className="p-3.5 text-center">Aksi CRUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    {searchQuery ? 'Tidak ada transaksi kas yang sesuai kata kunci pencarian.' : 'Belum ada riwayat arus kas pada periode ini.'}
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-200/40 transition-colors">
                    <td className="p-3.5 text-slate-600 font-bold text-[11px] whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold shadow-[inset_1px_1px_2px_#cbd2d9] ${
                          m.type === 'CASH_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.type === 'CASH_IN' ? 'Kas Masuk (In)' : 'Pengeluaran (Out)'}
                      </span>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-800">{m.category}</td>
                    <td className="p-3.5 text-slate-600 font-medium">{m.description || '-'}</td>
                    <td className="p-3.5 text-slate-600 font-bold">{m.createdBy}</td>
                    <td className={`p-3.5 text-right font-black text-sm ${m.type === 'CASH_IN' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {m.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(m.amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="p-1.5 bg-[#eef2f6] hover:bg-slate-200 text-slate-700 rounded-xl shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9] transition-all"
                          title="Edit Catatan Kas"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                        </button>
                        {(userRole === 'OWNER' || userRole === 'MANAGER') && (
                          <button
                            onClick={() => setDeletingMovement(m)}
                            className="p-1.5 bg-[#eef2f6] hover:bg-rose-100 text-rose-600 rounded-xl shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9] transition-all"
                            title="Hapus Catatan Kas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Movement Modal (ADD) */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleAddMovement}
            className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-emerald-700">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Pencatatan Arus Kas Baru</span>
              </h3>
              <button type="button" onClick={() => setIsAddExpenseOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Tipe Arus Kas</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMovementType('EXPENSE_OUT')}
                    className={`py-2.5 rounded-2xl font-bold transition-all ${
                      movementType === 'EXPENSE_OUT'
                        ? 'bg-[#eef2f6] text-rose-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                        : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                    }`}
                  >
                    Pengeluaran (Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('CASH_IN')}
                    className={`py-2.5 rounded-2xl font-bold transition-all ${
                      movementType === 'CASH_IN'
                        ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                        : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                    }`}
                  >
                    Kas Masuk (In Deposit)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Kategori Transaksi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                >
                  <option value="Perlengkapan Toko">Perlengkapan Toko</option>
                  <option value="Kebersihan & Keamanan">Kebersihan & Keamanan</option>
                  <option value="Konsumsi & Transport">Konsumsi & Transport</option>
                  <option value="Setoran Modal Laci">Setoran Modal Laci</option>
                  <option value="Pembayaran Supplier">Pembayaran Supplier</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nominal Uang (Rp)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full bg-[#eef2f6] text-emerald-800 font-black text-xl p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Waktu Transaksi</label>
                <input
                  type="datetime-local"
                  value={customTxDate}
                  onChange={(e) => setCustomTxDate(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Catatan / Keterangan Penjelasan</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Beli kantong plastik dan kertas struk kasir"
                  className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(false)}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
              >
                SIMPAN TRANSAKSI
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Movement Modal */}
      {editingMovement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveEditMovement}
            className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-emerald-700">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <span>Edit Catatan Arus Kas</span>
              </h3>
              <button type="button" onClick={() => setEditingMovement(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Tipe Arus Kas</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMovementType('EXPENSE_OUT')}
                    className={`py-2.5 rounded-2xl font-bold transition-all ${
                      movementType === 'EXPENSE_OUT'
                        ? 'bg-[#eef2f6] text-rose-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                        : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                    }`}
                  >
                    Pengeluaran (Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('CASH_IN')}
                    className={`py-2.5 rounded-2xl font-bold transition-all ${
                      movementType === 'CASH_IN'
                        ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                        : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                    }`}
                  >
                    Kas Masuk (In)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Kategori Transaksi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                >
                  <option value="Perlengkapan Toko">Perlengkapan Toko</option>
                  <option value="Kebersihan & Keamanan">Kebersihan & Keamanan</option>
                  <option value="Konsumsi & Transport">Konsumsi & Transport</option>
                  <option value="Setoran Modal Laci">Setoran Modal Laci</option>
                  <option value="Pembayaran Supplier">Pembayaran Supplier</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nominal Uang (Rp)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full bg-[#eef2f6] text-emerald-800 font-black text-xl p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Waktu Transaksi</label>
                <input
                  type="datetime-local"
                  value={customTxDate}
                  onChange={(e) => setCustomTxDate(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Catatan Keterangan</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingMovement(null)}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
              >
                SIMPAN PERUBAHAN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMovement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#eef2f6] border border-white/80 w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base border-b border-slate-200 pb-3">
              <ShieldAlert className="w-5 h-5" />
              <span>Konfirmasi Hapus Kas</span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan <strong className="text-slate-800">{deletingMovement.type === 'CASH_IN' ? 'Kas Masuk' : 'Pengeluaran'}</strong> sebesar <strong className="text-rose-600">{formatCurrency(deletingMovement.amount)}</strong>?
            </p>

            <div className="bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] text-[11px] text-slate-500 font-medium">
              Tindakan penghapusan ini akan secara otomatis dicatat ke dalam Log Audit Keuangan.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeletingMovement(null)}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(225,29,72,0.3)]"
              >
                HAPUS PERMANEN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
