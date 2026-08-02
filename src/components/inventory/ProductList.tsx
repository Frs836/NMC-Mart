import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Layers, ArrowUpRight, AlertTriangle, Filter, CheckCircle, Truck } from 'lucide-react';
import { Product, UserRole } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { fetchServerProducts, saveProduct, deleteProduct } from '../../services/api';
import { ProductFormModal } from './ProductFormModal';
import { StockOpnameModal } from './StockOpnameModal';
import { StockPurchaseModal } from './StockPurchaseModal';
import { PurchaseOrderModal } from './PurchaseOrderModal';

interface ProductListProps {
  userRole: UserRole;
  activeBranch: any;
  currentUser: any;
}

export const ProductList: React.FC<ProductListProps> = ({ userRole, activeBranch, currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY'>('ALL');

  // Modal States
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isStockOpnameOpen, setIsStockOpnameOpen] = useState(false);
  const [isStockPurchaseOpen, setIsStockPurchaseOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    const handleFocus = () => {
      loadProducts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeBranch]);

  const loadProducts = async () => {
    try {
      const list = await fetchServerProducts(activeBranch.id);
      setProducts(list);
    } catch (err) {
      console.error('Gagal memuat produk:', err);
      alert('Gagal memuat katalog produk. Periksa koneksi internet dan coba lagi.');
    }
  };

  // Dynamically extract all unique categories from products list
  const dynamicCategories: string[] = Array.from(
    new Set(products.map((p) => (p.category ? String(p.category).trim() : '')).filter(Boolean))
  );
  
  const defaultCategories: string[] = ['Minuman', 'Makanan Ringan', 'Sembako', 'Olahan Susu', 'Roti & Kue', 'Kebutuhan Rumah Tangga'];
  const mergedCategories: string[] = Array.from(new Set([...defaultCategories, ...dynamicCategories]));
  const categories: string[] = ['Semua', ...mergedCategories];

  // Helper calculation for Near Expiry (within 30 days)
  const isNearExpiry = (expiryDateStr: string) => {
    if (!expiryDateStr) return false;
    const exp = new Date(expiryDateStr).getTime();
    const now = new Date().getTime();
    const daysLeft = (exp - now) / (1000 * 3600 * 24);
    return daysLeft <= 30 && daysLeft >= -1;
  };

  const filteredProducts = products.filter((p) => {
    const pCat = p.category ? String(p.category).trim().toLowerCase() : '';
    const selCat = selectedCategory.trim().toLowerCase();
    const matchesCat =
      selectedCategory === 'Semua' ||
      pCat === selCat ||
      (pCat.length > 0 && pCat.includes(selCat)) ||
      (selCat.length > 0 && selCat.includes(pCat));

    const nameStr = (p.name || '').toLowerCase();
    const barcodeStr = (p.barcode || '').toLowerCase();
    const brandStr = (p.brand || '').toLowerCase();
    const supplierStr = (p.supplierName || '').toLowerCase();
    const q = searchQuery.trim().toLowerCase();

    const matchesQuery =
      !q ||
      nameStr.includes(q) ||
      barcodeStr.includes(q) ||
      brandStr.includes(q) ||
      supplierStr.includes(q);

    let matchesStatus = true;
    const stockVal = Number(p.stock) || 0;
    const minStockVal = Number(p.minStock) || 0;

    if (statusFilter === 'LOW_STOCK') {
      matchesStatus = stockVal <= minStockVal && stockVal > 0;
    } else if (statusFilter === 'OUT_OF_STOCK') {
      matchesStatus = stockVal <= 0;
    } else if (statusFilter === 'NEAR_EXPIRY') {
      matchesStatus = isNearExpiry(p.expiryDate);
    }

    return matchesCat && matchesQuery && matchesStatus;
  });

  const getCategoryCount = (cat: string) => {
    if (cat === 'Semua') return products.length;
    const selCat = cat.trim().toLowerCase();
    return products.filter((p) => {
      const pCat = p.category ? p.category.trim().toLowerCase() : '';
      return pCat === selCat || (pCat.length > 0 && pCat.includes(selCat)) || (selCat.length > 0 && selCat.includes(pCat));
    }).length;
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const nearExpiryCount = products.filter((p) => isNearExpiry(p.expiryDate)).length;

  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      await saveProduct(productData, currentUser.name);
      setIsProductFormOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      console.error('Gagal menyimpan produk:', err);
      alert('Gagal menyimpan produk ke cloud. Periksa koneksi dan coba lagi.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId, currentUser.name);
      setDeletingProduct(null);
      setIsProductFormOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      console.error('Gagal menghapus produk:', err);
      alert('Gagal menghapus produk dari cloud. Periksa koneksi dan coba lagi.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800">
      {/* Top Header & Quick Stock Status Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Katalog Produk & Pengelompokan Stok</span>
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Total Produk: {products.length} SKU • Siap Dijual di Kasir POS
          </p>
        </div>

        {/* Action Buttons */}
        {(userRole === 'OWNER' || userRole === 'MANAGER') && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsPOModalOpen(true)}
              className="flex-1 md:flex-initial bg-[#eef2f6] text-indigo-800 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all flex items-center justify-center gap-1.5"
            >
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>PO Supplier</span>
            </button>
            <button
              onClick={() => setIsStockPurchaseOpen(true)}
              className="flex-1 md:flex-initial bg-[#eef2f6] text-slate-700 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>Pembelian Stok</span>
            </button>
            <button
              onClick={() => setIsStockOpnameOpen(true)}
              className="flex-1 md:flex-initial bg-[#eef2f6] text-amber-800 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all flex items-center justify-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Stok Opname</span>
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductFormOpen(true);
              }}
              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-[4px_4px_10px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah SKU Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar: Status Badges & Search */}
      <div className="bg-[#eef2f6] p-4 sm:p-5 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-[#eef2f6] text-emerald-800 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-emerald-400'
                : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Semua SKU ({products.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('LOW_STOCK')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'LOW_STOCK'
                ? 'bg-amber-100 text-amber-800 shadow-[inset_2px_2px_4px_#cbd2d9]'
                : 'bg-[#eef2f6] text-amber-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Stok Menipis ({lowStockCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'OUT_OF_STOCK'
                ? 'bg-rose-100 text-rose-800 shadow-[inset_2px_2px_4px_#cbd2d9]'
                : 'bg-[#eef2f6] text-rose-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Stok Habis ({outOfStockCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('NEAR_EXPIRY')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'NEAR_EXPIRY'
                ? 'bg-teal-100 text-teal-800 shadow-[inset_2px_2px_4px_#cbd2d9]'
                : 'bg-[#eef2f6] text-teal-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <span>Mendekati Expired ({nearExpiryCount})</span>
          </button>
        </div>

        {/* Search Input & Category Chips */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama barang, brand, barcode, atau supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#eef2f6] text-slate-800 font-extrabold pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {categories.map((cat) => {
              const count = getCategoryCount(cat);
              const isSel = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                      : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container - Empty State Fallback */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#eef2f6] rounded-3xl p-12 text-center shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-3 min-h-[300px] flex flex-col justify-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#eef2f6] shadow-[inset_4px_4px_8px_#cbd2d9,inset_-4px_-4px_8px_#ffffff] flex items-center justify-center text-slate-400">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-slate-700">Tidak ada produk ditemukan</h3>
          <p className="text-xs text-slate-500 font-semibold max-w-sm">
            Coba ubah kata kunci pencarian, ganti filter kategori, atau tambahkan barang SKU baru ke dalam inventaris minimarket.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#eef2f6] rounded-3xl overflow-hidden shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 min-h-[300px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-200/60 text-slate-700 uppercase text-[10px] tracking-wider font-black border-b border-slate-300/80">
                <tr>
                  <th className="p-3.5">Barcode / SKU</th>
                  <th className="p-3.5">Nama Produk</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Harga Beli</th>
                  <th className="p-3.5">Harga Jual</th>
                  <th className="p-3.5">Margin %</th>
                  <th className="p-3.5">Stok Saat Ini</th>
                  <th className="p-3.5">Kadaluarsa</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredProducts.map((p) => {
                  const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100).toFixed(1) : '0';
                  const isLowStock = p.stock <= p.minStock && p.stock > 0;
                  const isOut = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-200/40 transition-colors">
                      <td className="p-3.5 font-mono text-emerald-700 font-bold">{p.barcode}</td>
                      <td className="p-3.5 font-extrabold text-slate-800">
                        {p.name}
                        {p.brand && <span className="text-[10px] text-slate-400 block font-normal">{p.brand}</span>}
                      </td>
                      <td className="p-3.5 text-slate-600 font-extrabold">
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-bold">{formatCurrency(p.purchasePrice)}</td>
                      <td className="p-3.5 font-black text-emerald-700">{formatCurrency(p.sellingPrice)}</td>
                      <td className="p-3.5 font-bold text-teal-700">{margin}%</td>
                      <td className="p-3.5 font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 shadow-[inset_1px_1px_2px_#cbd2d9]'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 shadow-[inset_1px_1px_2px_#cbd2d9]'
                              : 'bg-emerald-100 text-emerald-800 shadow-[inset_1px_1px_2px_#cbd2d9]'
                          }`}
                        >
                          {p.stock} unit
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-bold text-[11px]">{formatShortDate(p.expiryDate)}</td>
                      <td className="p-3.5 text-right">
                        {(userRole === 'OWNER' || userRole === 'MANAGER') && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductFormOpen(true);
                              }}
                              className="p-2 bg-[#eef2f6] text-slate-600 hover:text-slate-900 rounded-xl shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                              title="Edit Produk SKU"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingProduct(p)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-xl shadow-[2px_2px_4px_#cbd2d9] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                              title="Hapus Produk SKU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Optimized for Mobile Phones & Tablets) */}
          <div className="md:hidden space-y-3 min-h-[300px]">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= p.minStock && p.stock > 0;
              const isOut = p.stock <= 0;
              const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100).toFixed(1) : '0';

              return (
                <div
                  key={p.id}
                  className="bg-[#eef2f6] rounded-2xl p-4 space-y-3 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] border border-white/60"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                          {p.barcode}
                        </span>
                        <span className="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md font-bold">
                          {p.category}
                        </span>
                      </div>
                      <h3 className="font-black text-xs sm:text-sm text-slate-800 mt-1">{p.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold">{p.brand || 'No Brand'}</p>
                    </div>
                    {(userRole === 'OWNER' || userRole === 'MANAGER') && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsProductFormOpen(true);
                          }}
                          className="p-2.5 bg-[#eef2f6] text-slate-700 rounded-xl shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                          title="Edit Produk SKU"
                        >
                          <Edit2 className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl shadow-[2px_2px_4px_#cbd2d9] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Harga Jual</span>
                      <span className="font-black text-emerald-700 text-sm">{formatCurrency(p.sellingPrice)}</span>
                      <span className="text-[10px] text-teal-700 block font-bold">Margin: {margin}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Stok Tersedia</span>
                      <span
                        className={`font-black text-xs ${
                          isOut ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {p.stock} unit {isOut ? '(Habis)' : isLowStock ? '(Menipis)' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Product Modal */}
      {isProductFormOpen && (
        <ProductFormModal
          product={editingProduct}
          availableCategories={mergedCategories}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
          onClose={() => {
            setIsProductFormOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-[inset_2px_2px_4px_#cbd2d9]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Konfirmasi Hapus Produk</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus produk <span className="font-black text-rose-700">"{deletingProduct.name}"</span> ({deletingProduct.barcode})?
              </p>
              <p className="text-[11px] text-slate-500 mt-1 italic">
                Tindakan ini akan menghapus produk dari database cloud & lokal secara permanen.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteProduct(deletingProduct.id)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(225,29,72,0.3)]"
              >
                YA, HAPUS PERMANEN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Opname Modal */}
      {isStockOpnameOpen && (
        <StockOpnameModal
          products={products}
          currentUser={currentUser}
          onClose={() => setIsStockOpnameOpen(false)}
          onRefresh={loadProducts}
        />
      )}

      {/* Inbound Purchase Modal */}
      {isStockPurchaseOpen && (
        <StockPurchaseModal
          products={products}
          currentUser={currentUser}
          onClose={() => setIsStockPurchaseOpen(false)}
          onRefresh={loadProducts}
        />
      )}

      {/* Official PO Supplier Modal */}
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        products={products}
        activeBranch={activeBranch}
        currentUser={currentUser}
        userRole={userRole}
        onStockUpdated={loadProducts}
      />
    </div>
  );
};

