import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Wallet,
  BarChart3,
  ShieldAlert,
  Users,
  Tag,
  Settings,
  Grid,
  X,
  Power,
  UserCheck
} from 'lucide-react';
import { NavigationTab, UserRole } from '../../types';

interface NavigationProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  userRole: UserRole;
  currentUser?: { name: string; role: UserRole };
  switchRole?: (role: UserRole) => void;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  currentUser,
  switchRole,
  onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const allNavItems: { id: NavigationTab; label: string; icon: any; roles: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] },
    { id: 'pos', label: 'Kasir POS', icon: ShoppingBag, roles: ['OWNER', 'MANAGER', 'CASHIER', 'MAINTENANCE'] },
    { id: 'inventory', label: 'Inventaris', icon: Package, roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] },
    { id: 'finance', label: 'Keuangan', icon: Wallet, roles: ['OWNER', 'MANAGER', 'CASHIER', 'MAINTENANCE'] },
    { id: 'reports', label: 'Laporan', icon: BarChart3, roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] },
    { id: 'audit', label: 'Log Audit', icon: ShieldAlert, roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] },
    { id: 'settings', label: 'Pengaturan', icon: Settings, roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] }
  ];

  const filteredItems = allNavItems.filter((item) => item.roles.includes(userRole));

  // Determine top 4 tabs for mobile bottom bar
  const primaryMobileTabs = filteredItems.filter((item) =>
    ['dashboard', 'pos', 'inventory', 'reports'].includes(item.id)
  );

  return (
    <>
      {/* Desktop / Tablet Navigation Bar */}
      <nav className="hidden md:block bg-[#eef2f6] border-b border-slate-200/60 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                    : 'bg-[#eef2f6] text-slate-600 hover:text-slate-900 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Horizontal Scrollable Pill Bar */}
      <nav className="md:hidden bg-[#eef2f6] border-b border-slate-200/80 px-2 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-[#eef2f6] text-emerald-700 border border-emerald-500/30 shadow-[inset_2px_2px_4px_#cbd2d9,inset_-2px_-2px_4px_#ffffff]'
                  : 'bg-[#eef2f6] text-slate-600 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#eef2f6] border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_12px_rgba(203,210,217,0.6)]">
        {primaryMobileTabs.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
                isActive
                  ? 'text-emerald-700 bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9,inset_-2px_-2px_4px_#ffffff]'
                  : 'text-slate-600 bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-bold tracking-tight truncate max-w-[60px]">{item.label}</span>
            </button>
          );
        })}

        {/* 5th Button: Menu Lainnya */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
            isMobileMenuOpen
              ? 'text-emerald-700 bg-[#eef2f6] shadow-[inset_2px_2px_4px_#cbd2d9,inset_-2px_-2px_4px_#ffffff]'
              : 'text-slate-600 bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
          }`}
        >
          <Grid className="w-5 h-5 mb-0.5 text-emerald-600" />
          <span className="text-[10px] font-bold tracking-tight">Lainnya</span>
        </button>
      </nav>

      {/* Mobile Drawer Overlay for Menu & Settings */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end transition-opacity">
          <div className="bg-[#eef2f6] rounded-t-3xl p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] border-t border-white/80 max-h-[85vh] overflow-y-auto space-y-4">
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-800">Semua Menu & Fitur</h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    Peran: {userRole === 'OWNER' ? 'Pemilik Toko' : userRole === 'MANAGER' ? 'Manajer' : 'Kasir'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of All Available Navigation Tabs */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Navigasi Utama</span>
              <div className="grid grid-cols-2 gap-2.5">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-bold text-left transition-all ${
                        isActive
                          ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-emerald-500/30'
                          : 'bg-[#eef2f6] text-slate-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Role Switcher on Mobile - OWNER ONLY */}
            {switchRole && userRole === 'OWNER' && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Pratinjau Peran (Khusus Owner)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      switchRole('OWNER');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center transition-all ${
                      userRole === 'OWNER'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[#eef2f6] text-slate-700 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
                    }`}
                  >
                    Pemilik
                  </button>
                  <button
                    onClick={() => {
                      switchRole('MANAGER');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center transition-all ${
                      userRole === 'MANAGER'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[#eef2f6] text-slate-700 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
                    }`}
                  >
                    Manajer
                  </button>
                  <button
                    onClick={() => {
                      switchRole('CASHIER');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold text-center transition-all ${
                      userRole === 'CASHIER'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[#eef2f6] text-slate-700 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]'
                    }`}
                  >
                    Kasir
                  </button>
                </div>
              </div>
            )}

            {/* Explicit Logout Button in Mobile Drawer */}
            {onLogout && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(225,29,72,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-all"
                >
                  <Power className="w-4 h-4" />
                  <span>Keluar Akun (Logout)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
