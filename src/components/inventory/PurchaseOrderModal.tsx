import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CheckCircle2, Clock, XCircle, PackageCheck, Truck, X, Search, FileText } from 'lucide-react';
import { PurchaseOrder, Product, UserRole } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { getPurchaseOrders, createPurchaseOrder, updatePOStatus } from '../../services/api';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  activeBranch: any;
  currentUser: any;
  userRole: UserRole;
  onStockUpdated: () => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  activeBranch,
  currentUser,
  userRole,
  onStockUpdated
}) => {
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [loading, setLoading] = useState(false);

  // Form states for creating PO
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQty, setOrderQty] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [poItems, setPoItems] = useState<{
    productId: string;
    productName: string;
    quantityOrdered: number;
    unitCost: number;
    totalCost: number;
  }[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadPOs();
    }
  }, [isOpen, activeBranch]);

  const loadPOs = async () => {
    setLoading(true);
    const list = await getPurchaseOrders(activeBranch?.id || 'default-branch-001');
    setPoList(list);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const cost = unitCost > 0 ? unitCost : prod.purchasePrice;
    const newItem = {
      productId: prod.id,
      productName: prod.name,
      quantityOrdered: Number(orderQty) || 1,
      unitCost: cost,
      totalCost: (Number(orderQty) || 1) * cost
    };

    setPoItems((prev) => [...prev.filter((i) => i.productId !== prod.id), newItem]);
    setSelectedProductId('');
    setOrderQty(10);
    setUnitCost(0);
  };

  const handleRemoveItem = (productId: string) => {
    setPoItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || poItems.length === 0) return;

    const totalAmount = poItems.reduce((acc, item) => acc + item.totalCost, 0);
    const poNum = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    await createPurchaseOrder({
      poNumber: poNum,
      branchId: activeBranch?.id || 'default-branch-001',
      supplierName: supplierName.trim(),
      items: poItems,
      totalAmount,
      status: 'ORDERED',
      createdBy: currentUser?.name || 'Manager',
      notes
    });

    setSupplierName('');
    setNotes('');
    setPoItems([]);
    setActiveTab('LIST');
    loadPOs();
  };

  const handleReceiveStock = async (po: PurchaseOrder) => {
    if (confirm(`Konfirmasi penerimaan barang untuk PO #${po.poNumber}? Stok di gudang akan bertambah otomatis.`)) {
      await updatePOStatus(po.id, 'RECEIVED', currentUser?.name || 'Manager');
      loadPOs();
      onStockUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#eef2f6] border border-white/90 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-[#eef2f6] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-[inset_2px_2px_4px_#cbd2d9]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">Sistem Purchase Order (PO) Supplier</h3>
              <p className="text-xs text-slate-500 font-bold">Kelola pemesanan stok barang & restock gudang resmi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'LIST' ? 'CREATE' : 'LIST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'CREATE'
                  ? 'bg-slate-200 text-slate-700 shadow-[inset_2px_2px_4px_#cbd2d9]'
                  : 'bg-indigo-600 text-white shadow-[2px_2px_4px_rgba(79,70,229,0.3)] hover:bg-indigo-500'
              }`}
            >
              {activeTab === 'CREATE' ? (
                <>
                  <FileText className="w-4 h-4" />
                  Daftar PO
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Buat PO Baru
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-2xl hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'CREATE' ? (
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Supplier / Distributor</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Indofood Sukses Makmur"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#eef2f6] text-xs font-bold border border-slate-300/80 shadow-[inset_2px_2px_4px_#cbd2d9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catatan PO (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Keterangan pengiriman / tempo pembayaran"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#eef2f6] text-xs font-bold border border-slate-300/80 shadow-[inset_2px_2px_4px_#cbd2d9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Add Item Panel */}
              <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-800">Pilih Produk Untuk Dipesan</h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / barcode..."
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white text-xs border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Daftar Produk ({products.length})</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedProductId(val);
                        const prod = products.find((p) => p.id === val);
                        if (prod) {
                          setUnitCost(prod.purchasePrice || 0);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white text-xs font-bold border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products
                        .filter((p) => {
                          if (!searchProductQuery.trim()) return true;
                          const q = searchProductQuery.toLowerCase();
                          return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q));
                        })
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — Rp {p.purchasePrice ? p.purchasePrice.toLocaleString('id-ID') : 0} (Stok: {p.stock} {p.unit || 'pcs'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Jumlah Pesan</label>
                    <input
                      type="number"
                      min="1"
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-white text-xs font-bold border border-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Harga Beli / Unit (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="Harga per unit"
                      className="w-full px-3 py-2 rounded-xl bg-white text-xs font-bold border border-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductId}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-[2px_2px_4px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800">Daftar Item PO ({poItems.length})</h4>
                {poItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-white/60 rounded-2xl border border-dashed border-slate-300">
                    Belum ada produk ditambahkan ke PO ini
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-200/70 font-bold text-slate-700">
                        <tr>
                          <th className="p-2.5">Produk</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Harga Beli per Unit</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {poItems.map((item) => (
                          <tr key={item.productId}>
                            <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                            <td className="p-2.5 text-center font-bold">{item.quantityOrdered}</td>
                            <td className="p-2.5 text-right font-bold text-slate-600">
                              {formatCurrency(item.unitCost)}
                            </td>
                            <td className="p-2.5 text-right font-black text-indigo-700">
                              {formatCurrency(item.totalCost)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer Submit */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold">Total Estimasi PO:</span>
                  <div className="text-lg font-black text-indigo-700">
                    {formatCurrency(poItems.reduce((acc, item) => acc + item.totalCost, 0))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('LIST')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={poItems.length === 0 || !supplierName}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white shadow-[2px_2px_4px_rgba(79,70,229,0.3)] transition-all"
                  >
                    Simpan & Kirim PO
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <p className="text-xs text-slate-500 py-8 text-center">Memuat daftar PO...</p>
              ) : poList.length === 0 ? (
                <div className="text-center py-10 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                  <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Belum Ada Riwayat Purchase Order</p>
                  <p className="text-xs text-slate-500">
                    Klik 'Buat PO Baru' untuk memesan stok barang resmi ke distributor/supplier.
                  </p>
                </div>
              ) : (
                poList.map((po) => (
                  <div
                    key={po.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-indigo-900">{po.poNumber}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              po.status === 'RECEIVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : po.status === 'ORDERED'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {po.status === 'RECEIVED'
                              ? 'BERHASIL DITERIMA'
                              : po.status === 'ORDERED'
                              ? 'PROSES PENGIRIMAN'
                              : po.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Supplier: <span className="font-bold text-slate-800">{po.supplierName}</span> • Tanggal: {formatShortDate(po.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">Total Pembelian</span>
                        <span className="text-sm font-black text-indigo-700">{formatCurrency(po.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <p className="text-[11px] font-bold text-slate-600 mb-1">Rincian Item Dipesan:</p>
                      <div className="flex flex-wrap gap-2">
                        {po.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="bg-white px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200 shadow-2xs"
                          >
                            {it.productName} ({it.quantityOrdered}x) @ {formatCurrency(it.unitCost)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {po.status === 'ORDERED' && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Barang Tiba di Gudang
                        </span>

                        <button
                          onClick={() => handleReceiveStock(po)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_4px_rgba(16,185,129,0.3)]"
                        >
                          <PackageCheck className="w-4 h-4" />
                          Terima Barang & Tambah Stok
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
