import React, { useState } from 'react';
import { RotateCcw, X, ShieldAlert, Check, Loader2 } from 'lucide-react';
import { Transaction, User } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { processRefund } from '../../services/api';

interface RefundModalProps {
  tx: Transaction;
  currentUser: User;
  onClose: () => void;
  onDone: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ tx, currentUser, onClose, onDone }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    tx.items.forEach((item) => {
      init[item.product.id] = item.quantity;
    });
    return init;
  });
  const [reason, setReason] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = tx.items
    .map((item) => ({
      item,
      qty: Math.min(Math.max(0, quantities[item.product.id] || 0), item.quantity)
    }))
    .filter(({ qty }) => qty > 0);

  const refundAmount = selectedItems.reduce((a, { item, qty }) => a + qty * item.product.sellingPrice, 0);

  const setQty = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, Math.min(qty, tx.items.find((i) => i.product.id === id)?.quantity || 0)) }));
  };

  const returnAll = () => {
    const all: Record<string, number> = {};
    tx.items.forEach((item) => {
      all[item.product.id] = item.quantity;
    });
    setQuantities(all);
  };

  const verifyPin = (): boolean => {
    let expectedPass = (currentUser.password || '123').trim();
    try {
      const savedUsersStr = localStorage.getItem('minimarket_users_v1');
      if (savedUsersStr) {
        const parsed: User[] = JSON.parse(savedUsersStr);
        const match = parsed.find((u) => u.id === currentUser.id || u.email === currentUser.email);
        if (match && match.password) expectedPass = match.password.trim();
      }
    } catch (e) {}
    return pinInput.trim() === expectedPass;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (selectedItems.length === 0) {
      setErrorMessage('Pilih minimal 1 item yang dikembalikan.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Alasan refund wajib diisi.');
      return;
    }
    if (!verifyPin()) {
      setErrorMessage('PIN verifikasi salah!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await processRefund(
        tx,
        selectedItems.map(({ item, qty }) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: qty,
          sellingPrice: item.product.sellingPrice
        })),
        reason,
        currentUser.name,
        currentUser.id
      );
      if (res.success) {
        onDone();
      } else {
        setErrorMessage(res.message || 'Gagal memproses refund.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses refund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form onSubmit={handleSubmit} className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-rose-600">
            <RotateCcw className="w-5 h-5" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Refund / Return Barang</h3>
              <p className="text-[11px] text-slate-500 font-medium">Transaksi #{tx.txUuid.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-100 border border-rose-300 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Items */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700">Pilih item & qty yang dikembalikan</span>
            <button
              type="button"
              onClick={returnAll}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-[11px]"
            >
              Kembalikan Semua
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {tx.items.map((item) => {
              const qty = Math.min(Math.max(0, quantities[item.product.id] || 0), item.quantity);
              return (
                <div key={item.product.id} className="bg-[#eef2f6] p-3 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Terjual {item.quantity}x @ {formatCurrency(item.product.sellingPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9] rounded-xl p-1">
                    <button type="button" onClick={() => setQty(item.product.id, qty - 1)} className="w-7 h-7 rounded-lg bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9] text-slate-800 font-bold text-sm">-</button>
                    <span className="w-8 text-center font-black text-xs text-slate-800">{qty}</span>
                    <button type="button" onClick={() => setQty(item.product.id, qty + 1)} className="w-7 h-7 rounded-lg bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9] text-slate-800 font-bold text-sm">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alasan */}
        <div>
          <label className="text-slate-700 block mb-1 font-extrabold">Alasan Refund <span className="text-rose-600">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Salah catat quantity (kasir mencatat 15, pembeli hanya ambil 12)"
            required
            className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-20 text-xs"
          />
        </div>

        {/* PIN */}
        <div>
          <label className="text-slate-700 block mb-1 font-extrabold">PIN Verifikasi Akun Saya</label>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Masukkan PIN untuk konfirmasi refund"
            required
            className="w-full bg-[#eef2f6] text-slate-900 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
          />
        </div>

        {/* Total */}
        <div className="p-3 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
          <span className="text-[11px] font-bold text-slate-300 uppercase">Total Refund</span>
          <span className="font-black text-rose-400 text-lg">{formatCurrency(refundAmount)}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(225,29,72,0.3)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MEMPROSES REFUND…</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>KONFIRMASI REFUND</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
