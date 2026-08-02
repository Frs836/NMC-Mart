import React, { useState } from 'react';
import { ArrowUpRight, X, Check } from 'lucide-react';
import { Product } from '../../types';
import { saveProduct, logAudit } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface StockPurchaseModalProps {
  products: Product[];
  currentUser: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const StockPurchaseModal: React.FC<StockPurchaseModalProps> = ({
  products,
  currentUser,
  onClose,
  onRefresh
}) => {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [inboundQty, setInboundQty] = useState<number>(50);
  const [unitCost, setUnitCost] = useState<number>(products[0]?.purchasePrice || 0);
  const [supplier, setSupplier] = useState(products[0]?.supplierName || '');

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!Number.isFinite(inboundQty) || inboundQty <= 0) {
      alert('Jumlah stok masuk harus lebih dari 0.');
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      alert('Harga beli per unit tidak boleh negatif.');
      return;
    }

    const newStock = selectedProduct.stock + inboundQty;
    const updated = {
      ...selectedProduct,
      stock: newStock,
      purchasePrice: unitCost,
      supplierName: supplier || selectedProduct.supplierName
    };

    await saveProduct(updated, currentUser.name);
    await logAudit(
      'INBOUND_STOCK_PURCHASE',
      'INVENTORY',
      `Pembelian stok masuk +${inboundQty} unit ${selectedProduct.name} dengan harga ${formatCurrency(unitCost)}/unit. Supplier: ${supplier || 'Utama'}`,
      currentUser.name,
      currentUser.id
    );

    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form
        onSubmit={handleSavePurchase}
        className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-emerald-700">
          <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            <span>Penerimaan Pembelian Stok Masuk</span>
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
                if (p) {
                  setUnitCost(p.purchasePrice);
                  setSupplier(p.supplierName || '');
                }
              }}
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.barcode}) - Stok Saat Ini: {p.stock} unit
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Jumlah Masuk (Unit)</label>
            <input
              type="number"
              value={inboundQty}
              onChange={(e) => setInboundQty(Number(e.target.value))}
              min={1}
              required
              className="w-full bg-[#eef2f6] text-emerald-800 font-black text-xl p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Harga Beli Per Unit (Rp)</label>
            <input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              required
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Nama Pemasok / Supplier</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Contoh: PT Indofood Sukses Makmur"
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          {selectedProduct && (
            <div className="p-3 bg-[#eef2f6] rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">Total Nilai Pembelian Kulakan:</span>
              <span className="font-black text-emerald-700 text-sm">{formatCurrency(inboundQty * unitCost)}</span>
            </div>
          )}
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
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
          >
            <Check className="w-4 h-4" />
            <span>CATAT STOK MASUK</span>
          </button>
        </div>
      </form>
    </div>
  );
};
