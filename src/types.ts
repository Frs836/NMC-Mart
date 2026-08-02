export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'MAINTENANCE';

export type NavigationTab =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'finance'
  | 'reports'
  | 'audit'
  | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  password?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  receiptFooter?: string;
  logoUrl?: string;
}

export interface Product {
  id: string;
  branchId: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  stock: number; // Warehouse / Total Stock
  shelfStock?: number; // Display Shelf / Rak Penjualan Stock
  minStock: number;
  expiryDate: string;
  supplierName?: string;
  isAvailable: boolean;
  sourceProductId?: string; // varian (mis. matang) menunjuk ke produk sumber (mentah)
  isBundle?: boolean; // produk paket
  createdAt: string;
  updatedAt: string;
}

export interface BundleComponent {
  id: string;
  bundleId: string;
  productId: string;
  productName?: string;
  quantity: number;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountAmount: number;
  subtotal: number;
}

export interface HeldCart {
  id: string;
  note: string;
  customerName?: string;
  items: CartItem[];
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'QRIS' | 'BANK_TRANSFER';

export interface Transaction {
  id: string;
  txUuid: string;
  branchId: string;
  shiftId: string;
  cashierId: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  payAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  status: 'COMPLETED' | 'REFUNDED' | 'CANCELLED';
  isSynced: boolean;
  createdAt: string;
}

export interface Shift {
  id: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  expectedClosingCash?: number;
  actualClosingCash?: number;
  cashDifference?: number;
  startTime: string;
  endTime?: string;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface RefundItem {
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  subtotal: number;
}

export interface Refund {
  id: string;
  transactionId: string;
  branchId: string;
  items: RefundItem[];
  refundAmount: number;
  isFull: boolean;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  branchId: string;
  shiftId: string;
  type: 'CASH_IN' | 'EXPENSE_OUT';
  amount: number;
  category: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  branchId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

export interface Promotion {
  id: string;
  title: string;
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y';
  value: number;
  minPurchase: number;
  code?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  loyaltyPoints?: number;
  totalSpent: number;
  lastVisit: string;
}

export interface AIInsightsResponse {
  executiveSummary: string;
  restockUrgent: string[];
  promotionalAdvice: string[];
  revenueGrowthTip: string;
}

export interface TeamMessage {
  id: string;
  branchId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientRole?: UserRole | 'ALL';
  message: string;
  isUrgent?: boolean;
  createdAt: string;
}

export interface ShelfStockTransfer {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  quantityTransferred: number;
  operatorName: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived?: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  branchId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  createdBy: string;
  receivedBy?: string;
  createdAt: string;
  receivedAt?: string;
  notes?: string;
}

export interface ApprovalRequest {
  id: string;
  branchId: string;
  requestedBy: string;
  requestedByName: string;
  type: 'VOID_TRANSACTION' | 'MANUAL_DISCOUNT' | 'STOCK_ADJUSTMENT' | 'PRICE_CHANGE';
  details: string;
  amount?: number;
  targetId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StoreExpense {
  id: string;
  branchId: string;
  category: 'SEWA' | 'GAJI' | 'LISTRIK_AIR' | 'KERUSAKAN_BARANG' | 'OPERASIONAL' | 'LAINNYA';
  amount: number;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface SalesTarget {
  id: string;
  branchId: string;
  monthYear: string;
  targetRevenue: number;
  targetProfit: number;
  createdAt: string;
}
