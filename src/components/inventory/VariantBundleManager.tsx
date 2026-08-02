import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Package, Layers, Loader2 } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { fetchVariantsForProduct, fetchBundleComponents, saveBundleComponents, syncProductToCloud, deleteProductFromCloud } from '../../services/supabase';

interface VariantBundleManagerProps {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
  onDone: () => void;
}

export const VariantBundleManager: React.FC<VariantBundleManagerProps> = ({ product, allProducts, onClose, onDone }) => {
  const [variants, setVariants] = useState<Product[]>([]);
  const [components, setComponents] = useState<{ productId: string; quantity: number; productName?: string }[]>([]);
  const [isBundle, setIsBundle] = useState(Boolean(product.isBundle));
  const [loading, setLoading] = useState(true);

  // Form varian baru
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState<number>(product.sellingPrice || 0);

  // Form komponen baru
  const [componentProductId, setComponentProductId] = useState('');
  const [componentQty, setComponentQty] = useState<number>(1);

  const isSourceProduct = !product.sourceProductId;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isSourceProduct) {
        setVariants(await fetchVariantsForProduct(product.id));
      }
      const comps = await fetchBundleComponents(product.id);
      setComponents(comps.map((c) => ({ productId: c.productId, quantity: c.quantity, productName: c.productName })));
      setLoading(false);
    };
    load();
  }, [product.id]);

  const handleAddVariant = async () => {
    if (!variantName.trim()) {
      alert('Nama varian wajib diisi.');
      return;
    }
    const v: Product = {
      id: `prod-${Date.now()}`,
      branchId: product.branchId || 'default-branch-001',
      barcode: '',
      name: `${product.name} ${variantName.trim()}`,
      brand: product.brand || '',
      category: product.category || 'Umum',
      description: product.description || '',
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: Number(variantPrice) || 0,
      taxPercent: 0,
      stock: 0,
      shelfStock: 0,
      minStock: 0,
      expiryDate: product.expiryDate || '2027-12-31',
      supplierName: product.supplierName || '',
      isAvailable: true,
      sourceProductId: product.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await syncProductToCloud(v);
    setVariantName('');
    setVariants(await fetchVariantsForProduct(product.id));
    onDone();
  };

  const handleRemoveVariant = async (variantId: string) => {
    if (!confirm('Hapus varian ini?')) return;
    await deleteProductFromCloud(variantId);
    setVariants(await fetchVariantsForProduct(product.id));
    onDone();
  };

  const handleToggleBundle = async (checked: boolean) => {
    setIsBundle(checked);
    await syncProductToCloud({ ...product, isBundle: checked });
    onDone();
  };

  const handleAddComponent = async () => {
    if (!componentProductId) {
      alert('Pilih produk komponen.');
      return;
    }
    if (componentProductId === product.id) {
      alert('Komponen tidak boleh produk itu sendiri.');
      return;
    }
    const next = [...components.filter((c) => c.productId !== componentProductId), { productId: componentProductId, quantity: Math.max(1, componentQty), productName: allProducts.find((p) => p.id === componentProductId)?.name }];
    await saveBundleComponents(product.id, next);
    setComponentProductId('');
    setComponentQty(1);
    setComponents((await fetchBundleComponents(product.id)).map((c) => ({ productId: c.productId, quantity: c.quantity, productName: c.productName })));
    onDone();
  };

  const handleRemoveComponent = async (compId: string) => {
    const next = components.filter((c) => c.productId !== compId);
    await saveBundleComponents(product.id, next);
    setComponents((await fetchBundleComponents(product.id)).map((c) => ({ productId: c.productId, quantity: c.quantity, productName: c.productName })));
    onDone();
  };

  const componentCandidates = allProducts.filter((p) => p.id !== product.id && !p.sourceProductId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Varian & Paket</h3>
              <p className="text-[11px] text-slate-500 font-medium">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> <span className="ml-2 text-xs">Memuat...</span>
          </div>
        ) : (
          <>
            {/* ===== Varian Penjualan ===== */}
            {isSourceProduct && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black text-slate-800">Varian Penjualan (mis. Matang)</h4>
                  <span className="text-[10px] text-slate-400">Stok mengikuti produk ini</span>
                </div>

                <div className="space-y-1.5">
                  {variants.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic">Belum ada varian. Tambahkan mis. "Matang" dengan harga berbeda.</p>
                  )}
                  {variants.map((v) => (
                    <div key={v.id} className="bg-[#eef2f6] p-2.5 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{v.name}</p>
                        <p className="text-[11px] font-black text-emerald-700">{formatCurrency(v.sellingPrice)}</p>
                      </div>
                      <button onClick={() => handleRemoveVariant(v.id)} className="p-1.5 text-rose-500 hover:text-rose-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    placeholder='Nama varian, mis. "Matang"'
                    className="bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
                  />
                  <input
                    type="number"
                    value={variantPrice || ''}
                    onChange={(e) => setVariantPrice(Number(e.target.value))}
                    placeholder="Harga jual varian"
                    className="bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
                  />
                </div>
                <button
                  onClick={handleAddVariant}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Tambah Varian
                </button>
              </div>
            )}

            {/* ===== Paket / Bundle ===== */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isBundle}
                  onChange={(e) => handleToggleBundle(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                Produk ini adalah Paket (Bundle) — punya stok sendiri dari hasil merakit komponen
              </label>

              {isBundle && (
                <>
                  <div className="space-y-1.5">
                    {components.length === 0 && (
                      <p className="text-[11px] text-slate-500 italic">Belum ada komponen. Tambahkan produk penyusun paket.</p>
                    )}
                    {components.map((c) => (
                      <div key={c.productId} className="bg-[#eef2f6] p-2.5 rounded-2xl shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{c.productName || c.productId}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">Qty {c.quantity} per paket</p>
                        </div>
                        <button onClick={() => handleRemoveComponent(c.productId)} className="p-1.5 text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={componentProductId}
                      onChange={(e) => setComponentProductId(e.target.value)}
                      className="col-span-2 bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
                    >
                      <option value="">-- Pilih produk komponen --</option>
                      {componentCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={componentQty || ''}
                      onChange={(e) => setComponentQty(Number(e.target.value))}
                      className="bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
                      placeholder="Qty"
                    />
                  </div>
                  <button
                    onClick={handleAddComponent}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Tambah Komponen
                  </button>
                </>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onDone();
            }}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
