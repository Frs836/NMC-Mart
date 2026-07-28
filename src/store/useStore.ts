import { useState, useEffect } from 'react';
import { User, UserRole, Shift, Product, CartItem, Customer, Promotion, Branch, NavigationTab, HeldCart } from '../types';
import { MOCK_USERS, INITIAL_BRANCHES } from '../db/seed';
import { triggerBackgroundSyncQueue, getActiveShiftServer } from '../services/api';
import { pullCloudDataToLocal, subscribeToCloudRealtime, fetchBranchesFromCloud, syncBranchToCloud, deleteBranchInCloud, fetchUsersFromCloud } from '../services/supabase';
import { isSupabaseConfigured } from '../config/env';

const SESSION_STORAGE_KEY = 'minimarket_session_v1';
const USERS_STORAGE_KEY = 'minimarket_users_v1';
const BRANCHES_STORAGE_KEY = 'minimarket_branches_v1';
const STORE_NAME_STORAGE_KEY = 'minimarket_store_name_v1';
const STORE_LOGO_STORAGE_KEY = 'minimarket_store_logo_v1';

export function useAppStore() {
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem(BRANCHES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_BRANCHES;
  });

  const saveBranchesToStorage = (updated: Branch[]) => {
    setBranches(updated);
    try {
      localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save branches to localStorage:', e);
    }
  };

  const addBranch = async (newBranch: Omit<Branch, 'id'> | Branch) => {
    const created: Branch = 'id' in newBranch ? (newBranch as Branch) : {
      ...newBranch,
      id: `branch-${Date.now()}`
    };
    const updated = [...branches, created];
    saveBranchesToStorage(updated);
    if (isSupabaseConfigured()) {
      await syncBranchToCloud(created);
    }
    return created;
  };

  const updateBranch = async (updatedBranch: Branch) => {
    const updated = branches.map((b) => (b.id === updatedBranch.id ? updatedBranch : b));
    saveBranchesToStorage(updated);
    if (activeBranch && activeBranch.id === updatedBranch.id) {
      setActiveBranchState(updatedBranch);
      setStoreName(updatedBranch.name);
      if (updatedBranch.logoUrl !== undefined) {
        setStoreLogoUrl(updatedBranch.logoUrl || '');
      }
      saveSession(isLoggedIn, currentUser, updatedBranch, activeTabState);
    }
    if (isSupabaseConfigured()) {
      await syncBranchToCloud(updatedBranch);
    }
  };

  const deleteBranch = async (branchId: string) => {
    if (branches.length <= 1) {
      alert('Tidak dapat menghapus satu-satunya cabang toko!');
      return;
    }
    const updated = branches.filter((b) => b.id !== branchId);
    saveBranchesToStorage(updated);
    if (activeBranch && activeBranch.id === branchId) {
      setActiveBranchState(updated[0]);
    }
    if (isSupabaseConfigured()) {
      await deleteBranchInCloud(branchId);
    }
  };
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading users from localStorage:', e);
    }
    return MOCK_USERS;
  });

  const saveUsersToStorage = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn('Failed to save users to localStorage:', e);
    }
  };

  const addUser = (newUser: Omit<User, 'id'>) => {
    const created: User = {
      ...newUser,
      id: `user-${Date.now()}`
    };
    const updated = [...users, created];
    saveUsersToStorage(updated);
    return created;
  };

  const updateUser = (updatedUser: User) => {
    const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    saveUsersToStorage(updated);
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      saveSession(isLoggedIn, updatedUser, activeBranch, activeTabState);
    }
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const ownerCount = users.filter((u) => u.role === 'OWNER').length;
    if (target.role === 'OWNER' && ownerCount <= 1) {
      alert('Tidak dapat menghapus satu-satunya akun Pemilik (Owner)!');
      return;
    }
    const updated = users.filter((u) => u.id !== userId);
    saveUsersToStorage(updated);
  };

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed?.isLoggedIn);
      }
    } catch (e) {
      console.warn('Error reading session from localStorage:', e);
    }
    return false;
  });

  const [activeTabState, setActiveTabState] = useState<NavigationTab>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.activeTab) return parsed.activeTab;
      }
    } catch (e) {
      console.warn(e);
    }
    return 'dashboard';
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.currentUser) return parsed.currentUser;
      }
    } catch (e) {
      console.warn(e);
    }
    return MOCK_USERS[0]; // Default Owner
  });

  const [activeBranch, setActiveBranchState] = useState<Branch>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.activeBranch) return parsed.activeBranch;
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_BRANCHES[0];
  });

  const [storeName, setStoreNameState] = useState<string>(() => {
    try {
      const savedName = localStorage.getItem(STORE_NAME_STORAGE_KEY);
      if (savedName) return savedName;
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.activeBranch?.name) return parsed.activeBranch.name;
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_BRANCHES[0].name;
  });

  const setStoreName = (name: string) => {
    setStoreNameState(name);
    try {
      localStorage.setItem(STORE_NAME_STORAGE_KEY, name);
    } catch (e) {
      console.warn('Failed to save store name to localStorage:', e);
    }
  };

  const [storeLogoUrl, setStoreLogoUrlState] = useState<string>(() => {
    try {
      const savedLogo = localStorage.getItem(STORE_LOGO_STORAGE_KEY);
      if (savedLogo) return savedLogo;
    } catch (e) {
      console.warn(e);
    }
    return '';
  });

  const setStoreLogoUrl = (logoUrl: string) => {
    setStoreLogoUrlState(logoUrl);
    try {
      localStorage.setItem(STORE_LOGO_STORAGE_KEY, logoUrl);
      const favicon = document.getElementById('app-favicon') as HTMLLinkElement;
      if (favicon) {
        if (logoUrl && logoUrl.trim()) {
          favicon.href = logoUrl;
          favicon.type = 'image/png';
        } else {
          favicon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7'/><path d='M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'/><path d='M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4'/><path d='M2 7h20'/></svg>";
          favicon.type = 'image/svg+xml';
        }
      }
    } catch (e) {
      console.warn('Failed to save store logo to localStorage:', e);
    }
  };

  const [isMultiBranchEnabled, setIsMultiBranchEnabled] = useState<boolean>(false);
  const [activeShift, setActiveShiftState] = useState<Shift | null>(() => {
    try {
      const saved = localStorage.getItem('minimarket_active_shift_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && String(parsed.status).toUpperCase() === 'OPEN' && !parsed.endTime) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  });

  const setActiveShift = (shift: Shift | null) => {
    setActiveShiftState(shift);
    try {
      if (shift && String(shift.status).toUpperCase() === 'OPEN' && !shift.endTime) {
        localStorage.setItem('minimarket_active_shift_v1', JSON.stringify(shift));
      } else {
        localStorage.removeItem('minimarket_active_shift_v1');
      }
    } catch (e) {
      console.warn('Error persisting active shift:', e);
    }
  };

  const saveSession = (
    loggedIn: boolean,
    user: User,
    branch: Branch,
    tab: NavigationTab
  ) => {
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          isLoggedIn: loggedIn,
          currentUser: user,
          activeBranch: branch,
          activeTab: tab
        })
      );
    } catch (e) {
      console.warn('Failed to write session to localStorage', e);
    }
  };

  const setActiveTab = (tab: NavigationTab) => {
    setActiveTabState(tab);
    saveSession(isLoggedIn, currentUser, activeBranch, tab);
  };

  const setActiveBranch = (branch: Branch) => {
    setActiveBranchState(branch);
    setStoreName(branch.name);
    setBranches((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      const updated = exists ? prev.map((b) => (b.id === branch.id ? branch : b)) : [...prev, branch];
      try {
        localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    saveSession(isLoggedIn, currentUser, branch, activeTabState);
  };

  const login = (userOrRole: UserRole | User, userDetails?: Partial<User>, branch?: Branch) => {
    let user: User;
    if (typeof userOrRole === 'string') {
      const role = userOrRole;
      user = users.find((u) => u.role === role) || {
        id: `u-${Date.now()}`,
        name: userDetails?.name || (role === 'OWNER' ? 'Pemilik Mart' : role === 'MANAGER' ? 'Manager Toko' : 'Kasir Shift'),
        email: userDetails?.email || `${role.toLowerCase()}@martsegar.com`,
        role,
        branchId: branch?.id || INITIAL_BRANCHES[0].id
      };
    } else {
      user = userOrRole;
    }

    const selectedBranch = branch || activeBranch || INITIAL_BRANCHES[0];
    const initialTab: NavigationTab = user.role === 'CASHIER' ? 'pos' : 'dashboard';

    setCurrentUser(user);
    if (branch) {
      setActiveBranchState(branch);
    }
    setIsLoggedIn(true);
    setActiveTabState(initialTab);

    saveSession(true, user, selectedBranch, initialTab);
  };

  const logout = () => {
    setIsLoggedIn(false);
    clearCart();
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear session from localStorage', e);
    }
  };


  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState<boolean>(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);

  const syncBranchProfileFromCloud = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const cloudBranches = await fetchBranchesFromCloud();
      if (cloudBranches && cloudBranches.length > 0) {
        setBranches(cloudBranches);
        localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(cloudBranches));

        const activeId = activeBranch?.id || 'default-branch-001';
        const targetBranch = cloudBranches.find((b) => b.id === activeId) || cloudBranches[0];

        if (targetBranch) {
          setActiveBranchState(targetBranch);
          if (targetBranch.name) {
            setStoreNameState(targetBranch.name);
            localStorage.setItem(STORE_NAME_STORAGE_KEY, targetBranch.name);
          }
          if (targetBranch.logoUrl !== undefined) {
            setStoreLogoUrlState(targetBranch.logoUrl || '');
            localStorage.setItem(STORE_LOGO_STORAGE_KEY, targetBranch.logoUrl || '');
          }
          saveSession(isLoggedIn, currentUser, targetBranch, activeTabState);
        }
      } else {
        // If cloud table branches is empty, seed activeBranch into Supabase
        if (activeBranch) {
          await syncBranchToCloud(activeBranch);
        }
      }

      // Also pull cloud users
      const cloudUsers = await fetchUsersFromCloud();
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cloudUsers));
      }
    } catch (err) {
      console.warn('Error syncing branch profile from cloud:', err);
    }
  };

  useEffect(() => {
    initializeStore();

    if (isSupabaseConfigured()) {
      // Background poll branch profile & cloud shifts every 5 seconds to ensure instant multi-device alignment
      const pollInterval = setInterval(async () => {
        try {
          await syncBranchProfileFromCloud();
          await pullCloudDataToLocal();
          await checkActiveShift();
        } catch (e) {}
      }, 5000);

      const unsubscribe = subscribeToCloudRealtime(async () => {
        try {
          await syncBranchProfileFromCloud();
          await pullCloudDataToLocal();
          await checkActiveShift();
        } catch (e) {}
      });

      return () => {
        clearInterval(pollInterval);
        unsubscribe();
      };
    }
  }, []);

  const initializeStore = async () => {
    if (isSupabaseConfigured()) {
      try {
        await syncBranchProfileFromCloud();
        await pullCloudDataToLocal();
      } catch (err) {
        console.warn('Cloud sync on init error:', err);
      }
    }
    setUnsyncedCount(0);
    await checkActiveShift();
  };

  // Monitor Network & Sync Queue Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setUnsyncedCount(0);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkUnsyncedQueue = async () => {
    setUnsyncedCount(0);
  };

  const checkActiveShift = async () => {
    try {
      const openShift = await getActiveShiftServer(activeBranch?.id || 'default-branch-001');
      if (openShift) {
        setActiveShift(openShift);
      } else {
        const saved = localStorage.getItem('minimarket_active_shift_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && String(parsed.status).toUpperCase() === 'OPEN' && !parsed.endTime) {
            setActiveShift(parsed);
            return;
          }
        }
        setActiveShift(null);
      }
    } catch (err) {
      console.warn('Shift check warning:', err);
    }
  };

  // Role Switcher Handler
  const switchRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role) || { ...currentUser, role };
    const nextTab: NavigationTab = role === 'CASHIER' ? 'pos' : 'dashboard';
    setCurrentUser(found);
    setActiveTabState(nextTab);
    saveSession(isLoggedIn, found, activeBranch, nextTab);
  };

  // Cart Management Functions
  const addToCart = (product: Product, quantity = 1) => {
    const availableStock = product.shelfStock ?? product.stock;
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + quantity;
        if (newQty > availableStock) {
          alert(`Jumlah melebihi stok etalase/rak yang tersedia (${availableStock} unit)`);
          return prev;
        }
        const updated = [...prev];
        const subtotal = newQty * product.sellingPrice - existing.discountAmount;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: Math.max(0, subtotal)
        };
        return updated;
      } else {
        if (quantity > availableStock) {
          alert(`Jumlah melebihi stok etalase/rak yang tersedia (${availableStock} unit)`);
          return prev;
        }
        const subtotal = quantity * product.sellingPrice;
        return [...prev, { product, quantity, discountAmount: 0, subtotal }];
      }
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const availableStock = item.product.shelfStock ?? item.product.stock;
            if (newQty > availableStock) {
              alert(`Mencapai batas stok etalase yang tersedia (${availableStock} unit)`);
              return item;
            }
            const subtotal = newQty * item.product.sellingPrice - item.discountAmount;
            return {
              ...item,
              quantity: newQty,
              subtotal: Math.max(0, subtotal)
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setCartItemDiscount = (productId: string, discountAmount: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const subtotal = item.quantity * item.product.sellingPrice - discountAmount;
          return {
            ...item,
            discountAmount,
            subtotal: Math.max(0, subtotal)
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setAppliedPromotion(null);
  };

  // Held Carts Logic
  const holdCurrentCart = (note: string) => {
    if (cartItems.length === 0) return;
    const newHeld: HeldCart = {
      id: `hold-${Date.now()}`,
      note: note || `Pesanan #${heldCarts.length + 1}`,
      customerName: selectedCustomer?.name,
      items: [...cartItems],
      createdAt: new Date().toISOString()
    };
    setHeldCarts((prev) => [newHeld, ...prev]);
    clearCart();
  };

  const restoreHeldCart = (id: string) => {
    const found = heldCarts.find((h) => h.id === id);
    if (!found) return;
    setCartItems(found.items);
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
  };

  const deleteHeldCart = (id: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
  };

  // Cart Calculations
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.product.sellingPrice, 0);
  const cartItemDiscounts = cartItems.reduce((acc, item) => acc + item.discountAmount, 0);

  let promoDiscount = 0;
  if (appliedPromotion) {
    if (appliedPromotion.type === 'PERCENTAGE') {
      promoDiscount = (cartSubtotal * appliedPromotion.value) / 100;
    } else if (appliedPromotion.type === 'FIXED') {
      promoDiscount = appliedPromotion.value;
    }
  }

  const cartGrandTotal = Math.max(0, cartSubtotal - cartItemDiscounts - promoDiscount);

  return {
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    users,
    addUser,
    updateUser,
    deleteUser,
    isLoggedIn,
    login,
    logout,
    storeName,
    setStoreName,
    storeLogoUrl,
    setStoreLogoUrl,
    initializeStore,
    activeTab: activeTabState,
    setActiveTab,
    currentUser,
    setCurrentUser,
    switchRole,
    activeBranch,
    setActiveBranch,
    isMultiBranchEnabled,
    setIsMultiBranchEnabled,
    activeShift,
    setActiveShift,
    cartItems,
    heldCarts,
    holdCurrentCart,
    restoreHeldCart,
    deleteHeldCart,
    addToCart,
    updateCartQuantity,
    setCartItemDiscount,
    removeFromCart,
    clearCart,
    selectedCustomer,
    setSelectedCustomer,
    appliedPromotion,
    setAppliedPromotion,
    isOnline,
    unsyncedCount,
    checkUnsyncedQueue,
    cartSubtotal,
    cartItemDiscounts,
    promoDiscount,
    cartGrandTotal,
    isOpenShiftModalOpen,
    setIsOpenShiftModalOpen,
    isCloseShiftModalOpen,
    setIsCloseShiftModalOpen,
    isAIDrawerOpen,
    setIsAIDrawerOpen
  };
}

export const useStore = useAppStore;
