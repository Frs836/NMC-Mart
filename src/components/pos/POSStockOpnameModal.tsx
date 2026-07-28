import React, { useState } from 'react';
import { ClipboardCheck, X, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { adjustShelfStock } from '../../services/api';

interface POSStockOpnameModalProps {
  products: Product[];
  currentOperatorName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const POSStockOpnameModal: React.FC<POSStockOpnameModalProps> = ({
  products,
  currentOperatorName,
  onSuccess,
  onClose
}) => {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  const filteredProducts = products.filter((p) => {
    const nameStr = (p.name || '').toLowerCase();
    const barcodeStr = (p.barcode || '').toLowerCase();
    const brandStr = (p.brand || '').toLowerCase();
    const q = searchFilter.trim().toLowerCase();
    return !q || nameStr.includes(q) || barcodeStr.includes(q) || brandStr.includes(q);
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const currentShelfStock = selectedProduct?.shelfStock ?? 0;
  const [actualShelfStock, setActualShelfStock] = useState<number>(currentShelfStock);
  const [notes, setNotes] = useState<string>('Pemeriksaan fisik rak etalase kasir');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const diff = actualShelfStock - currentShelfStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await adjustShelfStock(selectedProduct.id, actualShelfStock, currentOperatorName, notes);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: `✓ Stok etalase ${selectedProduct.name} berhasil disesuaikan menjadi ${actualShelfStock} unit.`
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } else {
      setFeedback({ type: 'error', text: res.message || 'Gagal update opname rak.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-[inset_2px_2px_4px_#cbd2d9]">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-800">Opname Stok Rak Etalase</h3>
              <p className="text-[11px] text-slate-500">Sesuaikan jumlah fisik barang yang tampil di rak etalase kasir</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

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
              onChange={(e) => {
                const pId = e.target.value;
                setSelectedProductId(pId);
                const p = products.find((prod) => prod.id === pId);
                if (p) setActualShelfStock(p.shelfStock ?? 0);
              }}
              className="w-full bg-white text-slate-900 font-bold p-3 rounded-2xl shadow-[2px_2px_6px_#cbd2d9] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer"
            >
              {filteredProducts.length === 0 ? (
                <option disabled value="">Tidak ada produk cocok</option>
              ) : (
                filteredProducts.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900 font-bold py-2">
                    {p.name} (Stok Rak Sistem: {p.shelfStock ?? 0})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="p-3 bg-slate-200/60 rounded-2xl flex items-center justify-between font-bold">
            <span className="text-slate-600">Stok Rak di Sistem saat ini:</span>
            <span className="text-slate-900 text-sm font-black">{currentShelfStock} unit</span>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Hasil Hitung Fisik di Rak (Aktual)</label>
            <input
              type="number"
              min="0"
              value={actualShelfStock}
              onChange={(e) => setActualShelfStock(Number(e.target.value))}
              required
              className="w-full bg-[#eef2f6] text-slate-900 font-black text-sm p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          {/* Diff Indicator */}
          {diff !== 0 && (
            <div
              className={`p-3 rounded-2xl font-bold flex items-center gap-2 ${
                diff < 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Selisih: <strong className="font-black">{diff > 0 ? `+${diff}` : diff} unit</strong> ({diff < 0 ? 'Berkurang / Rusak' : 'Bertambah'}).
              </span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">Alasan Penyesuaian / Catatan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Barang fisik di etalase kemasan pecah 1 unit"
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
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-black rounded-2xl shadow-[4px_4px_10px_rgba(37,99,235,0.3)]"
            >
              {isSubmitting ? 'SIMPAN...' : 'SIMPAN OPNAME RAK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
