import { Product, User, Branch, Customer, Promotion } from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'default-branch-001',
    name: 'RetailFlow Minimarket - Main Store',
    address: 'Jl. Merdeka No. 45, Jakarta Pusat',
    phone: '+62 812-3456-7890',
    isActive: true
  },
  {
    id: 'branch-002',
    name: 'RetailFlow Minimarket - Branch 2 (Dormant)',
    address: 'Jl. Sudirman No. 12, Bandung',
    phone: '+62 813-9876-5432',
    isActive: false
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'user-001',
    name: 'Budi Santoso',
    email: 'owner@retailflow.com',
    role: 'OWNER',
    branchId: 'default-branch-001',
    password: '123'
  },
  {
    id: 'user-002',
    name: 'Dewi Lestari',
    email: 'manager@retailflow.com',
    role: 'MANAGER',
    branchId: 'default-branch-001',
    password: '123'
  },
  {
    id: 'user-003',
    name: 'Siti Rahma',
    email: 'cashier@retailflow.com',
    role: 'CASHIER',
    branchId: 'default-branch-001',
    password: '123'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    branchId: 'default-branch-001',
    barcode: '89999990001',
    name: 'Air Mineral Aqua 600ml',
    brand: 'Aqua',
    category: 'Minuman',
    description: 'Air minum dalam kemasan botol 600ml',
    purchasePrice: 2500,
    sellingPrice: 4000,
    taxPercent: 0,
    stock: 142,
    shelfStock: 24,
    minStock: 20,
    expiryDate: '2027-01-01',
    supplierName: 'PT Tirta Investama',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-002',
    branchId: 'default-branch-001',
    barcode: '89999990002',
    name: 'Keripik Kentang Chitato BBQ 68g',
    brand: 'Chitato',
    category: 'Makanan Ringan',
    description: 'Keripik kentang renyah rasa sapi panggang',
    purchasePrice: 7500,
    sellingPrice: 10500,
    taxPercent: 0,
    stock: 8,
    shelfStock: 2,
    minStock: 15,
    expiryDate: '2026-11-15',
    supplierName: 'PT Indofood Sukses Makmur',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-003',
    branchId: 'default-branch-001',
    barcode: '89999990003',
    name: 'Indomie Goreng Spesial 85g',
    brand: 'Indomie',
    category: 'Sembako',
    description: 'Mie instan goreng rasa spesial legendaris',
    purchasePrice: 2800,
    sellingPrice: 3500,
    taxPercent: 0,
    stock: 250,
    shelfStock: 48,
    minStock: 50,
    expiryDate: '2026-08-20',
    supplierName: 'PT Indofood Sukses Makmur',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-004',
    branchId: 'default-branch-001',
    barcode: '89999990004',
    name: 'Susu UHT Ultra Milk Full Cream 1L',
    brand: 'Ultra Milk',
    category: 'Olahan Susu',
    description: 'Susu segar UHT rasa full cream 1 Liter',
    purchasePrice: 16500,
    sellingPrice: 21000,
    taxPercent: 0,
    stock: 5,
    shelfStock: 1,
    minStock: 10,
    expiryDate: '2026-04-10',
    supplierName: 'PT Ultrajaya Milk',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-005',
    branchId: 'default-branch-001',
    barcode: '89999990005',
    name: 'Roti Tawar Kupas Sari Roti',
    brand: 'Sari Roti',
    category: 'Roti & Kue',
    description: 'Roti tawar lembut tanpa kulit',
    purchasePrice: 11000,
    sellingPrice: 14500,
    taxPercent: 0,
    stock: 12,
    shelfStock: 5,
    minStock: 8,
    expiryDate: '2026-03-01',
    supplierName: 'PT Nippon Indosari Corp',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-006',
    branchId: 'default-branch-001',
    barcode: '89999990006',
    name: 'Teh Pucuk Harum 500ml',
    brand: 'Teh Pucuk',
    category: 'Minuman',
    description: 'Minuman teh melati manis botol 500ml',
    purchasePrice: 3000,
    sellingPrice: 4500,
    taxPercent: 0,
    stock: 88,
    shelfStock: 18,
    minStock: 25,
    expiryDate: '2027-02-14',
    supplierName: 'PT Mayora Indah',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-007',
    branchId: 'default-branch-001',
    barcode: '89999990007',
    name: 'Sabun Cuci Piring Sunlight Jeruk Nipis 750ml',
    brand: 'Sunlight',
    category: 'Kebutuhan Rumah Tangga',
    description: 'Cairan pencuci piring kemasan isi ulang 750ml',
    purchasePrice: 13500,
    sellingPrice: 17500,
    taxPercent: 0,
    stock: 34,
    shelfStock: 12,
    minStock: 10,
    expiryDate: '2028-05-01',
    supplierName: 'Unilever Indonesia',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-008',
    branchId: 'default-branch-001',
    barcode: '89999990008',
    name: 'Minyak Goreng Bimoli 1L',
    brand: 'Bimoli',
    category: 'Sembako',
    description: 'Minyak goreng kelapa sawit murni pouch 1L',
    purchasePrice: 16000,
    sellingPrice: 19500,
    taxPercent: 0,
    stock: 3,
    shelfStock: 0,
    minStock: 12,
    expiryDate: '2026-03-15',
    supplierName: 'PT Salim Ivomas Pratama',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    name: 'Ahmad Faisal',
    whatsapp: '+6281234567890',
    totalSpent: 125000,
    lastVisit: new Date().toISOString()
  },
  {
    id: 'cust-002',
    name: 'Rina Wijaya',
    whatsapp: '+6281987654321',
    totalSpent: 85000,
    lastVisit: new Date().toISOString()
  }
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-001',
    title: 'Diskon Akhir Pekan Snack 10%',
    type: 'PERCENTAGE',
    value: 10,
    minPurchase: 20000,
    code: 'WEEKEND10',
    isActive: true,
    startDate: '2026-01-01',
    endDate: '2026-12-31'
  },
  {
    id: 'promo-002',
    title: 'Potongan Rp 5.000 Belanja Sembako',
    type: 'FIXED',
    value: 5000,
    minPurchase: 50000,
    code: 'HEMAT5K',
    isActive: true,
    startDate: '2026-01-01',
    endDate: '2026-12-31'
  }
];
