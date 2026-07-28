import React, { useState } from 'react';
import { Store, Shield, User as UserIcon, Lock, KeyRound, CheckCircle2, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { UserRole, User, Branch } from '../../types';
import { MOCK_USERS, INITIAL_BRANCHES } from '../../db/seed';

interface LoginPageProps {
  onLoginSuccess?: (user: User, branch: Branch) => void;
  onLogin?: (role: UserRole, userDetails?: Partial<User>) => void;
  storeName?: string;
  storeLogoUrl?: string;
  users?: User[];
  branches?: Branch[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onLogin,
  storeName = 'Minimarket Toko',
  storeLogoUrl,
  users = MOCK_USERS,
  branches = INITIAL_BRANCHES
}) => {
  const branchList = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;
  const [selectedRole, setSelectedRole] = useState<UserRole>('OWNER');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchList[0]?.id || INITIAL_BRANCHES[0].id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = emailInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanInput) {
      setErrorMessage('Masukkan email / username akun pengguna!');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Masukkan password / PIN shift kasir!');
      return;
    }

    // Load active users from localStorage if available
    let allUsers = users;
    try {
      const savedUsersStr = localStorage.getItem('minimarket_users_v1');
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allUsers = parsed;
        }
      }
    } catch (err) {}

    // Find user by email, name, or username matching
    let targetUser = allUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        u.name.toLowerCase() === cleanInput ||
        u.email.split('@')[0].toLowerCase() === cleanInput
    );

    // Fallback search by role matching
    if (!targetUser) {
      targetUser = allUsers.find(
        (u) =>
          u.role === selectedRole &&
          (u.email.toLowerCase().includes(cleanInput) || u.name.toLowerCase().includes(cleanInput))
      );
    }

    // Default mock fallback for initial standard roles
    if (!targetUser) {
      if (cleanInput === 'owner' || cleanInput === 'owner@retailflow.com') {
        targetUser = allUsers.find((u) => u.role === 'OWNER') || MOCK_USERS[0];
      } else if (cleanInput === 'manager' || cleanInput === 'manager@retailflow.com') {
        targetUser = allUsers.find((u) => u.role === 'MANAGER') || MOCK_USERS[1];
      } else if (cleanInput === 'kasir' || cleanInput === 'cashier' || cleanInput === 'cashier@retailflow.com') {
        targetUser = allUsers.find((u) => u.role === 'CASHIER') || MOCK_USERS[2];
      }
    }

    if (!targetUser) {
      setErrorMessage(`Akun "${emailInput}" tidak terdaftar. Hubungi Owner untuk pendaftaran akun baru.`);
      return;
    }

    // Strict Password / PIN Verification
    const expectedPassword = (targetUser.password || '123').trim();
    if (cleanPass !== expectedPassword) {
      setErrorMessage(`Password / PIN salah untuk akun ${targetUser.name}!`);
      return;
    }

    const branch = branchList.find((b) => b.id === selectedBranchId) || branchList[0];

    if (onLoginSuccess) {
      onLoginSuccess(targetUser, branch);
    } else if (onLogin) {
      onLogin(selectedRole, targetUser);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-300/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-[#eef2f6] rounded-3xl p-6 sm:p-8 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] border border-white/80 relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#eef2f6] shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] mb-2 p-1 border border-white">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName} className="w-full h-full object-contain rounded-xl" />
            ) : (
              <Store className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{storeName}</h1>
          <p className="text-xs font-semibold text-slate-500">Sistem POS Retail & Kasir Minimarket Terpadu</p>
        </div>

        {/* Account Role Selector Cards */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            Pilih Peran Akun Pengguna:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleRoleSelect('OWNER')}
              className={`p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                selectedRole === 'OWNER'
                  ? 'bg-[#eef2f6] text-emerald-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-emerald-400'
                  : 'bg-[#eef2f6] text-slate-600 font-bold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 mb-1 text-emerald-600" />
              <span className="text-[11px]">Owner</span>
              <span className="text-[9px] text-emerald-600 font-black">Akses Penuh</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('MAINTENANCE')}
              className={`p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                selectedRole === 'MAINTENANCE'
                  ? 'bg-[#eef2f6] text-indigo-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-indigo-400'
                  : 'bg-[#eef2f6] text-slate-600 font-bold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 mb-1 text-indigo-600" />
              <span className="text-[11px]">Maintenance</span>
              <span className="text-[9px] text-indigo-600 font-black">Teknis</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('MANAGER')}
              className={`p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                selectedRole === 'MANAGER'
                  ? 'bg-[#eef2f6] text-teal-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-teal-400'
                  : 'bg-[#eef2f6] text-slate-600 font-bold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-4 h-4 mb-1 text-teal-600" />
              <span className="text-[11px]">Manajer</span>
              <span className="text-[9px] text-teal-600 font-black">Kelola Stok</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('CASHIER')}
              className={`p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                selectedRole === 'CASHIER'
                  ? 'bg-[#eef2f6] text-amber-700 font-extrabold shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-amber-400'
                  : 'bg-[#eef2f6] text-slate-600 font-bold shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 mb-1 text-amber-600" />
              <span className="text-[11px]">Kasir</span>
              <span className="text-[9px] text-amber-600 font-black">POS Saja</span>
            </button>
          </div>
        </div>

        {/* Selected Role Permission Scope Explanation */}
        <div className="p-3 bg-slate-200/50 rounded-2xl text-[11px] font-medium text-slate-700 space-y-1 border border-slate-300/60">
          {selectedRole === 'OWNER' && (
            <p className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Owner Membuka Seluruh Akses: Dashboard, POS, Stok, Keuangan, Laporan, AI, & Pengaturan.</span>
            </p>
          )}
          {selectedRole === 'MANAGER' && (
            <p className="flex items-center gap-1.5 text-teal-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Manajer Mengakses Permisi: POS, Stok Inventaris, Pembelian, Laporan & Keuangan.</span>
            </p>
          )}
          {selectedRole === 'CASHIER' && (
            <p className="flex items-center gap-1.5 text-amber-900 font-bold">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Karyawan / Cashier HANYA dapat membuka Tab Kasir POS & Shift. Tab lain dikunci.</span>
            </p>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-extrabold block mb-1">Email Pengguna Account</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                placeholder="nama@gmail.com"
                className="w-full bg-[#eef2f6] text-slate-800 font-bold pl-10 pr-4 py-3 rounded-2xl shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-extrabold block mb-1">Kata Sandi / PIN Shift</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold pl-10 pr-4 py-3 rounded-2xl shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-extrabold block mb-1">Pilih Cabang Minimarket Toko</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-[#eef2f6] text-slate-800 font-bold pl-10 pr-4 py-3 rounded-2xl shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none appearance-none"
              >
                {branchList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-100 text-rose-800 font-bold rounded-2xl text-center">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[4px_4px_12px_rgba(16,185,129,0.35)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] transition-all"
          >
            <span>MASUK KE SISTEM RETAILFLOW POS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 font-semibold">
          RetailFlow Minimarket POS System • Synchronized Cloud & Offline DB
        </p>
      </div>
    </div>
  );
};

