import React, { useState } from 'react';
import { Sparkles, Wifi, WifiOff, RefreshCw, UserCheck, Store, LogIn, LogOut, Power, Lock, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentUser: { name: string; role: UserRole };
  switchRole: (role: UserRole) => void;
  activeBranchName: string;
  isMultiBranchEnabled: boolean;
  activeShift: any;
  setIsOpenShiftModalOpen: (val: boolean) => void;
  setIsCloseShiftModalOpen: (val: boolean) => void;
  isOnline: boolean;
  unsyncedCount: number;
  triggerSync: () => void;
  setIsAIAssistantOpen: (val: boolean) => void;
  storeName?: string;
  storeLogoUrl?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  switchRole,
  activeBranchName,
  isMultiBranchEnabled,
  activeShift,
  setIsOpenShiftModalOpen,
  setIsCloseShiftModalOpen,
  isOnline,
  unsyncedCount,
  triggerSync,
  setIsAIAssistantOpen,
  storeName = 'Minimarket Barokah',
  storeLogoUrl,
  onLogout
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="bg-[#eef2f6] text-slate-800 border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_4px_12px_rgba(203,210,217,0.5)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        {/* Left Brand Identity & Branch */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Logo Container Placeholder */}
          <div className="w-10 h-10 rounded-2xl bg-[#eef2f6] shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] flex items-center justify-center p-1 overflow-hidden shrink-0 border border-white">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName} className="w-full h-full object-contain rounded-xl" />
            ) : (
              <Store className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-slate-800 truncate max-w-[140px] sm:max-w-xs">
                {storeName}
              </h1>
              {isMultiBranchEnabled && (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full shadow-[inset_1px_1px_2px_#cbd2d9] shrink-0">
                  Multi-Cabang
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-bold truncate max-w-[120px] sm:max-w-xs">{activeBranchName}</p>
          </div>
        </div>

        {/* Center / Right Action Group */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Network Sync Status Badge */}
          <button
            onClick={triggerSync}
            title={isOnline ? 'Sistem Terhubung (Klik untuk sinkronkan)' : 'Mode Offline Aktif'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] ${
              isOnline ? 'text-emerald-700 bg-[#eef2f6]' : 'text-amber-700 bg-[#eef2f6]'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
            {unsyncedCount > 0 && (
              <span className="bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold text-[10px] animate-pulse">
                {unsyncedCount}
              </span>
            )}
            <RefreshCw className="w-3 h-3 text-slate-400 hover:rotate-180 transition-transform shrink-0" />
          </button>

          {/* AI Assistant Trigger - Disabled for Cashiers */}
          {currentUser.role !== 'CASHIER' && (
            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="flex items-center gap-1 bg-[#eef2f6] text-emerald-700 hover:text-emerald-600 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden lg:inline">Asisten AI</span>
            </button>
          )}

          {/* Shift Action Button */}
          {activeShift ? (
            <button
              onClick={() => setIsCloseShiftModalOpen(true)}
              className="flex items-center gap-1 bg-[#eef2f6] text-rose-600 hover:text-rose-700 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all"
              title="Tutup Shift Kasir"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="hidden sm:inline">Tutup Shift</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-[4px_4px_10px_rgba(16,185,129,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Buka Shift</span>
            </button>
          )}

          {/* User Profile Badge & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 bg-[#eef2f6] px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs cursor-pointer shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold text-slate-800 max-w-[50px] sm:max-w-none truncate">{currentUser.name.split(' ')[0]}</span>
              <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-extrabold uppercase shrink-0 hidden sm:inline">
                {currentUser.role === 'OWNER' ? 'Pemilik' : currentUser.role === 'MANAGER' ? 'Manajer' : currentUser.role === 'MAINTENANCE' ? 'Maintenance' : 'Kasir'}
              </span>
            </button>

            {/* User Account Dropdown */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-[#eef2f6] rounded-2xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] py-2 text-xs z-50 border border-white/60 space-y-1"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-1 border-b border-slate-200">
                  <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block">
                    Pengguna Aktif
                  </span>
                  <p className="font-extrabold text-slate-800 text-xs truncate">{currentUser.name}</p>
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase">
                    Role: {currentUser.role === 'OWNER' ? 'Pemilik (Owner)' : currentUser.role === 'MANAGER' ? 'Manajer Toko' : currentUser.role === 'MAINTENANCE' ? 'Maintenance' : 'Kasir Shift'}
                  </span>
                </div>

                {/* Role Switcher - ONLY accessible by OWNER */}
                {currentUser.role === 'OWNER' ? (
                  <>
                    <div className="px-3 pt-2 text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                      Pratinjau Peran (Owner Only)
                    </div>
                    <button
                      onClick={() => switchRole('OWNER')}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-200/50 flex items-center justify-between ${
                        currentUser.role === 'OWNER' ? 'text-emerald-600 font-extrabold' : 'text-slate-700 font-semibold'
                      }`}
                    >
                      <span>Pemilik (Owner)</span>
                      <span className="text-[9px] text-slate-400">Akses Penuh</span>
                    </button>
                    <button
                      onClick={() => switchRole('MANAGER')}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-200/50 flex items-center justify-between ${
                        currentUser.role === 'MANAGER' ? 'text-emerald-600 font-extrabold' : 'text-slate-700 font-semibold'
                      }`}
                    >
                      <span>Manajer</span>
                      <span className="text-[9px] text-slate-400 font-medium">Stok & Laporan</span>
                    </button>
                    <button
                      onClick={() => switchRole('CASHIER')}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-200/50 flex items-center justify-between ${
                        currentUser.role === 'CASHIER' ? 'text-emerald-600 font-extrabold' : 'text-slate-700 font-semibold'
                      }`}
                    >
                      <span>Kasir / Shift</span>
                      <span className="text-[9px] text-slate-400 font-medium">POS Saja</span>
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-xl mx-2 font-bold flex items-center gap-1 border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Peran dikunci. Hubungi Owner untuk mengubah wewenang.</span>
                  </div>
                )}

                {onLogout && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-100/60 font-extrabold flex items-center gap-2"
                    >
                      <Power className="w-3.5 h-3.5 text-rose-600" />
                      <span>Keluar Akun (Logout)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Standalone Visible Logout Button in Header */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar Akun (Logout)"
              className="flex items-center gap-1.5 bg-[#eef2f6] text-rose-600 hover:text-rose-700 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-black shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all shrink-0"
            >
              <Power className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

