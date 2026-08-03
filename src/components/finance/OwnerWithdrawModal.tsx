import React, { useState } from 'react';
import { X, Wallet, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { syncCashMovementToCloud } from '../../services/supabase';
import { logAudit } from '../../services/api';

interface OwnerWithdrawModalProps {
  currentUser: any;
  activeBranch: any;
  activeShift: any;
  onClose: () => void;
  onDone: () => void;
}

export const OwnerWithdrawModal: React.FC<OwnerWithdrawModalProps> = ({ currentUser, activeBranch, activeShift, onClose, onDone }) => {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ type: 'error', text: 'Jumlah penarikan harus lebih dari 0.' });
      return;
    }
    if (currentUser.role !== 'OWNER') {
      setFeedback({ type: 'error', text: 'Hanya Owner yang dapat menarik hasil.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await syncCashMovementToCloud({
        id: `cash-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        branchId: activeBranch?.id || 'default-branch-001',
        shiftId: activeShift?.id || 'shift-offline',
        type: 'OWNER_DRAW',
        amount,
        category: 'PENARIKAN OWNER',
        description: note || 'Penarikan hasil oleh Owner',
        createdBy: currentUser?.name || 'Owner',
        createdAt: new Date().toISOString()
      });

      await logAudit(
        'PENARIKAN_OWNER',
        'KEUANGAN',
        `Owner menarik hasil ${formatCurrency(amount)}${note ? ' - ' + note : ''}`,
        currentUser?.name || 'Owner',
        currentUser?.id || 'user-001',
        activeBranch?.id || 'default-branch-001'
      );

      setFeedback({ type: 'success', text: `✓ Penarikan ${formatCurrency(amount)} tercatat. Omset & laba tidak terpengaruh.` });
      setTimeout(() => {
        onDone();
        onClose();
      }, 1300);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal mencatat penarikan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form onSubmit={handleSubmit} className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-amber-600">
            <Wallet className="w-5 h-5" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Tarik Hasil (Owner)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Penarikan kas dari omset — tidak mempengaruhi laba</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] font-semibold text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Saat Owner menarik uang, <strong>kas fisik berkurang</strong> tetapi <strong>omset & laba bersih tetap utuh</strong> (bukan pengeluaran).
            Tercatat sebagai <strong>PENARIKAN OLEH OWNER</strong>.
          </span>
        </div>

        {feedback && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        <div>
          <label className="text-slate-700 block mb-1 font-extrabold">Jumlah Penarikan (Rp)</label>
          <input
            type="number"
            min={0}
            autoFocus
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-[#eef2f6] text-amber-800 font-black text-2xl p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
          />
        </div>

        <div>
          <label className="text-slate-700 block mb-1 font-bold">Catatan (Opsional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Ambil hasil minggu ini untuk keperluan pribadi"
            className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] disabled:opacity-50">
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> MENCATAT…
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" /> TARIK HASIL
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
