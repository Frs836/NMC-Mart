import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  CheckCircle,
  CreditCard,
  QrCode,
  Banknote,
  PauseCircle,
  Play,
  X,
  AlertCircle,
  Tag,
  History,
  Receipt,
  Package,
  AlertTriangle,
  Eye,
  Layers,
  MessageSquare,
  ClipboardCheck,
  Loader2,
  Camera,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { Product, Customer, Promotion, PaymentMethod, Transaction, HeldCart } from '../../types';
import { formatCurrency, formatDate, generateUUID } from '../../utils/formatters';
import { fetchServerProducts, processCompletedTransaction, logAudit } from '../../services/api';
import { fetchTransactionsFromCloud } from '../../services/supabase';
import { playScanBeep, vibrate } from '../../services/scan';
import { ReceiptModal } from './ReceiptModal';
import { RackTransferModal } from './RackTransferModal';
import { POSStockOpnameModal } from './POSStockOpnameModal';
import { TeamChatModal } from './TeamChatModal';
import { AIPOSAlertWidget } from './AIPOSAlertWidget';
import { ScannerModal, ScanStatus } from './ScannerModal';
import { RefundModal } from './RefundModal';

interface CashierPOSProps {
  currentUser: any;
  activeBranch: any;
  activeShift: any;
  setIsOpenShiftModalOpen: (val: boolean) => void;
  cartItems: any[];
  heldCarts: HeldCart[];
  holdCurrentCart: (note: string) => void;
  restoreHeldCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  setCartQuantity: (productId: string, newQty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartItemDiscounts: number;
  promoDiscount: number;
  cartGrandTotal: number;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (cust: Customer | null) => void;
  appliedPromotion: Promotion | null;
  setAppliedPromotion: (promo: Promotion | null) => void;
}

export const CashierPOS: React.FC<CashierPOSProps> = ({
  currentUser,
  activeBranch,
  activeShift,
  setIsOpenShiftModalOpen,
  cartItems,
  heldCarts,
  holdCurrentCart,
  restoreHeldCart,
  deleteHeldCart,
  addToCart,
  updateCartQuantity,
  setCartQuantity,
  removeFromCart,
  clearCart,
  cartSubtotal,
  cartItemDiscounts,
  promoDiscount,
  cartGrandTotal,
  selectedCustomer,
  setSelectedCustomer,
  appliedPromotion,
  setAppliedPromotion
}) => {
  const [posMode, setPosMode] = useState<'TERMINAL' | 'HISTORY' | 'STOCK_ALERTS'>('TERMINAL');

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [pendingScanConfirm, setPendingScanConfirm] = useState<{ product: Product; currentQty: number } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const scanFeedbackTimerRef = useRef<any>(null);

  // Transaction History State
  const [shiftTransactions, setShiftTransactions] = useState<Transaction[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);

  // Held Cart Modal State
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState('');

  // Mobile Cart Drawer State (di bawah breakpoint lg)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false); // guard sinkron anti double-click
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');

  // Receipt Modal State
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // New Rack & Team Chat Modals
  const [isRackTransferModalOpen, setIsRackTransferModalOpen] = useState(false);
  const [presetRestockProductId, setPresetRestockProductId] = useState<string | undefined>(undefined);
  const [isPOSStockOpnameModalOpen, setIsPOSStockOpnameModalOpen] = useState(false);
  const [isTeamChatModalOpen, setIsTeamChatModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadShiftTransactions();

    const handleFocus = () => {
      loadProducts();
      loadShiftTransactions();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeBranch]);

  const loadProducts = async () => {
    const list = await fetchServerProducts(activeBranch.id);
    setProducts(list);
  };

  const loadShiftTransactions = async () => {
    const txs = await fetchTransactionsFromCloud(activeBranch.id);
    setShiftTransactions(txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  // Categories extracted dynamically from products + default minimarket categories
  const categories = [
    'Semua',
    ...Array.from(new Set(products.map((p) => (p.category ? String(p.category).trim() : '')).filter(Boolean)))
  ];

  const filteredProducts = products.filter((p) => {
    const pCat = p.category ? String(p.category).trim().toLowerCase() : '';
    const selCat = selectedCategory.trim().toLowerCase();
    const matchesCategory =
      selectedCategory === 'Semua' ||
      pCat === selCat ||
      (pCat.length > 0 && pCat.includes(selCat)) ||
      (selCat.length > 0 && selCat.includes(pCat));

    const nameStr = (p.name || '').toLowerCase();
    const barcodeStr = (p.barcode || '').toLowerCase();
    const brandStr = (p.brand || '').toLowerCase();
    const q = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !q ||
      nameStr.includes(q) ||
      barcodeStr.includes(q) ||
      brandStr.includes(q);

    return matchesCategory && matchesSearch;
  });

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  const filteredHistory = shiftTransactions.filter((tx) => {
    const q = historySearchQuery.toLowerCase();
    return (
      tx.txUuid.toLowerCase().includes(q) ||
      (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
      (tx.cashierName && tx.cashierName.toLowerCase().includes(q)) ||
      tx.paymentMethod.toLowerCase().includes(q)
    );
  });

  const showScanFeedback = (fb: { type: 'ok' | 'error'; text: string }) => {
    setScanFeedback(fb);
    if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    scanFeedbackTimerRef.current = setTimeout(() => setScanFeedback(null), 1600);
  };

  // Tambah ke keranjang via barcode (input scan & kamera).
  // Mengembalikan status utk notifikasi overlay kamera.
  const addByBarcode = (code: string): { status: ScanStatus; message: string } => {
    const clean = String(code || '').trim();
    if (!clean) return { status: 'error', message: 'Barcode kosong' };
    if (pendingScanConfirm) {
      return { status: 'confirm', message: 'Selesaikan verifikasi produk sebelumnya dulu' };
    }

    const found = products.find((p) => p.barcode && p.barcode.trim() === clean);
    if (!found) {
      playScanBeep(false);
      vibrate([60, 70, 60]);
      const msg = `Barcode ${clean} tidak ditemukan`;
      showScanFeedback({ type: 'error', text: msg });
      return { status: 'error', message: msg };
    }

    const shelfAvailable = found.shelfStock ?? found.stock;
    if (shelfAvailable <= 0) {
      playScanBeep(false);
      const msg = `Stok "${found.name}" di etalase kosong`;
      showScanFeedback({ type: 'error', text: msg });
      return { status: 'error', message: msg };
    }

    const existing = cartItems.find((i) => i.product.id === found.id);
    if (existing) {
      if (existing.quantity >= shelfAvailable) {
        playScanBeep(false);
        const msg = `Stok etalase habis utk "${found.name}"`;
        showScanFeedback({ type: 'error', text: msg });
        return { status: 'error', message: msg };
      }
      // Produk sudah ada → wajib verifikasi sebelum menambah qty (anti scan ganda)
      playScanBeep(true);
      setPendingScanConfirm({ product: found, currentQty: existing.quantity });
      const msg = `${found.name} sudah ${existing.quantity}x. Tambah 1 lagi?`;
      showScanFeedback({ type: 'ok', text: msg });
      return { status: 'confirm', message: msg };
    }

    addToCart(found, 1);
    playScanBeep(true);
    vibrate(50);
    const msg = `+ ${found.name}`;
    showScanFeedback({ type: 'ok', text: msg });
    return { status: 'added', message: msg };
  };

  const confirmAddQty = () => {
    if (!pendingScanConfirm) return;
    addToCart(pendingScanConfirm.product, 1);
    playScanBeep(true);
    vibrate(50);
    showScanFeedback({ type: 'ok', text: `+ ${pendingScanConfirm.product.name}` });
    setPendingScanConfirm(null);
  };

  const cancelAddQty = () => setPendingScanConfirm(null);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addByBarcode(barcodeInput);
    setBarcodeInput('');
    if (isBarcodeScannerOpen) {
      requestAnimationFrame(() => barcodeInputRef.current?.focus());
    }
  };

  // Auto-focus input barcode saat mode pindai dibuka
  useEffect(() => {
    if (isBarcodeScannerOpen) {
      const t = setTimeout(() => barcodeInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isBarcodeScannerOpen]);

  // Bersihkan timer feedback saat unmount
  useEffect(() => {
    return () => {
      if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    };
  }, []);

  const handleHoldCartSubmit = () => {
    if (cartItems.length === 0) return;
    holdCurrentCart(holdNoteInput || `Pesanan #${heldCarts.length + 1}`);
    setHoldNoteInput('');
  };

  const openCheckout = () => {
    if (!activeShift) {
      alert('Kasir wajib membuka shift sebelum memproses transaksi penjualan!');
      setIsOpenShiftModalOpen(true);
      return;
    }
    if (cartItems.length === 0) {
      alert('Keranjang belanja masih kosong.');
      return;
    }
    setIsCartDrawerOpen(false);
    setPayAmount(cartGrandTotal);
    setIsPaymentModalOpen(true);
  };

  const handleCompleteTransaction = async () => {
    // Anti double-click: guard ref sinkron — klik kedua langsung diabaikan
    if (isProcessingRef.current) return;
    if (paymentMethod === 'CASH' && payAmount < cartGrandTotal) {
      alert('Jumlah pembayaran tunai kurang dari total belanja!');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      const changeAmount = paymentMethod === 'CASH' ? payAmount - cartGrandTotal : 0;
      const txUuid = generateUUID();

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        txUuid,
        branchId: activeBranch.id,
        shiftId: activeShift?.id || 'shift-offline',
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        items: [...cartItems],
        subtotal: cartSubtotal,
        taxTotal: 0,
        discountTotal: cartItemDiscounts + promoDiscount,
        grandTotal: cartGrandTotal,
        payAmount: paymentMethod === 'CASH' ? payAmount : cartGrandTotal,
        changeAmount,
        paymentMethod,
        customerName: customerNameInput || selectedCustomer?.name || 'Pelanggan Umum',
        customerPhone: customerPhoneInput || selectedCustomer?.whatsapp || '',
        status: 'COMPLETED',
        isSynced: false,
        createdAt: new Date().toISOString()
      };

      await processCompletedTransaction(newTx);
      await logAudit(
        'TRANSAKSI_KASIR',
        'POS',
        `Transaksi selesai ${txUuid.slice(0, 8)} Total: ${formatCurrency(cartGrandTotal)} (${paymentMethod})`,
        currentUser.name,
        currentUser.id
      );

      loadProducts();
      loadShiftTransactions();
      setCompletedTx(newTx);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setCustomerNameInput('');
      setCustomerPhoneInput('');
    } catch (err) {
      console.error('Gagal memproses transaksi:', err);
      alert('Transaksi gagal diproses. Stok tidak berkurang. Silakan coba lagi.');
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // ===== Shared Cart Body (dipakai panel lg + drawer mobile) =====
  const cartItemsList = (
    <>
      {cartItems.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
          <ShoppingCart className="w-12 h-12 opacity-30 text-slate-500" />
          <p className="text-xs font-extrabold text-slate-600">Keranjang Belanja Kosong</p>
          <p className="text-[11px] text-slate-500">Pilih atau pindai produk di katalog untuk menambahkan ke kasir.</p>
        </div>
      ) : (
        cartItems.map((item) => (
          <div
            key={item.product.id}
            className="bg-[#eef2f6] rounded-2xl p-3 flex items-center justify-between gap-2 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] border border-white/60"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h4>
              <p className="text-[11px] text-emerald-700 font-extrabold mt-0.5">
                {formatCurrency(item.product.sellingPrice)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">/ unit</span>
              </p>
            </div>

                    {/* Quantity Controls - angka bisa diedit manual */}
                    <div className="flex items-center gap-1 bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9,inset_-2px_-2px_4px_#ffffff] rounded-xl p-1">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9] text-slate-800 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={item.product.shelfStock ?? item.product.stock}
                        value={item.quantity}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || v === '-') return;
                          setCartQuantity(item.product.id, Number(v));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className="w-12 text-center font-black text-sm text-slate-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-lg [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateCartQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9] text-slate-800 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

            <button
              onClick={() => removeFromCart(item.product.id)}
              className="text-slate-400 hover:text-rose-600 p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}
    </>
  );

  const cartFooter = (
    <div className="p-4 bg-[#eef2f6] border-t border-slate-200/80 space-y-2.5">
      {/* Hold Cart Option */}
      {cartItems.length > 0 && (
        <div className="flex items-center gap-2 pb-1">
          <input
            type="text"
            placeholder="Catatan simpan pesanan..."
            value={holdNoteInput}
            onChange={(e) => setHoldNoteInput(e.target.value)}
            className="flex-1 bg-[#eef2f6] text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
          />
          <button
            onClick={handleHoldCartSubmit}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            Tahan Pesanan
          </button>
        </div>
      )}

      <div className="flex justify-between text-xs text-slate-600 font-semibold">
        <span>Subtotal Catalog</span>
        <span>{formatCurrency(cartSubtotal)}</span>
      </div>

      {promoDiscount > 0 && (
        <div className="flex justify-between text-xs text-emerald-700 font-bold">
          <span>Diskon Promosi</span>
          <span>-{formatCurrency(promoDiscount)}</span>
        </div>
      )}

      <div className="flex justify-between text-sm sm:text-base font-black text-slate-800 pt-2 border-t border-slate-300">
        <span>TOTAL PEMBAYARAN</span>
        <span className="text-emerald-700 text-lg sm:text-xl">{formatCurrency(cartGrandTotal)}</span>
      </div>

      <button
        disabled={cartItems.length === 0}
        onClick={openCheckout}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl text-xs sm:text-sm shadow-[4px_4px_10px_rgba(16,185,129,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-2"
      >
        <span>PROSES BAYAR SEKARANG</span>
        <CreditCard className="w-4 h-4" />
      </button>
    </div>
  );
  // ===== End Shared Cart Body =====

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-120px)] max-w-7xl mx-auto p-3 sm:p-5 pb-24 md:pb-6 text-slate-800">
      {/* Shift Gate Notification Banner */}
      {!activeShift && (
        <div className="w-full bg-[#eef2f6] shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">Kasir Belum Membuka Shift</h4>
              <p className="text-xs text-slate-600">Buka shift kasir terlebih dahulu untuk mencatat saldo kas awal sebelum bertransaksi.</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpenShiftModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-[3px_3px_6px_rgba(16,185,129,0.3)] shrink-0"
          >
            Buka Shift Sekarang
          </button>
        </div>
      )}

      {/* POS Sub-Header Mode Navigation Bar */}
      <div className="bg-[#eef2f6] p-2 rounded-2xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPosMode('TERMINAL')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              posMode === 'TERMINAL'
                ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                : 'bg-[#eef2f6] text-slate-600 hover:text-slate-900 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Kasir Terminal & Katalog</span>
          </button>

          <button
            onClick={() => setPosMode('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              posMode === 'HISTORY'
                ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                : 'bg-[#eef2f6] text-slate-600 hover:text-slate-900 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Riwayat Transaksi Struk</span>
          </button>

          <button
            onClick={() => setPosMode('STOCK_ALERTS')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              posMode === 'STOCK_ALERTS'
                ? 'bg-[#eef2f6] text-amber-800 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                : 'bg-[#eef2f6] text-slate-600 hover:text-slate-900 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Peringatan Stok Menipis</span>
            {lowStockProducts.length > 0 && (
              <span className="bg-amber-600 text-white font-black px-2 py-0.5 rounded-full text-[10px]">
                {lowStockProducts.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons for Rack Stock */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRackTransferModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-[3px_3px_6px_rgba(16,185,129,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
            title="Input Restock Barang dari Gudang ke Rak Etalase"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Restock Rak</span>
          </button>

          <button
            onClick={() => setIsPOSStockOpnameModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#eef2f6] text-blue-700 hover:text-blue-900 flex items-center gap-1.5 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]"
            title="Opname Fisik Stok Rak POS"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Opname Rak</span>
          </button>

          {activeShift && (
            <div className="hidden md:flex px-3 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-900 font-bold text-xs shadow-[inset_1px_1px_2px_#cbd2d9] items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Shift: {activeShift.cashierName}</span>
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: TERMINAL & CATALOG */}
      {posMode === 'TERMINAL' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* AI POS Alert & Assistant Banner */}
          <AIPOSAlertWidget
            products={products}
            onOpenRackTransfer={() => setIsRackTransferModalOpen(true)}
          />

          <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 lg:max-h-[calc(100vh-176px)]">
          {/* Left Product Catalog Section */}
          <div className="flex-1 min-h-0 flex flex-col bg-[#eef2f6] rounded-3xl overflow-hidden shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60">
            {/* Search & Barcode Scan Bar */}
            <div className="p-3 border-b border-slate-200/80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama produk, brand, atau barcode SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>
              <button
                onClick={() => setIsBarcodeScannerOpen(!isBarcodeScannerOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] ${
                  isBarcodeScannerOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#eef2f6] text-emerald-700'
                }`}
                title="Mode Pindai: scan beruntun tanpa klik (USB keyboard / ketik)"
              >
                <Barcode className="w-4 h-4" />
                <span className="hidden sm:inline">{isBarcodeScannerOpen ? 'Mode Pindai ON' : 'Mode Pindai'}</span>
              </button>
              <button
                onClick={() => setIsCameraScanOpen(true)}
                className="flex items-center gap-1.5 bg-[#eef2f6] text-blue-700 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]"
                title="Pindai barcode pakai kamera (multi-scan)"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Scan Kamera</span>
              </button>
            </div>

            {/* Scan Feedback Toast */}
            {scanFeedback && (
              <div
                className={`mx-3 mt-2 px-3 py-2 rounded-xl text-xs font-bold shadow-md ${
                  scanFeedback.type === 'ok'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {scanFeedback.type === 'ok' ? '✓' : '✕'} {scanFeedback.text}
              </div>
            )}

            {/* Barcode Quick Input Simulator */}
            {isBarcodeScannerOpen && (
              <form onSubmit={handleBarcodeSubmit} className="bg-slate-200/50 p-3 border-b border-slate-300 flex gap-2">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan / ketik barcode lalu Enter (tetap terbuka utk scan beruntun)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1 bg-[#eef2f6] text-emerald-800 font-mono px-3 py-2 rounded-xl text-xs font-bold shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
                >
                  Tambah
                </button>
              </form>
            )}

            {/* Category Horizontal Chips */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-200/80 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                      : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 min-h-0 p-3.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const shelfVal = p.shelfStock !== undefined ? p.shelfStock : p.stock;
                const isShelfEmpty = shelfVal <= 0;
                const isWarehouseEmpty = p.stock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isShelfEmpty && addToCart(p, 1)}
                    className={`flex flex-col justify-between p-3 rounded-2xl transition-all select-none min-h-[145px] border ${
                      isShelfEmpty
                        ? 'bg-slate-200/80 border-slate-300 opacity-75 shadow-[inset_2px_2px_4px_#cbd2d9] cursor-not-allowed'
                        : 'bg-[#eef2f6] border-white/60 cursor-pointer shadow-[5px_5px_10px_#cbd2d9,-5px_-5px_10px_#ffffff] hover:shadow-[2px_2px_5px_#cbd2d9,-2px_-2px_5px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase truncate">{p.category}</span>
                        {isShelfEmpty ? (
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded-md shadow-[inset_1px_1px_2px_#cbd2d9]" title="Barang habis di rak etalase kasir. Lakukan Restock dari Gudang agar dapat ditransaksikan.">
                            RAK HABIS
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded-md shadow-[inset_1px_1px_2px_#cbd2d9]">
                            Rak: {shelfVal} unit
                          </span>
                        )}
                      </div>
                      <h3 className={`text-xs font-extrabold line-clamp-2 leading-tight ${isShelfEmpty ? 'text-slate-500' : 'text-slate-800'}`}>
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
                        <span className="truncate max-w-[90px]">{p.brand}</span>
                        <span className={`font-bold ${p.stock > 0 ? 'text-blue-700 font-extrabold' : 'text-slate-400'}`}>
                          Gudang: {p.stock}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-300/80">
                      <span className={`text-xs sm:text-sm font-black ${isShelfEmpty ? 'text-slate-500' : 'text-emerald-700'}`}>
                        {formatCurrency(p.sellingPrice)}
                      </span>
                      {isShelfEmpty ? (
                        p.stock > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPresetRestockProductId(p.id);
                              setIsRackTransferModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-extrabold rounded-xl text-[10px] flex items-center gap-1 shadow-[2px_2px_4px_rgba(217,119,6,0.4)] transition-all active:scale-95 shrink-0 z-10"
                            title="Restock barang ini dari gudang ke etalase rak kasir"
                          >
                            <Layers className="w-3 h-3" />
                            <span>+ Restock Rak</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-1 rounded-xl">
                            Kosong Total
                          </span>
                        )
                      ) : (
                        <button
                          disabled={isShelfEmpty}
                          className="w-7 h-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-[2px_2px_4px_rgba(16,185,129,0.3)] active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Touch Cart Panel - hanya inline di lg+, di mobile pakai drawer */}
          <div className="hidden lg:flex w-96 shrink-0 min-h-0 bg-[#eef2f6] rounded-3xl flex-col overflow-hidden shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60">
            <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h2 className="font-extrabold text-xs sm:text-sm text-slate-800">Keranjang Kasir ({cartItems.length})</h2>
              </div>

              <div className="flex items-center gap-2">
                {heldCarts.length > 0 && (
                  <button
                    onClick={() => setIsHeldModalOpen(true)}
                    className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl shadow-[inset_1px_1px_2px_#cbd2d9] flex items-center gap-1"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Tertahan ({heldCarts.length})</span>
                  </button>
                )}

                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cart Item List */}
            <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5">
              {cartItemsList}
            </div>

            {/* Cart Total & Checkout Footer */}
            {cartFooter}
          </div>
        </div>

        {/* Mobile / Tablet: Floating Cart Bar + Cart Drawer (di bawah lg) */}
        {cartItems.length > 0 && (
          <div className="lg:hidden sticky bottom-16 md:bottom-0 z-40 bg-emerald-600 text-white rounded-2xl shadow-[0_-6px_20px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
            >
              <ShoppingCart className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold opacity-80 truncate">Keranjang • {cartItems.length} item</span>
                <span className="block text-base font-black truncate">{formatCurrency(cartGrandTotal)}</span>
              </div>
            </button>
            <button
              onClick={openCheckout}
              className="px-4 py-2.5 bg-white text-emerald-700 font-black rounded-xl text-xs shadow-sm shrink-0"
            >
              Bayar
            </button>
          </div>
        )}

        {isCartDrawerOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setIsCartDrawerOpen(false)}
          >
            <div
              className="bg-[#eef2f6] rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_-8px_24px_rgba(0,0,0,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-800">Keranjang Kasir ({cartItems.length})</h3>
                </div>
                <div className="flex items-center gap-2">
                  {heldCarts.length > 0 && (
                    <button
                      onClick={() => {
                        setIsCartDrawerOpen(false);
                        setIsHeldModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl flex items-center gap-1"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      Tertahan ({heldCarts.length})
                    </button>
                  )}
                  {cartItems.length > 0 && (
                    <button onClick={clearCart} className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                    </button>
                  )}
                  <button onClick={() => setIsCartDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5">
                {cartItemsList}
              </div>

              {cartFooter}
            </div>
          </div>
        )}
        </div>
      )}

      {/* MODE 2: TRANSACTION HISTORY & FULL RECEIPT DETAIL */}
      {posMode === 'HISTORY' && (
        <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Riwayat Penjualan Struk Transaksi</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Laporan riwayat lengkap transaksi penjualan, rincian barang, dan metode pembayaran.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID transaksi, nama pelanggan, metode..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-[#eef2f6] text-xs font-bold text-slate-800 pl-9 pr-3 py-2.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-200/50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-300">
                <tr>
                  <th className="p-3.5">ID Struk</th>
                  <th className="p-3.5">Waktu Transaksi</th>
                  <th className="p-3.5">Kasir Shift</th>
                  <th className="p-3.5">Nama Pelanggan</th>
                  <th className="p-3.5">Metode Bayar</th>
                  <th className="p-3.5 text-center">Jumlah Barang</th>
                  <th className="p-3.5 text-right">Total Belanja</th>
                  <th className="p-3.5 text-center">Aksi Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      Belum ada riwayat transaksi penjualan tercatat pada shift ini.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-200/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-emerald-800">{tx.txUuid.slice(0, 8)}</td>
                      <td className="p-3.5 text-slate-600 font-bold">{formatDate(tx.createdAt)}</td>
                      <td className="p-3.5 text-slate-800 font-extrabold">{tx.cashierName}</td>
                      <td className="p-3.5 text-slate-600 font-medium">{tx.customerName || 'Pelanggan Umum'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                            tx.paymentMethod === 'CASH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.paymentMethod === 'QRIS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800">{tx.items?.length || 0} unit</td>
                      <td className="p-3.5 text-right font-black text-sm text-emerald-700">{formatCurrency(tx.grandTotal)}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {tx.status === 'REFUNDED' && (
                            <span className="px-2 py-1 rounded-xl bg-rose-100 text-rose-800 font-black text-[10px] uppercase shadow-[inset_1px_1px_2px_#cbd2d9]">
                              Refunded
                            </span>
                          )}
                          {['OWNER', 'MANAGER', 'MAINTENANCE'].includes(currentUser.role) && tx.status !== 'REFUNDED' && (
                            <button
                              onClick={() => setRefundTarget(tx)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-[11px] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center gap-1"
                              title="Return / Refund barang dari transaksi ini"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTxForReceipt(tx);
                              setIsReceiptModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-[#eef2f6] hover:bg-slate-200 text-emerald-700 font-extrabold rounded-xl text-[11px] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail Struk</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE 3: STOCK ALERTS FOR CASHIER */}
      {posMode === 'STOCK_ALERTS' && (
        <div className="bg-[#eef2f6] rounded-3xl p-5 shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Peringatan Stok Menipis & Restock Kasir</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Daftar barang minimarket yang stoknya di bawah batas minimal (minStock) atau habis untuk segera dilaporkan ke manager.
              </p>
            </div>
            <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1.5 rounded-2xl shadow-[inset_1px_1px_2px_#cbd2d9]">
              Total Alert: {lowStockProducts.length} SKU
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {lowStockProducts.length === 0 ? (
              <div className="col-span-full p-12 text-center text-emerald-700 font-bold bg-[#eef2f6] rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
                ✓ Seluruh stok barang minimarket pada shift ini dalam batas aman!
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#eef2f6] p-4 rounded-2xl shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] border border-white/60 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase text-slate-500">{p.category}</span>
                    <span className="text-xs font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-lg shadow-[inset_1px_1px_2px_#cbd2d9]">
                      Sisa: {p.stock}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 line-clamp-2">{p.name}</h4>
                  <p className="text-[10px] font-mono text-slate-500">Barcode SKU: {p.barcode}</p>
                  <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Min. Stok: {p.minStock}</span>
                    <span className="font-black text-emerald-700">{formatCurrency(p.sellingPrice)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Held Carts Modal Drawer */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <span>Daftar Pesanan Tertahan ({heldCarts.length})</span>
              </h3>
              <button onClick={() => setIsHeldModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {heldCarts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Tidak ada pesanan yang ditahan.</p>
              ) : (
                heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="bg-[#eef2f6] p-3.5 rounded-2xl shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] flex items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">{h.note}</h4>
                      <p className="text-[11px] text-slate-500">{h.items.length} jenis barang dalam keranjang</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          restoreHeldCart(h.id);
                          setIsHeldModalOpen(false);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Muat</span>
                      </button>
                      <button
                        onClick={() => deleteHeldCart(h.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#eef2f6] border border-white/80 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Proses Pembayaran Transaksi</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Badge */}
            <div className="bg-[#eef2f6] p-4 rounded-2xl text-center shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]">
              <span className="text-xs text-slate-500 uppercase font-extrabold tracking-wider">Total Tagihan Belanja</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{formatCurrency(cartGrandTotal)}</div>
            </div>

            {/* Customer Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Pelanggan</label>
                <input
                  type="text"
                  placeholder="Contoh: Pelanggan Umum / Ahmad"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 p-2.5 rounded-xl font-bold shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">No. WhatsApp (+62...)</label>
                <input
                  type="text"
                  placeholder="+62812..."
                  value={customerPhoneInput}
                  onChange={(e) => setCustomerPhoneInput(e.target.value)}
                  className="w-full bg-[#eef2f6] text-slate-800 p-2.5 rounded-xl font-bold shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'CASH'
                      ? 'bg-[#eef2f6] text-emerald-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                      : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'QRIS'
                      ? 'bg-[#eef2f6] text-emerald-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                      : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">QRIS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'bg-[#eef2f6] text-emerald-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                      : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">Transfer Bank</span>
                </button>
              </div>
            </div>

            {/* Cash Nominal Preset Buttons */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-600 block">Uang Diterima (Rp)</label>
                <input
                  type="number"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-[#eef2f6] text-emerald-800 font-black text-xl p-3 rounded-2xl shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  {[cartGrandTotal, 10000, 20000, 50000, 100000, 200000, 500000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setPayAmount(nom)}
                      className="px-3 py-1.5 bg-[#eef2f6] hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9]"
                    >
                      {nom === cartGrandTotal ? 'Uang Pas' : formatCurrency(nom)}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-[#eef2f6] rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">Kembalian:</span>
                  <span className="font-black text-emerald-700 text-base">
                    {formatCurrency(Math.max(0, payAmount - cartGrandTotal))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {isProcessing && (
                <div className="w-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold rounded-2xl p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Memproses transaksi & stok keluar… Jangan tutup jendela / jangan klik ulang.</span>
                </div>
              )}
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={isProcessing}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleCompleteTransaction}
                disabled={isProcessing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>MEMPROSES…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>KONFIRMASI TRANSAKSI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable / WhatsApp Receipt Modal */}
      {isReceiptModalOpen && (completedTx || selectedTxForReceipt) && (
        <ReceiptModal
          tx={completedTx || selectedTxForReceipt!}
          branch={activeBranch}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedTxForReceipt(null);
          }}
        />
      )}

      {/* Restock Rack Transfer Modal */}
      {isRackTransferModalOpen && (
        <RackTransferModal
          products={products}
          currentOperatorName={currentUser.name}
          presetProductId={presetRestockProductId}
          onSuccess={() => {
            loadProducts();
            setPresetRestockProductId(undefined);
          }}
          onClose={() => {
            setIsRackTransferModalOpen(false);
            setPresetRestockProductId(undefined);
          }}
        />
      )}

      {/* POS Stock Opname Modal */}
      {isPOSStockOpnameModalOpen && (
        <POSStockOpnameModal
          products={products}
          currentOperatorName={currentUser.name}
          onSuccess={loadProducts}
          onClose={() => setIsPOSStockOpnameModalOpen(false)}
        />
      )}

      {/* Team Chat & Shift Message Modal */}
      {isTeamChatModalOpen && (
        <TeamChatModal
          currentUser={currentUser}
          onClose={() => setIsTeamChatModalOpen(false)}
        />
      )}

      {/* Verifikasi tambah quantity (anti scan ganda) */}
      {pendingScanConfirm && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#eef2f6] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Tambah quantity?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  <span className="font-bold">{pendingScanConfirm.product.name}</span> sudah ada di keranjang (
                  {pendingScanConfirm.currentQty}x). Konfirmasi untuk menambah 1 lagi.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelAddQty}
                className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={confirmAddQty}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs"
              >
                Ya, Tambah 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner (multi-scan) */}
      <ScannerModal
        open={isCameraScanOpen}
        onClose={() => setIsCameraScanOpen(false)}
        onScan={addByBarcode}
        title="Pindai Barcode Produk"
      />

      {/* Refund / Return Modal */}
      {refundTarget && (
        <RefundModal
          tx={refundTarget}
          currentUser={currentUser}
          onClose={() => setRefundTarget(null)}
          onDone={() => {
            setRefundTarget(null);
            loadShiftTransactions();
            loadProducts();
          }}
        />
      )}
    </div>
  );
};

