import React, { useState, useEffect } from 'react';
import { Settings, Store, Database, Building2, Check, Globe, Upload, Image as ImageIcon, Plus, Trash2, Edit2, ShieldAlert, Activity, CheckCircle2, XCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { Branch, User } from '../../types';
import { logAudit, purgeAllStoreData } from '../../services/api';
import { ENV_CONFIG, isSupabaseConfigured } from '../../config/env';
import { testSupabaseConnection, ConnectionTestResult, syncBranchToCloud, syncAllLocalDataToCloud, uploadStoreLogoToSupabaseStorage, pullCloudDataToLocal, fetchBranchesFromCloud, fetchProductsFromDatabase, fetchTransactionsFromCloud } from '../../services/supabase';
import { UserAccountsManager } from './UserAccountsManager';

interface SettingsManagerProps {
  activeBranch: Branch;
  setActiveBranch: (branch: Branch) => void;
  isMultiBranchEnabled: boolean;
  setIsMultiBranchEnabled: (val: boolean) => void;
  currentUser: User;
  storeName?: string;
  setStoreName?: (name: string) => void;
  storeLogoUrl?: string;
  setStoreLogoUrl?: (url: string) => void;
  users?: User[];
  onAddUser?: (user: Omit<User, 'id'>) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
  branches?: Branch[];
  onAddBranch?: (branch: Omit<Branch, 'id'>) => void;
  onUpdateBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branchId: string) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  activeBranch,
  setActiveBranch,
  isMultiBranchEnabled,
  setIsMultiBranchEnabled,
  currentUser,
  storeName = '',
  setStoreName,
  storeLogoUrl = '',
  setStoreLogoUrl,
  users = [],
  onAddUser = (_user) => {},
  onUpdateUser = (_user) => {},
  onDeleteUser = (_userId: string) => {},
  branches = [activeBranch],
  onAddBranch = (_branch) => {},
  onUpdateBranch = (_branch) => {},
  onDeleteBranch = (_branchId: string) => {}
}) => {
  const [storeNameInput, setStoreNameInput] = useState(storeName || activeBranch.name);
  const [storeAddress, setStoreAddress] = useState(activeBranch.address);
  const [storePhone, setStorePhone] = useState(activeBranch.phone);
  const [logoInput, setLogoInput] = useState(storeLogoUrl);
  const [receiptFooter, setReceiptFooter] = useState(activeBranch.receiptFooter || 'Terima kasih telah berbelanja di minimarket kami!');

  useEffect(() => {
    let isMounted = true;
    if (isSupabaseConfigured()) {
      fetchBranchesFromCloud().then((cloudBranches) => {
        if (!isMounted) return;
        if (cloudBranches && cloudBranches.length > 0) {
          const target = cloudBranches.find((b) => b.id === activeBranch.id) || cloudBranches[0];
          if (target) {
            setStoreNameInput(target.name);
            setStoreAddress(target.address || '');
            setStorePhone(target.phone || '');
            setReceiptFooter(target.receiptFooter || 'Terima kasih telah berbelanja di minimarket kami!');
            if (target.logoUrl) {
              setLogoInput(target.logoUrl);
            }
          }
        } else {
          setStoreNameInput(activeBranch.name || storeName);
          setStoreAddress(activeBranch.address || '');
          setStorePhone(activeBranch.phone || '');
          setReceiptFooter(activeBranch.receiptFooter || 'Terima kasih telah berbelanja di minimarket kami!');
        }
      }).catch(() => {
        if (!isMounted) return;
        setStoreNameInput(activeBranch.name || storeName);
        setStoreAddress(activeBranch.address || '');
        setStorePhone(activeBranch.phone || '');
        setReceiptFooter(activeBranch.receiptFooter || 'Terima kasih telah berbelanja di minimarket kami!');
      });
    } else {
      setStoreNameInput(activeBranch.name || storeName);
      setStoreAddress(activeBranch.address || '');
      setStorePhone(activeBranch.phone || '');
      setReceiptFooter(activeBranch.receiptFooter || 'Terima kasih telah berbelanja di minimarket kami!');
    }
    return () => {
      isMounted = false;
    };
  }, [activeBranch.id]);

  useEffect(() => {
    if (storeLogoUrl) {
      setLogoInput(storeLogoUrl);
    }
  }, [storeLogoUrl]);

  const [supabaseUrlInput] = useState(ENV_CONFIG.supabaseUrl);
  const [supabaseKeyInput] = useState(ENV_CONFIG.supabaseAnonKey);

  // Supabase Live Connection Diagnostic
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<ConnectionTestResult | null>(null);

  const handleRunConnectionTest = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setConnTestResult(res);
    } catch (err: any) {
      setConnTestResult({
        success: false,
        message: `Error pengujian: ${err.message || err}`
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllMsg, setSyncAllMsg] = useState<string | null>(null);

  // Factory Reset Data
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleExecuteFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setIsResetting(true);

    try {
      const result = await purgeAllStoreData(ownerPasswordInput, currentUser);
      if (result.success) {
        localStorage.removeItem('minimarket_local_transactions_v1');
        localStorage.removeItem('minimarket_local_cash_movements_v1');
        localStorage.removeItem('minimarket_active_shift_v1');
        alert(result.message);
        setIsResetModalOpen(false);
        window.location.reload();
      } else {
        setResetError(result.message);
      }
    } catch (err: any) {
      setResetError(`Gagal mereset data: ${err.message || err}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncAllData = async () => {
    setIsSyncingAll(true);
    setSyncAllMsg(null);
    try {
      const res = await syncAllLocalDataToCloud();
      if (res.success) {
        setSyncAllMsg(`✓ Berhasil memposting ${res.syncedCount} item data (produk, cabang, shift, transaksi) ke Supabase Cloud!`);
      } else {
        setSyncAllMsg('⚠ Gagal melakukan sinkronisasi data ke Supabase Cloud. Cek koneksi.');
      }
    } catch (err: any) {
      setSyncAllMsg(`Error sinkronisasi: ${err.message || err}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // New Branch Form
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [isResettingLocal, setIsResettingLocal] = useState(false);

  const handleResetLocalAndPullCloud = async () => {
    if (!confirm('Apakah Anda yakin ingin me-reset penyimpanan database lokal dan mengambil ulang seluruh profil Mart & data langsung dari Supabase Cloud?')) {
      return;
    }
    setIsResettingLocal(true);
    try {
      localStorage.removeItem('minimarket_branches_v1');
      localStorage.removeItem('minimarket_store_name_v1');
      localStorage.removeItem('minimarket_store_logo_v1');
      localStorage.removeItem('minimarket_local_transactions_v1');
      localStorage.removeItem('minimarket_local_cash_movements_v1');
      localStorage.removeItem('minimarket_active_shift_v1');

      const res = await pullCloudDataToLocal();
      
      alert(`Berhasil me-reset database lokal dan menarik ${res.pulledCount} entri data & Profil Mart dari Supabase Cloud! Halaman akan dimuat ulang.`);
      window.location.reload();
    } catch (err: any) {
      alert(`Error reset database lokal: ${err.message || err}`);
    } finally {
      setIsResettingLocal(false);
    }
  };

  // Handle image file upload to Supabase Storage Bucket
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file logo terlalu besar. Maksimal 5MB disarankan.');
        return;
      }
      setIsUploadingLogo(true);
      try {
        const res = await uploadStoreLogoToSupabaseStorage(file);
        if (res.success && res.url) {
          setLogoInput(res.url);
          if (setStoreLogoUrl) {
            setStoreLogoUrl(res.url);
          }
          localStorage.setItem('minimarket_store_logo_v1', res.url);
        } else {
          alert(`Gagal mengunggah logo: ${res.message || 'Terjadi kesalahan'}`);
        }
      } catch (err: any) {
        alert(`Error upload logo: ${err.message || err}`);
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = storeNameInput.trim() || 'Minimarket Toko';
    const cleanAddress = storeAddress.trim() || 'Alamat Toko';
    const cleanPhone = storePhone.trim() || '-';
    const cleanFooter = receiptFooter.trim() || 'Terima kasih telah berbelanja di minimarket kami!';

    const updated = {
      ...activeBranch,
      name: cleanName,
      address: cleanAddress,
      phone: cleanPhone,
      receiptFooter: cleanFooter,
      logoUrl: logoInput
    };

    if (onUpdateBranch) {
      onUpdateBranch(updated);
    }
    setActiveBranch(updated);

    if (setStoreName) {
      setStoreName(cleanName);
    }
    if (setStoreLogoUrl) {
      setStoreLogoUrl(logoInput);
    }

    // Direct local storage persistence fallback
    try {
      localStorage.setItem('minimarket_store_name_v1', cleanName);
      localStorage.setItem('minimarket_store_logo_v1', logoInput);
      const savedBranchesStr = localStorage.getItem('minimarket_branches_v1');
      if (savedBranchesStr) {
        const currentBranches: any[] = JSON.parse(savedBranchesStr);
        const newBranches = currentBranches.map((b) => (b.id === updated.id ? updated : b));
        localStorage.setItem('minimarket_branches_v1', JSON.stringify(newBranches));
      }
    } catch (err) {
      console.warn('Error saving store info to localStorage:', err);
    }

    // Sync branch to Supabase cloud
    await syncBranchToCloud(updated);

    await logAudit(
      'UPDATE_SETTINGS',
      'SETTINGS',
      `Memperbarui profil toko: ${cleanName}, Alamat: ${cleanAddress}`,
      currentUser.name,
      currentUser.id
    );
    alert('Pengaturan profil & logo minimarket berhasil disimpan!');
  };

  const handleToggleMultiBranch = async () => {
    const nextVal = !isMultiBranchEnabled;
    setIsMultiBranchEnabled(nextVal);
    await logAudit(
      'TOGGLE_MULTI_BRANCH',
      'SETTINGS',
      `Mode ekspansi multi-cabang diubah menjadi ${nextVal ? 'AKTIF' : 'NONAKTIF'}`,
      currentUser.name,
      currentUser.id
    );
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;
    const newBranch = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      address: newBranchAddress || 'Alamat Belum Diisi',
      phone: newBranchPhone || '-',
      isActive: true
    };
    onAddBranch(newBranch);
    await syncBranchToCloud(newBranch);
    setNewBranchName('');
    setNewBranchAddress('');
    setNewBranchPhone('');
    setIsAddBranchOpen(false);
    alert('Cabang minimarket baru berhasil ditambahkan!');
  };

  const handleBackupDatabase = async () => {
    const prods = await fetchProductsFromDatabase(activeBranch.id);
    const txs = await fetchTransactionsFromCloud(activeBranch.id);
    const backupObj = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      products: prods,
      transactions: txs
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retailflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800">
      <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60">
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <span>Pengaturan Sistem & Profil Minimarket</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Kelola identitas minimarket, unggah logo toko, format cetak struk kasir, serta ekspansi multi-cabang.
        </p>
      </div>

      {/* Exclusive User Accounts Management for OWNER */}
      {currentUser.role === 'OWNER' && (
        <UserAccountsManager
          users={users}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          branches={branches}
          currentUser={currentUser}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Information & Logo Upload Form */}
        <form onSubmit={handleSaveStoreInfo} className="bg-[#eef2f6] p-5 sm:p-6 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Profil Utama Toko & Logo Branding</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-600 block mb-1 font-bold">Nama Minimarket Toko (Navbar & Struk)</label>
              <input
                type="text"
                value={storeNameInput}
                onChange={(e) => setStoreNameInput(e.target.value)}
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>

            {/* Logo File Upload & Specification Card */}
            <div>
              <label className="text-slate-600 block mb-1 font-bold">Unggah Foto / Logo Toko (Input File - Supabase Bucket)</label>
              <div className="flex items-center gap-3 bg-[#eef2f6] p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9]">
                <div className="w-12 h-12 rounded-2xl bg-[#eef2f6] shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff] flex items-center justify-center p-1 border border-white shrink-0 overflow-hidden">
                  {isUploadingLogo ? (
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                  ) : logoInput ? (
                    <img src={logoInput} alt="Preview Logo" className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Store className="w-6 h-6 text-emerald-600" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingLogo}
                    onChange={handleLogoFileUpload}
                    className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer disabled:opacity-50"
                  />
                  {isUploadingLogo && (
                    <p className="text-[10px] text-emerald-700 font-extrabold animate-pulse">Mengunggah file logo ke Supabase Storage Bucket...</p>
                  )}
                  {!isUploadingLogo && logoInput && (
                    <button
                      type="button"
                      onClick={() => setLogoInput('')}
                      className="text-[10px] text-rose-600 font-bold hover:underline block"
                    >
                      Hapus Logo (Kembali ke Icon Default)
                    </button>
                  )}
                </div>
              </div>

              {/* Ideal Pixel Specification Info Box */}
              <div className="mt-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 text-[11px] text-slate-700 space-y-1">
                <div className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Spesifikasi Ukuran Ideal Logo Navbar:</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1 font-medium">
                  <li><strong className="text-slate-800">Dimensi Ideal:</strong> 160 x 160 px (Rasio 1:1) atau 200 x 60 px (Rasio Horizontal)</li>
                  <li><strong className="text-slate-800">Format Gambar:</strong> PNG Latar Belakang Transparan (Transparent PNG) atau SVG</li>
                  <li><strong className="text-slate-800">Batas Ukuran:</strong> Maksimal 500 KB - 2 MB</li>
                  <li><strong className="text-slate-800">Supabase Storage Bucket:</strong> <code className="font-mono text-emerald-700">store-assets/logos/store-logo.png</code></li>
                </ul>
              </div>
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-bold">Alamat Lengkap Toko</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-bold">Nomor WhatsApp Toko</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-bold">Pesan Kaki Struk (Receipt Footer)</label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-20"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] transition-all"
          >
            <Check className="w-4 h-4" />
            <span>SIMPAN PROFIL TOKO</span>
          </button>
        </form>

        {/* Database Sync Configuration & Multi-Branch Settings */}
        <div className="space-y-6">
          {/* Multi-Branch Architecture Settings & List */}
          <div className="bg-[#eef2f6] p-5 sm:p-6 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan Cabang & Multi-Store</span>
              </h3>

              <button
                type="button"
                onClick={handleToggleMultiBranch}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                  isMultiBranchEnabled
                    ? 'bg-emerald-600 text-white shadow-[2px_2px_4px_#cbd2d9]'
                    : 'bg-[#eef2f6] text-slate-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                }`}
              >
                {isMultiBranchEnabled ? 'MULTI-CABANG: AKTIF' : 'AKTIFKAN MULTI-CABANG'}
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Sistem kasir RetailFlow mendukung pengelolaan beberapa cabang toko dengan isolasi <code className="font-mono text-emerald-700">branch_id</code> pada setiap transaksi dan laporan.
            </p>

            {isMultiBranchEnabled && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Daftar Cabang Toko ({branches.length}):</span>
                  <button
                    type="button"
                    onClick={() => setIsAddBranchOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Cabang</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {branches.map((b) => {
                    const isCurrentActive = activeBranch.id === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-2xl flex items-center justify-between gap-2 border transition-all ${
                          isCurrentActive
                            ? 'bg-emerald-50/80 border-emerald-300 shadow-[2px_2px_4px_#cbd2d9]'
                            : 'bg-[#eef2f6] border-white/60 shadow-[inset_1px_1px_3px_#cbd2d9]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-800 truncate">{b.name}</span>
                            {isCurrentActive && (
                              <span className="text-[9px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shrink-0">
                                CABANG AKTIF
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate">{b.address}</p>
                        </div>

                        {!isCurrentActive && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBranch(b);
                                alert(`Toko aktif berhasil diubah ke: ${b.name}`);
                              }}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2.5 py-1 rounded-xl text-[10px] shadow-sm"
                            >
                              Ganti Ke Sini
                            </button>
                            {branches.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onDeleteBranch(b.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Hapus Cabang"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Supabase Database Panel */}
          <div className="bg-[#eef2f6] p-5 sm:p-6 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Sinkronisasi Database Cloud (Supabase / Postgres)</span>
            </h3>

            <div className="p-3.5 bg-slate-200/60 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-700">Status Koneksi Supabase:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                    isSupabaseConfigured()
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isSupabaseConfigured() ? 'TERHUBUNG CLOUD' : 'MODE OFFLINE DEXIE.JS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Koneksi cloud diamankan secara terenkripsi melalui environment variable sistem. URL dan Kunci Anon disembunyikan demi keamanan data toko.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Test Connection & Sync Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleRunConnectionTest}
                  disabled={isTestingConn}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] transition-all"
                >
                  {isTestingConn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>UJI KONEKSI...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      <span>UJI KONEKSI SUPABASE</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncAllData}
                  disabled={isSyncingAll}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(37,99,235,0.3)] transition-all"
                >
                  {isSyncingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>MENYINKRONKAN...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>SINKRONKAN SEMUA DATA CLOUD</span>
                    </>
                  )}
                </button>
              </div>

              {syncAllMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-bold">
                  {syncAllMsg}
                </div>
              )}

              {/* Connection Test Result Diagnostic Box */}
              {connTestResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                    connTestResult.success
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50/90 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm">
                      {connTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <span>{connTestResult.success ? 'KONEKSI LENGKAP & AKTIF' : 'KONEKSI TERHAMBAT'}</span>
                    </div>

                    {connTestResult.latencyMs !== undefined && (
                      <span className="text-[10px] bg-slate-200/70 text-slate-700 font-extrabold px-2 py-0.5 rounded-lg shrink-0">
                        Ping: {connTestResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-xs leading-relaxed">{connTestResult.message}</p>

                  {/* Status Table per Table */}
                  {connTestResult.tablesStatus && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80">
                      <span className="font-extrabold text-[11px] block mb-1.5 text-slate-700">
                        Status Akses Tabel Database ({Object.keys(connTestResult.tablesStatus).length} Tabel):
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                        {Object.entries(connTestResult.tablesStatus).map(([tbl, status]) => (
                          <div
                            key={tbl}
                            className={`p-1.5 rounded-lg flex items-center justify-between border ${
                              status === true
                                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                                : 'bg-rose-100/70 border-rose-300 text-rose-800'
                            }`}
                          >
                            <span className="truncate">{tbl}</span>
                            <span className="font-bold shrink-0">
                              {status === true ? '✓ OK' : '✗ Fail'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reset Local Database Action Row */}
            <div className="pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={handleResetLocalAndPullCloud}
                disabled={isResettingLocal}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isResettingLocal ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>MEREFRESH KODE...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>RESET LOCAL & TARIK MART PROFILE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backup Data */}
          <div className="bg-[#eef2f6] p-5 sm:p-6 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Cadangkan Data Offline (Backup JSON)</span>
            </h3>

            <button
              onClick={handleBackupDatabase}
              className="w-full py-3 bg-[#eef2f6] hover:bg-slate-200 text-slate-800 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all"
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>UNDUH CADANGAN DATABASE JSON</span>
            </button>
          </div>

          {/* Owner Factory Reset Data Card */}
          <div className="bg-rose-50/90 p-5 sm:p-6 rounded-3xl border border-rose-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-black text-sm border-b border-rose-200 pb-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Reset Data Menyeluruh Toko (Khusus Owner)</span>
            </div>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">
              Tindakan ini akan menghapus seluruh data riwayat transaksi, shift kasir, pergerakan kas, laporan keuangan, dan log audit di IndexedDB dan Supabase Cloud. Data produk, akun pengguna, dan profil cabang toko akan tetap aman.
            </p>
            {currentUser.role === 'OWNER' ? (
              <button
                type="button"
                onClick={() => {
                  setOwnerPasswordInput('');
                  setResetError(null);
                  setIsResetModalOpen(true);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[4px_4px_10px_rgba(225,29,72,0.3)] transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>RESET SELURUH DATA TOKO MEBERSIHKAN 100%</span>
              </button>
            ) : (
              <p className="text-[11px] font-bold text-rose-600 italic">
                * Fitur ini terkunci dan hanya dapat dieksekusi oleh akun ber-role OWNER.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Factory Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleExecuteFactoryReset}
            className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-700 font-black text-base border-b border-slate-200 pb-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
              <span>Konfirmasi Reset Data Toko</span>
            </div>

            <div className="p-3 bg-rose-100/80 border border-rose-300 rounded-2xl text-xs text-rose-900 font-semibold space-y-1">
              <p className="font-extrabold text-rose-950">PERINGATAN PENTING:</p>
              <p>Seluruh omset, transaksi, pergerakan kas, dan laporan keuangan akan dihapus permanen menjadi 0.</p>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold text-xs">
                Masukkan Password / PIN Akun Owner ({currentUser.name})
              </label>
              <input
                type="password"
                value={ownerPasswordInput}
                onChange={(e) => setOwnerPasswordInput(e.target.value)}
                placeholder="Masukkan Password / PIN Owner"
                required
                className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
              />
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {resetError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(225,29,72,0.3)] flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>PROSES RESET...</span>
                  </>
                ) : (
                  <span>EKSEKUSI RESET DATA</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Add Branch */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateBranch}
            className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-3.5"
          >
            <h3 className="font-extrabold text-base text-slate-800 border-b border-slate-200 pb-3">
              Tambah Cabang Minimarket Baru
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nama Cabang</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Contoh: Minimarket Cabang Bandung"
                  required
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Alamat Lengkap Cabang</label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Jl. Raya Utama No. 123"
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nomor HP / WhatsApp Cabang</label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="+62 812-xxxx-xxxx"
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddBranchOpen(false)}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
              >
                SIMPAN CABANG
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};


