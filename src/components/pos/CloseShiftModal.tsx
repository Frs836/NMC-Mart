import React, { useState, useEffect } from 'react';
import { LogOut, Lock, ShieldAlert, DollarSign, Wallet, CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { closeShiftServer, logAudit } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { fetchTransactionsFromCloud, fetchCashMovementsFromCloud } from '../../services/supabase';
import { User } from '../../types';

interface CloseShiftModalProps {
  activeShift: any;
  setActiveShift: (shift: any) => void;
  currentUser?: User | null;
  onClose: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  activeShift,
  setActiveShift,
  currentUser,
  onClose
}) => {
  const [actualClosingCash, setActualClosingCash] = useState<number>(activeShift?.openingCash || 0);
  const [notes, setNotes] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Shift financial breakdown state
  const [cashSales, setCashSales] = useState(0);
  const [nonCashSales, setNonCashSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalCashIn, setTotalCashIn] = useState(0);
  const [expectedCash, setExpectedCash] = useState(activeShift?.openingCash || 0);

  useEffect(() => {
    async function calculateShiftTotals() {
      if (!activeShift) return;
      try {
        const [cloudTxs, cloudMovements] = await Promise.all([
          fetchTransactionsFromCloud(activeShift.branchId),
          fetchCashMovementsFromCloud(activeShift.branchId)
        ]);

        const startTime = new Date(activeShift.startTime).getTime();

        const shiftTxs = cloudTxs.filter((t) => {
          if (t.shiftId === activeShift.id) return true;
          return new Date(t.timestamp).getTime() >= startTime;
        });

        let cSales = 0;
        let ncSales = 0;
        shiftTxs.forEach((t) => {
          if (t.paymentMethod === 'CASH') {
            cSales += t.grandTotal || 0;
          } else {
            ncSales += t.grandTotal || 0;
          }
        });

        const shiftMovements = cloudMovements.filter((m) => {
          if (m.shiftId === activeShift.id) return true;
          return new Date(m.createdAt).getTime() >= startTime;
        });

        let exp = 0;
        let cin = 0;
        shiftMovements.forEach((m) => {
          if (m.type === 'EXPENSE_OUT') exp += m.amount || 0;
          if (m.type === 'CASH_IN') cin += m.amount || 0;
        });

        const calcExpected = (activeShift.openingCash || 0) + cSales + cin - exp;

        setCashSales(cSales);
        setNonCashSales(ncSales);
        setTotalExpenses(exp);
        setTotalCashIn(cin);
        setExpectedCash(calcExpected);
        setActualClosingCash(calcExpected);
      } catch (err) {
        console.warn('Error calculating shift breakdown:', err);
      }
    }
    calculateShiftTotals();
  }, [activeShift]);

  // Check Shift Lock Permission
  const isOwnerOrMaintenance = currentUser?.role === 'OWNER' || currentUser?.role === 'MAINTENANCE';
  const isShiftOwner = currentUser?.id === activeShift?.cashierId || currentUser?.name === activeShift?.cashierName;
  const canCloseShift = isShiftOwner || isOwnerOrMaintenance;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!activeShift) return;

    if (!canCloseShift) {
      setErrorMessage(`Akses Ditolak: Shift ini milik ${activeShift.cashierName}. Anda harus login sebagai ${activeShift.cashierName} atau akun Owner / Maintenance.`);
      return;
    }

    // Verify Password
    let expectedPass = (currentUser?.password || '123').trim();
    try {
      const savedUsersStr = localStorage.getItem('minimarket_users_v1');
      if (savedUsersStr) {
        const parsed: User[] = JSON.parse(savedUsersStr);
        const match = parsed.find((u) => u.id === currentUser?.id || u.email === currentUser?.email);
        if (match && match.password) {
          expectedPass = match.password.trim();
        }
      }
    } catch (e) {}

    if (passwordInput.trim() !== expectedPass) {
      setErrorMessage('Password / PIN verifikasi salah!');
      return;
    }

    const closed = await closeShiftServer(activeShift.id, actualClosingCash, notes);
    await logAudit(
      'TUTUP_SHIFT',
      'SHIFT',
      `Tutup shift ID ${activeShift.id} oleh ${currentUser?.name || activeShift.cashierName}. Kas Fisik: ${formatCurrency(
        actualClosingCash
      )}, Seharusnya: ${formatCurrency(expectedCash)}, Selisih: ${formatCurrency(closed?.cashDifference || 0)}`,
      currentUser?.name || activeShift.cashierName,
      currentUser?.id || activeShift.cashierId
    );

    setActiveShift(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form
        onSubmit={handleCloseShift}
        className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-rose-600">
          <LogOut className="w-5 h-5" />
          <h3 className="font-extrabold text-base text-slate-800">Tutup Shift Kasir</h3>
        </div>

        {!canCloseShift && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-xs font-semibold">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-bold">Shift Terkunci!</p>
              <p>Shift ini dibuka oleh <strong>{activeShift?.cashierName}</strong>. Hanya kasir bersangkutan atau Owner / Maintenance yang dapat menutup shift.</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-100 border border-rose-300 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          {/* Shift Details & Summary */}
          <div className="bg-[#eef2f6] p-3.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] space-y-2">
            <div className="flex justify-between text-slate-600 font-bold border-b border-slate-300/60 pb-1.5">
              <span>Kasir Penanggung Jawab:</span>
              <span className="text-slate-900 font-extrabold">{activeShift?.cashierName}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-bold">
              <span>Waktu Buka Shift:</span>
              <span className="text-slate-800">{new Date(activeShift?.startTime).toLocaleTimeString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-bold">
              <span>Modal Kas Awal:</span>
              <span className="text-slate-800">{formatCurrency(activeShift?.openingCash || 0)}</span>
            </div>
          </div>

          {/* Detailed Expected Income & Cash Balance Breakdown */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold border-b border-slate-700 pb-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Wallet className="w-4 h-4" /> Hasil Fisik & Non-Fisik Seharusnya
              </span>
              <span className="text-slate-400">Estimasi Sistem</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Penjualan Tunai (CASH):</span>
                <span className="font-bold text-emerald-400">+{formatCurrency(cashSales)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Non-Tunai (QRIS/Transfer):</span>
                <span className="font-bold text-cyan-400">+{formatCurrency(nonCashSales)}</span>
              </div>
              {totalCashIn > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Kas Masuk Tambahan:</span>
                  <span className="font-bold text-emerald-400">+{formatCurrency(totalCashIn)}</span>
                </div>
              )}
              {totalExpenses > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5 text-rose-400" /> Pengeluaran Kas (Kas Out):</span>
                  <span className="font-bold text-rose-400">-{formatCurrency(totalExpenses)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Kas Fisik Laci Seharusnya:</p>
                <p className="text-lg font-black text-emerald-400">{formatCurrency(expectedCash)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Omset Shift:</p>
                <p className="text-sm font-bold text-white">{formatCurrency(cashSales + nonCashSales)}</p>
              </div>
            </div>
          </div>

          {/* Actual Cash Input */}
          <div>
            <label className="text-slate-700 block mb-1 font-extrabold">Hasil Hitung Fisik Kas Laci Real (Rp)</label>
            <div className="relative">
              <input
                type="number"
                value={actualClosingCash}
                onChange={(e) => setActualClosingCash(Number(e.target.value))}
                required
                disabled={!canCloseShift}
                className="w-full bg-[#eef2f6] text-emerald-800 font-black p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none pl-9 text-base disabled:opacity-50"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold">Rp</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Selisih Fisik vs Seharusnya: <strong className={actualClosingCash - expectedCash < 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatCurrency(actualClosingCash - expectedCash)}</strong>
            </p>
          </div>

          {/* Password Verification */}
          <div>
            <label className="text-slate-700 block mb-1 font-extrabold">Password / PIN Verifikasi Akun Saya</label>
            <div className="relative">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan Password / PIN akun"
                required
                disabled={!canCloseShift}
                className="w-full bg-[#eef2f6] text-slate-900 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs disabled:opacity-50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-600 block mb-1 font-bold">Catatan Penutupan Shift</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Jumlah kas fisik sesuai catatan kasir"
              disabled={!canCloseShift}
              className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-16 text-xs disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!canCloseShift}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(225,29,72,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            TUTUP REGISTER SHIFT
          </button>
        </div>
      </form>
    </div>
  );
};
