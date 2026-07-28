import React, { useState, useEffect } from 'react';
import { Layers, X, ArrowRight, CheckCircle2, Warehouse, Store } from 'lucide-react';
import { Product } from '../../types';
import { transferStockToShelf } from '../../services/api';

interface RackTransferModalProps {
  products: Product[];
  currentOperatorName: string;
  onSuccess: () => void;
  onClose: () => void;
  presetProductId?: string;
}

export const RackTransferModal: React.FC<RackTransferModalProps> = ({
  products,
  currentOperatorName,
  onSuccess,
  onClose,
  presetProductId
}) => {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    presetProductId || products[0]?.id || ''
  );

  useEffect(() => {
    if (presetProductId) {
      setSelectedProductId(presetProductId);
    }
  }, [presetProductId]);

  const filteredProducts = products.filter((p) => {
    const nameStr = (p.name || '').toLowerCase();
    const barcodeStr = (p.barcode || '').toLowerCase();
    const brandStr = (p.brand || '').toLowerCase();
    const q = searchFilter.trim().toLowerCase();
    return !q || nameStr.includes(q) || barcodeStr.includes(q) || brandStr.includes(q);
  });

  const [quantity, setQuantity] = useState<number>(5);
  const [notes, setNotes] = useState<string>('Pindah ke etalase kasir');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const currentShelfStock = selectedProduct?.shelfStock ?? 0;
  const currentWarehouseStock = selectedProduct?.stock ?? 0;

  const afterWarehouseStock = Math.max(0, currentWarehouseStock - quantity);
  const afterShelfStock = currentShelfStock + quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (quantity <= 0) {
      setFeedback({ type: 'error', text: 'Jumlah transfer ke rak harus lebih dari 0!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await transferStockToShelf(selectedProduct.id, quantity, currentOperatorName, notes);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: `✓ Berhasil memindahkan ${quantity} unit ${selectedProduct.name} ke etalase rak!`
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } else {
      setFeedback({
        type: 'error',
        text: res.message || 'Gagal memindahkan stok.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-[inset_2px_2px_4px_#cbd2d9]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-800">Input Restock Rak Penjualan</h3>
              <p className="text-[11px] text-slate-500">Pindahkan stok dari gudang ke etalase toko kasir</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Product */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Cari & Pilih Produk SKU</label>
            <input
              type="text"
              placeholder="Cari nama barang atau scan barcode..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full mb-2 bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
            />
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-white text-slate-900 font-bold p-3 rounded-2xl shadow-[2px_2px_6px_#cbd2d9] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs cursor-pointer"
            >
              {filteredProducts.length === 0 ? (
                <option disabled value="">Tidak ada produk cocok</option>
              ) : (
                filteredProducts.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900 font-bold py-2">
                    {p.name} (Gudang: {p.stock} | Rak: {p.shelfStock ?? 0})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Current Stock Visual Card */}
          {selectedProduct && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-200/50 rounded-2xl border border-white/60">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-slate-600" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Stok Gudang (Total)</span>
                  <span className="text-sm font-black text-slate-800">{currentWarehouseStock} unit</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-slate-300/80 pl-3">
                <Store className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Stok Etalase Rak</span>
                  <span className="text-sm font-black text-emerald-700">{currentShelfStock} unit</span>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Quantity */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Jumlah Unit yang Dipindahkan ke Rak</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={currentWarehouseStock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full bg-[#eef2f6] text-emerald-800 font-black text-sm p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
              <div className="flex gap-1.5">
                {[5, 10, 20, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(Math.min(num, currentWarehouseStock || 1))}
                    className="px-2.5 py-2 bg-[#eef2f6] text-slate-700 font-extrabold rounded-xl text-[11px] shadow-[2px_2px_4px_#cbd2d9] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Indicator */}
          {selectedProduct && (
            <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-2xl text-[11px] font-bold text-emerald-950 space-y-1">
              <div className="flex items-center justify-between">
                <span>Stok Gudang Setelah Transfer:</span>
                <span className="font-black text-rose-700">{currentWarehouseStock} → {afterWarehouseStock} unit (-{quantity})</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stok Rak Etalase Setelah Transfer:</span>
                <span className="font-black text-emerald-700">{currentShelfStock} → {afterShelfStock} unit (+{quantity})</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Catatan Pemindahan (Opsional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pengisian rak depan jam 10 pagi"
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-black rounded-2xl flex items-center justify-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'MEMROSES...' : 'PROSES MASUK RAK'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
