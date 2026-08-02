import React, { useState } from 'react';
import { X, PackagePlus, Plus, Trash2, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { saveBundleComponents, assembleBundle, syncProductToCloud } from '../../services/supabase';
import { logAudit } from '../../services/api';

interface CreateBundleModalProps {
  products: Product[];
  activeBranch: any;
  currentUser: any;
  onClose: () => void;
  onDone: () => void;
}

interface BundleRow {
  productId: string;
  name: string;
  qtyPerPaket: number;
  purchasePrice: number;
  sellingPrice: number;
}

export const CreateBundleModal: React.FC<CreateBundleModalProps> = ({ products, activeBranch, currentUser, onClose, onDone }) => {
  const [bundleName, setBundleName] = useState('');
  const [qty, setQty] = useState<number>(10);
  const [rows, setRows] = useState<BundleRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discount, setDiscount] = useState<number>(1500);
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const candidateProducts = products.filter((p) => !p.sourceProductId);

  const addRow = () => {
    if (!selectedProductId) return;
    const p = products.find((x) => x.id === selectedProductId);
    if (!p) return;
    setRows((prev) =>
      prev.filter((r) => r.productId !== p.id).concat({
        productId: p.id,
        name: p.name,
        qtyPerPaket: 1,
        purchasePrice: Number(p.purchasePrice || 0),
        sellingPrice: Number(p.sellingPrice || 0)
      })
    );
    setSelectedProductId('');
  };

  const removeRow = (pid: string) => setRows((prev) => prev.filter((r) => r.productId !== pid));
  const setRowQty = (pid: string, v: number) =>
    setRows((prev) => prev.map((r) => (r.productId === pid ? { ...r, qtyPerPaket: Math.max(1, Number(v) || 1) } : r)));

  const totalPurchase = rows.reduce((a, r) => a + r.purchasePrice * r.qtyPerPaket, 0);
  const totalSelling = rows.reduce((a, r) => a + r.sellingPrice * r.qtyPerPaket, 0);
  const suggestedPrice = Math.max(0, totalSelling - (Number(discount) || 0));
  const finalPrice = manualPrice !== null ? Math.max(0, Number(manualPrice) || 0) : suggestedPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!bundleName.trim()) {
      setFeedback({ type: 'error', text: 'Nama paket bundling wajib diisi.' });
      return;
    }
    if (rows.length === 0) {
      setFeedback({ type: 'error', text: 'Pilih minimal 1 produk sebagai komponen paket.' });
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setFeedback({ type: 'error', text: 'Jumlah paket harus lebih dari 0.' });
      return;
    }

    // Pre-check stok gudang komponen agar tidak menyisakan state parsial
    const insufficient = rows.find((r) => {
      const p = products.find((x) => x.id === r.productId);
      return (p?.stock ?? 0) < r.qtyPerPaket * qty;
    });
    if (insufficient) {
      const p = products.find((x) => x.id === insufficient.productId);
      setFeedback({
        type: 'error',
        text: `Stok gudang tidak cukup utk "${insufficient.name}". Butuh ${insufficient.qtyPerPaket * qty}, tersedia ${p?.stock ?? 0}.`
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = products.find((p) => p.isBundle && p.name.trim().toLowerCase() === bundleName.trim().toLowerCase());
      const bundleId = existing?.id || `prod-${Date.now()}`;
      const branchId = existing?.branchId || activeBranch?.id || 'default-branch-001';

      const bundleProduct: Product = {
        id: bundleId,
        branchId,
        barcode: existing?.barcode || '',
        name: bundleName.trim(),
        brand: 'Paket',
        category: 'Paket',
        description: `Paket: ${rows.map((r) => `${r.name} x${r.qtyPerPaket}`).join(', ')}`,
        purchasePrice: totalPurchase,
        sellingPrice: finalPrice,
        taxPercent: 0,
        stock: existing?.stock || 0,
        shelfStock: existing?.shelfStock ?? 0,
        minStock: 5,
        expiryDate: '2027-12-31',
        supplierName: '',
        isAvailable: true,
        isBundle: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = await syncProductToCloud(bundleProduct);
      if (!saved) {
        setFeedback({ type: 'error', text: 'Gagal menyimpan produk paket.' });
        setIsSubmitting(false);
        return;
      }

      await saveBundleComponents(bundleId, rows.map((r) => ({ productId: r.productId, quantity: r.qtyPerPaket })));

      const res = await assembleBundle(bundleId, qty);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.message || 'Gagal menarik stok ke paket.' });
        setIsSubmitting(false);
        return;
      }

      await logAudit(
        'BUAT_BUNDLING',
        'INVENTORY_PO',
        `Buat bundling "${bundleName.trim()}" ${qty}x. Harga jual ${formatCurrency(finalPrice)}, modal ${formatCurrency(totalPurchase)}`,
        currentUser?.name || 'Manager',
        currentUser?.id || 'user-001',
        branchId
      );

      setFeedback({ type: 'success', text: `✓ Bundling "${bundleName.trim()}" ${qty} paket berhasil dibuat & siap dijual di POS.` });
      setTimeout(() => {
        onDone();
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Buat bundling error:', err);
      setFeedback({ type: 'error', text: err?.message || 'Gagal membuat bundling.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form onSubmit={handleSubmit} className="bg-[#eef2f6] border border-white/80 w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <PackagePlus className="w-5 h-5" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Buat Bundling / Paket</h3>
              <p className="text-[11px] text-slate-500 font-medium">Rakit beberapa produk jadi 1 paket, tarik stok, siap jual di POS</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Nama + Jumlah */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-slate-700 block mb-1 font-bold">Nama Paket Bundling <span className="text-rose-600">*</span></label>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder="Contoh: Paket Sembako Hemat"
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-slate-700 block mb-1 font-bold">Jumlah Paket yang Dibuat <span className="text-rose-600">*</span></label>
            <input
              type="number"
              min={1}
              value={qty || ''}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full bg-[#eef2f6] text-indigo-800 font-black text-lg p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Stok komponen akan ditarik sejumlah ini × qty per paket.</p>
          </div>
        </div>

        {/* Komponen */}
        <div className="space-y-2">
          <label className="text-slate-700 block font-bold text-xs">Produk Penyusun Paket</label>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="sm:col-span-10 bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
            >
              <option value="">-- Pilih produk komponen --</option>
              {candidateProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Stok Gudang {p.stock} — Beli {formatCurrency(p.purchasePrice)} — Jual {formatCurrency(p.sellingPrice)}
                </option>
              ))}
            </select>
            <button type="button" onClick={addRow} disabled={!selectedProductId} className="sm:col-span-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {rows.length === 0 && <p className="text-[11px] text-slate-500 italic">Belum ada produk. Tambahkan minimal 1.</p>}
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.productId} className="bg-[#eef2f6] p-2.5 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{r.name}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">Beli {formatCurrency(r.purchasePrice)} / Jual {formatCurrency(r.sellingPrice)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">x</span>
                  <input
                    type="number"
                    min={1}
                    value={r.qtyPerPaket}
                    onChange={(e) => setRowQty(r.productId, Number(e.target.value))}
                    className="w-14 bg-[#eef2f6] text-slate-800 font-black text-xs p-1.5 rounded-lg shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                  />
                </div>
                <button type="button" onClick={() => removeRow(r.productId)} className="p-1.5 text-rose-500 hover:text-rose-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Harga */}
        <div className="bg-slate-200/50 rounded-2xl p-3.5 space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Harga Perkiraan (per paket)</p>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-semibold">Total Modal (Kulakan):</span>
            <span className="font-black text-slate-800">{formatCurrency(totalPurchase)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-semibold">Total Jual (sebelum diskon):</span>
            <span className="font-black text-slate-800">{formatCurrency(totalSelling)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-semibold">Diskon per paket:</span>
            <input
              type="number"
              min={0}
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-24 bg-[#eef2f6] text-slate-800 font-black text-xs p-1.5 rounded-lg shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-right"
            />
          </div>
          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-300/70">
            <span className="text-slate-600 font-semibold">Harga Jual Paket (estimasi {formatCurrency(suggestedPrice)}):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={finalPrice || ''}
                onChange={(e) => setManualPrice(Number(e.target.value))}
                className="w-28 bg-[#eef2f6] text-emerald-800 font-black text-sm p-1.5 rounded-lg shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-right"
              />
              <button
                type="button"
                onClick={() => setManualPrice(null)}
                title="Pakai estimasi otomatis"
                className="p-1.5 text-slate-500 hover:text-emerald-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] disabled:opacity-50">
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> MEMBUAT & MENARIK STOK…
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4" /> BUAT BUNDLING
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
