import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types';
import { formatDate } from '../../utils/formatters';
import { fetchAuditLogsFromCloud } from '../../services/supabase';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('SEMUA');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsRefreshing(true);
    try {
      const cloudLogs = await fetchAuditLogsFromCloud();
      let sorted = cloudLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (sorted.length === 0) {
        const initialLog: AuditLog = {
          id: `audit-init-${Date.now()}`,
          action: 'SYSTEM_STARTUP',
          module: 'SYSTEM',
          details: 'Sistem Minimarket POS berhasil dimulai & diaudit.',
          userName: 'System Administrator',
          userId: 'sys-01',
          branchId: 'default-branch-001',
          timestamp: new Date().toISOString()
        };
        sorted = [initialLog];
      }

      setLogs(sorted);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const modules = ['SEMUA', 'KASIR', 'INVENTARIS', 'SHIFT', 'KEUANGAN', 'SISTEM', 'OFFLINE'];

  const moduleMap: { [key: string]: string } = {
    SEMUA: 'ALL',
    KASIR: 'POS',
    INVENTARIS: 'INVENTORY',
    SHIFT: 'SHIFT',
    KEUANGAN: 'FINANCE',
    SISTEM: 'SYSTEM',
    OFFLINE: 'OFFLINE_ENGINE'
  };

  const filteredLogs = logs.filter((log) => {
    const targetMod = moduleMap[selectedModule];
    const matchesModule = selectedModule === 'SEMUA' || log.module === targetMod || log.module === selectedModule;
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800">
      <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Audit Trail Ledger Keamanan & Aktivitas</span>
            </h2>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded-full">
              Auto-prune 15 Hari
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Rekaman log aktivitas kasir & stok. Log dibersihkan otomatis setelah <span className="font-bold text-slate-800">15 hari</span> untuk mencegah memori penuh.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={isRefreshing}
          className="bg-[#eef2f6] hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Memuat...' : 'Muat Ulang Audit'}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="bg-emerald-600 text-white font-bold text-xs p-3 rounded-2xl shadow-md flex items-center justify-between">
          <span>✓ {toastMessage}</span>
        </div>
      )}

      {/* Search & Module Filters */}
      <div className="bg-[#eef2f6] p-4 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aksi audit, pengguna kasir, atau rincian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#eef2f6] text-slate-800 font-semibold pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {modules.map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedModule === mod
                    ? 'bg-[#eef2f6] text-emerald-700 shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff]'
                    : 'bg-[#eef2f6] text-slate-600 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#eef2f6] rounded-3xl overflow-hidden shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-200/50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-300">
              <tr>
                <th className="p-3.5">Waktu / Tanggal</th>
                <th className="p-3.5">Modul System</th>
                <th className="p-3.5">Aksi / Aktivitas</th>
                <th className="p-3.5">Operator Kasir</th>
                <th className="p-3.5">Rincian Detail Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-200/40 transition-colors">
                  <td className="p-3.5 text-slate-600 font-bold text-[11px] whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 font-bold text-[10px] shadow-[inset_1px_1px_2px_#cbd2d9]">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3.5 font-extrabold text-emerald-700">{log.action}</td>
                  <td className="p-3.5 font-bold text-slate-800">{log.userName}</td>
                  <td className="p-3.5 text-slate-600 font-medium text-[11px] max-w-md">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
