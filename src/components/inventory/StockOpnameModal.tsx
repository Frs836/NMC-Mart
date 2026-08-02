import React, { useState } from 'react';
import { Layers, X, Check } from 'lucide-react';
import { Product } from '../../types';
import { saveProduct, logAudit } from '../../services/api';

interface StockOpnameModalProps {
  products: Product[];
  currentUser: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  products,
  currentUser,
  onClose,
  onRefresh
}) => {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const variance = selectedProduct ? physicalCount - selectedProduct.stock : 0;

  const handleSaveOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!Number.isFinite(physicalCount) || physicalCount < 0) {
      alert('Jumlah hitung fisik tidak boleh negatif atau kosong.');
      return;
    }

    const updated = {
      ...selectedProduct,
      stock: physicalCount
    };

    try {
      await saveProduct(updated, currentUser.name);
      await logAudit(
        'STOCK_OPNAME_ADJUSTMENT',
        'INVENTORY',
        `Stok Opname produk ${selectedProduct.name}: Stok Sistem (${selectedProduct.stock}) -> Fisik (${physicalCount}), Selisih: ${
          variance > 0 ? '+' + variance : variance
        }. Alasan: ${notes || 'Audit Opname Rutin'}`,
        currentUser.name,
        currentUser.id
      );

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error('Gagal simpan opname:', err);
      alert('Gagal menyimpan opname stok. Periksa koneksi dan coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form
        onSubmit={handleSaveOpname}
        className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-amber-700">
          <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <span>Rekonsiliasi Stok Opname</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-600 block mb-1 font-bold">Pilih Produk SKU</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((prod) => prod.id === e.target.value);
                if (p) setPhysicalCount(p.stock);
              }}
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.barcode}) - Stok Sistem: {p.stock} unit
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-[#eef2f6] p-3.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] space-y-1">
              <div className="flex justify-between text-slate-600 font-bold">
                <span>Catatan Stok Sistem:</span>
                <span className="text-slate-800">{selectedProduct.stock} unit</span>
              </div>
              <div className="flex justify-between text-slate-600 font-bold">
                <span>Barcode:</span>
                <span className="font-mono text-emerald-700">{selectedProduct.barcode}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Jumlah Hitung Fisik Sebenarnya</label>
            <input
              type="number"
              value={physicalCount}
              onChange={(e) => setPhysicalCount(Number(e.target.value))}
              min={0}
              required
              className="w-full bg-[#eef2f6] text-amber-800 font-black text-xl p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          {selectedProduct && (
            <div className="p-3 bg-[#eef2f6] rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">Selisih Hitungan:</span>
              <span
                className={`font-black text-sm ${
                  variance === 0 ? 'text-slate-600' : variance > 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {variance > 0 ? `+${variance}` : variance} unit
              </span>
            </div>
          )}

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Alasan Penyesuaian / Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Ditemukan selisih barang rusak/hilang saat stok opname mingguan"
              className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-20"
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
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-[4px_4px_10px_rgba(217,119,6,0.3)]"
          >
            <Check className="w-4 h-4" />
            <span>ADJUST STOK</span>
          </button>
        </div>
      </form>
    </div>
  );
};
