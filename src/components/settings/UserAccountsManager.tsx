import React, { useState } from 'react';
import { Users, UserPlus, Shield, KeyRound, Edit2, Trash2, Check, X, Building2, Lock, Sparkles, UserCheck } from 'lucide-react';
import { User, UserRole, Branch } from '../../types';
import { syncUserToCloud } from '../../services/supabase';

interface UserAccountsManagerProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  branches: Branch[];
  currentUser: User;
}

export const UserAccountsManager: React.FC<UserAccountsManagerProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  branches,
  currentUser
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || 'default-branch-001');

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenAddForm = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('123456');
    setRole('CASHIER');
    setBranchId(branches[0]?.id || 'default-branch-001');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (u: User) => {
    setEditingUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword(u.password || '123456');
    setRole(u.role);
    setBranchId(u.branchId || branches[0]?.id || 'default-branch-001');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Mohon isi nama dan email pengguna.');
      return;
    }

    if (editingUserId) {
      const updatedUser: User = {
        id: editingUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        branchId
      };
      onUpdateUser(updatedUser);
      await syncUserToCloud(updatedUser);
      showToast(`Akun "${name}" berhasil diperbarui!`);
    } else {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        branchId
      };
      onAddUser(newUser);
      await syncUserToCloud(newUser);
      showToast(`Akun baru "${name}" (${role}) berhasil ditambahkan!`);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (u: User) => {
    if (u.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan!');
      return;
    }

    const ownersCount = users.filter((usr) => usr.role === 'OWNER').length;
    if (u.role === 'OWNER' && ownersCount <= 1) {
      alert('Tidak dapat menghapus satu-satunya akun Pemilik (Owner)!');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akun "${u.name}" (${u.email})?`)) {
      onDeleteUser(u.id);
      showToast(`Akun "${u.name}" berhasil dihapus.`);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'OWNER':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
            <Shield className="w-3 h-3 text-emerald-600" />
            Pemilik (Owner)
          </span>
        );
      case 'MANAGER':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1 w-fit">
            <UserCheck className="w-3 h-3 text-teal-600" />
            Manajer Toko
          </span>
        );
      case 'CASHIER':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1 w-fit">
            <Lock className="w-3 h-3 text-slate-500" />
            Kasir (Terlock POS)
          </span>
        );
    }
  };

  return (
    <div className="bg-[#eef2f6] p-5 sm:p-6 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-5">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
              Kelola Akun Pengguna & Hak Akses (Khusus Owner)
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Atur nickname, email, password/PIN login, serta wewenang peran (Pemilik, Manajer, Kasir).
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Akun Baru</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Form Modal / Collapsible section */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-[#eef2f6] p-4 sm:p-5 rounded-2xl shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-300/80 pb-2">
            <h4 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>{editingUserId ? 'Edit Data Akun Pengguna' : 'Form Registrasi Akun Baru'}</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Nama / Nickname Pengguna *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi (Shift Pagi)"
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Email Login *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@retailflow.com"
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Password / PIN Login *</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password atau PIN 6 Digit"
                  required
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 pl-9 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Peran Hak Akses (Role) *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              >
                <option value="OWNER">OWNER - Pemilik Toko (Akses Penuh)</option>
                <option value="MAINTENANCE">MAINTENANCE - Personal Pemeliharaan System (Akses Penuh)</option>
                <option value="MANAGER">MANAGER - Manajer Stok & Laporan</option>
                <option value="CASHIER">CASHIER - Kasir Shift (Terkunci POS)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-700 font-bold block mb-1">Lokasi Cabang Assignment</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.address})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-300/80">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-[#eef2f6] shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingUserId ? 'Simpan Perubahan' : 'Daftarkan Akun'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Users Table / List */}
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-200/80 text-slate-700 font-extrabold border-b border-slate-300">
                <th className="p-3">Nama / Nickname</th>
                <th className="p-3">Email Login</th>
                <th className="p-3">Password / PIN</th>
                <th className="p-3">Role Hak Akses</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-200/40 transition-colors">
                    <td className="p-3 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-md">
                            AKUN ANDA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{u.email}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">
                      {u.password ? '••••••' : '123456'}
                    </td>
                    <td className="p-3">{getRoleBadge(u.role)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditForm(u)}
                          className="p-1.5 rounded-xl bg-[#eef2f6] text-slate-700 hover:text-emerald-700 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all"
                          title="Edit Akun"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          className={`p-1.5 rounded-xl bg-[#eef2f6] transition-all ${
                            isSelf
                              ? 'text-slate-300 cursor-not-allowed shadow-none'
                              : 'text-rose-600 hover:text-rose-800 shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9]'
                          }`}
                          title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Akun'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
