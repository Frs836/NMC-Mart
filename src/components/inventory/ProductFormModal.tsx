import React, { useState } from 'react';
import { Package, X, Trash2, PlusCircle, ListFilter, Camera } from 'lucide-react';
import { Product } from '../../types';
import { isValidEAN13 } from '../../utils/formatters';
import { ScannerModal } from '../pos/ScannerModal';

interface ProductFormModalProps {
  product: Product | null;
  availableCategories?: string[];
  existingBarcodes?: string[];
  onSave: (data: Partial<Product>) => void;
  onDelete?: (productId: string) => void;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = [
  'Minuman',
  'Makanan Ringan',
  'Sembako',
  'Olahan Susu',
  'Roti & Kue',
  'Kebutuhan Rumah Tangga',
  'Perawatan Diri',
  'Obat & Kesehatan',
  'Elektronik',
  'Lainnya'
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  availableCategories = [],
  existingBarcodes = [],
  onSave,
  onDelete,
  onClose
}) => {
  const mergedCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...availableCategories]));

  const initialCategory = product?.category || 'Minuman';
  const isInitialCustom = !mergedCategories.includes(initialCategory);

  const [isCustomCategory, setIsCustomCategory] = useState(isInitialCustom);
  const [customCategoryText, setCustomCategoryText] = useState(isInitialCustom ? initialCategory : '');

  const [formData, setFormData] = useState<Partial<Product>>({
    id: product?.id,
    barcode: product?.barcode || '',
    name: product?.name || '',
    brand: product?.brand || '',
    category: initialCategory,
    description: product?.description || '',
    purchasePrice: product?.purchasePrice || 0,
    sellingPrice: product?.sellingPrice || 0,
    taxPercent: product?.taxPercent || 0,
    stock: product?.stock || 0,
    shelfStock: product?.shelfStock ?? 0,
    minStock: product?.minStock || 10,
    expiryDate: product?.expiryDate || '2027-12-31',
    supplierName: product?.supplierName || ''
  });

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isScanBarcodeOpen, setIsScanBarcodeOpen] = useState(false);

  const barcodeValue = String(formData.barcode || '').trim();
  const barcodeDuplicate = barcodeValue.length > 0 && existingBarcodes.some((b) => b && b.trim() === barcodeValue && b.trim() !== product?.barcode);
  const barcodeInvalidEan = /^\d{13}$/.test(barcodeValue) && !isValidEAN13(barcodeValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Nama produk wajib diisi!');
      return;
    }
    if (barcodeDuplicate) {
      alert(`Barcode "${barcodeValue}" sudah terdaftar pada produk lain. Gunakan barcode lain atau kosongkan.`);
      return;
    }

    const purchasePrice = Number(formData.purchasePrice) || 0;
    const sellingPrice = Number(formData.sellingPrice) || 0;
    if (sellingPrice < purchasePrice) {
      const proceed = confirm(
        `Harga jual (Rp ${sellingPrice.toLocaleString('id-ID')}) lebih rendah dari harga beli (Rp ${purchasePrice.toLocaleString('id-ID')}).\n\nMargin akan negatif. Tetap simpan?`
      );
      if (!proceed) return;
    }

    const finalCategory = isCustomCategory ? (customCategoryText.trim() || 'Lainnya') : (formData.category || 'Minuman');

    onSave({
      ...formData,
      purchasePrice,
      sellingPrice,
      category: finalCategory
    });
  };

  const handleDelete = () => {
    if (product && onDelete) {
      onDelete(product.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form
        onSubmit={handleSubmit}
        className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>{product ? 'Edit SKU Produk' : 'Tambah SKU Produk Baru'}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="text-slate-600 block mb-1 font-bold">
              Kode Barcode SKU <span className="text-[10px] text-slate-400 font-normal">(opsional — kosongkan jika tanpa barcode)</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Contoh: 899179424840"
                className="w-full bg-[#eef2f6] text-emerald-800 font-mono font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsScanBarcodeOpen(true)}
                className="px-2.5 py-1 bg-[#eef2f6] text-blue-700 font-bold rounded-xl text-[10px] shadow-[2px_2px_4px_#cbd2d9] flex items-center gap-1"
                title="Pindai barcode dari kemasan pakai kamera"
              >
                <Camera className="w-3 h-3" />
                Scan
              </button>
            </div>
            {barcodeDuplicate && (
              <p className="text-[10px] font-bold text-rose-600 mt-1">Barcode ini sudah terdaftar pada produk lain.</p>
            )}
            {barcodeInvalidEan && (
              <p className="text-[10px] font-bold text-amber-600 mt-1">Format EAN-13 tidak valid (cek digit salah). Barcode tetap bisa disimpan jika dari format lain.</p>
            )}
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Nama Produk</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Contoh: Indomie Goreng 85g"
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Brand / Merek</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Contoh: Indofood"
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          {/* Category Selector with Custom Option */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-600 font-bold">Kategori Produk</label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1 hover:underline"
              >
                {isCustomCategory ? (
                  <>
                    <ListFilter className="w-3 h-3" />
                    <span>Pilih dari List</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3 h-3" />
                    <span>+ Ketik Manual</span>
                  </>
                )}
              </button>
            </div>

            {isCustomCategory ? (
              <input
                type="text"
                value={customCategoryText}
                onChange={(e) => setCustomCategoryText(e.target.value)}
                placeholder="Masukkan kategori baru..."
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            ) : (
              <select
                value={formData.category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsCustomCategory(true);
                  } else {
                    setFormData({ ...formData, category: e.target.value });
                  }
                }}
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              >
                {mergedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__NEW__">+ Ketik Kategori Baru...</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Harga Beli Kulakan (Rp)</label>
            <input
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
              required
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Harga Jual Kasir (Rp)</label>
            <input
              type="number"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
              required
              className="w-full bg-[#eef2f6] text-emerald-800 font-black p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Stok Utama Gudang</label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              required
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-emerald-800 block mb-1 font-extrabold flex items-center justify-between">
              <span>Stok Rak Etalase (POS)</span>
              <span className="text-[10px] text-emerald-600 font-normal">(Siap Jual)</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.shelfStock}
              onChange={(e) => setFormData({ ...formData, shelfStock: Number(e.target.value) })}
              required
              className="w-full bg-[#eef2f6] text-emerald-900 font-black p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Batas Stok Menipis</label>
            <input
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
              required
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Tanggal Kadaluarsa</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Nama Pemasok / Supplier</label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              placeholder="Contoh: PT Indofood Sukses Makmur"
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showConfirmDelete && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-xs space-y-2 text-rose-900 font-bold animate-fadeIn">
            <p>⚠ Yakin ingin menghapus produk "{formData.name}" secara permanen? Data di cloud dan lokal akan terhapus.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1 bg-rose-600 text-white rounded-xl font-extrabold shadow-[2px_2px_4px_rgba(225,29,72,0.3)]"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-2">
          {product && onDelete && !showConfirmDelete && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="px-3 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_4px_#cbd2d9]"
              title="Hapus Produk Ini"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
          >
            SIMPAN SKU
          </button>
        </div>
      </form>

      {/* Camera Barcode Scanner - isi field barcode */}
      <ScannerModal
        open={isScanBarcodeOpen}
        onClose={() => setIsScanBarcodeOpen(false)}
        onScan={(code) => {
          setFormData((prev) => ({ ...prev, barcode: code }));
          setIsScanBarcodeOpen(false);
        }}
        title="Pindai Barcode Kemasan"
        autoCloseOnScan
      />
    </div>
  );
};
