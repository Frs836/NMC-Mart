import React, { useEffect, useState } from 'react';
import { X, PackagePlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { fetchBundleComponents, assembleBundle } from '../../services/supabase';
import { logAudit } from '../../services/api';

interface RakitBundleModalProps {
  products: Product[];
  currentUser: any;
  onClose: () => void;
  onDone: () => void;
}

export const RakitBundleModal: React.FC<RakitBundleModalProps> = ({ products, currentUser, onClose, onDone }) => {
  const bundleProducts = products.filter((p) => p.isBundle);
  const [selectedId, setSelectedId] = useState(bundleProducts[0]?.id || '');
  const [qty, setQty] = useState<number>(1);
  const [components, setComponents] = useState<{ productName?: string; quantity: number }[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedId) {
      fetchBundleComponents(selectedId).then((c) =>
        setComponents(c.map((x) => ({ productName: x.productName, quantity: x.quantity })))
      );
    } else {
      setComponents([]);
    }
  }, [selectedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!selectedId) {
      setFeedback({ type: 'error', text: 'Pilih paket/bundle dulu.' });
      return;
    }
    if (qty <= 0) {
      setFeedback({ type: 'error', text: 'Jumlah rakit harus lebih dari 0.' });
      return;
    }
    setIsSubmitting(true);
    const res = await assembleBundle(selectedId, qty);
    setIsSubmitting(false);
    if (res.success) {
      const bundle = products.find((p) => p.id === selectedId);
      setFeedback({ type: 'success', text: `✓ Berhasil merakit ${qty} ${bundle?.name || 'paket'}. Stok bundle bertambah.` });
      await logAudit(
        'RAKIT_BUNDLE',
        'INVENTORY_PO',
        `Merakit ${qty}x ${bundle?.name || 'bundle'} dari stok komponen`,
        currentUser?.name || 'Manager',
        currentUser?.id || 'user-001',
        bundle?.branchId || 'default-branch-001'
      );
      setTimeout(() => {
        onDone();
        onClose();
      }, 1200);
    } else {
      setFeedback({ type: 'error', text: res.message || 'Gagal merakit bundle.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form onSubmit={handleSubmit} className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <PackagePlus className="w-5 h-5" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Rakit Paket / Bundle</h3>
              <p className="text-[11px] text-slate-500 font-medium">Kurangi stok komponen, tambah stok paket</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {bundleProducts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Belum ada produk bertipe Paket. Tandai produk sebagai Paket lewat Kelola Varian & Paket.
          </p>
        ) : (
          <>
            <div>
              <label className="text-slate-700 block mb-1 font-bold">Pilih Paket / Bundle</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
              >
                {bundleProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stok: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold">Jumlah Paket yang DiRakit</label>
              <input
                type="number"
                min={1}
                value={qty || ''}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full bg-[#eef2f6] text-indigo-800 font-black text-xl p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>

            <div className="p-3 bg-slate-200/50 rounded-2xl space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-500">Komponen yang digunakan per paket:</p>
              {components.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada komponen.</p>
              ) : (
                components.map((c, i) => (
                  <p key={i} className="text-xs font-bold text-slate-700">
                    • {c.productName || 'Produk'} x{c.quantity} {qty > 1 ? `(total ${c.quantity * qty})` : ''}
                  </p>
                ))
              )}
            </div>
          </>
        )}

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
            disabled={isSubmitting || bundleProducts.length === 0}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> MERAKIT…
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4" /> RAKIT PAKET
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
