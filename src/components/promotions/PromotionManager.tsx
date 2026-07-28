import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Trash2, Power, Search } from 'lucide-react';
import { Promotion } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { getSupabaseClient } from '../../services/supabase';

const INITIAL_PROMOTIONS: Promotion[] = [
  { id: 'promo-1', title: 'Diskon Spesial Member 10%', type: 'PERCENTAGE', value: 10, minPurchase: 50000, code: 'MEMBER10', isActive: true, startDate: '2026-01-01', endDate: '2026-12-31' },
  { id: 'promo-2', title: 'Potongan Rp 5.000 Belanja 100rb', type: 'FIXED', value: 5000, minPurchase: 100000, code: 'HEMAT5K', isActive: true, startDate: '2026-01-01', endDate: '2026-12-31' }
];

export const PromotionManager: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState(10);
  const [code, setCode] = useState('');
  const [minPurchase, setMinPurchase] = useState(20000);

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client.from('promotions').select('*');
        if (data && data.length > 0) {
          const list: Promotion[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            type: d.type,
            value: Number(d.value || 0),
            minPurchase: Number(d.min_purchase || 0),
            code: d.code,
            isActive: d.is_active ?? true,
            startDate: d.start_date || '2026-01-01',
            endDate: d.end_date || '2027-12-31'
          }));
          setPromotions(list);
          return;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('minimarket_promotions_v1');
    if (saved) {
      setPromotions(JSON.parse(saved));
    } else {
      setPromotions(INITIAL_PROMOTIONS);
      localStorage.setItem('minimarket_promotions_v1', JSON.stringify(INITIAL_PROMOTIONS));
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      title,
      type,
      value,
      minPurchase,
      code: code.toUpperCase() || `PROMO${Date.now().toString().slice(-4)}`,
      isActive: true,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2027-12-31'
    };

    const updatedList = [newPromo, ...promotions];
    setPromotions(updatedList);
    localStorage.setItem('minimarket_promotions_v1', JSON.stringify(updatedList));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('promotions').upsert({
          id: newPromo.id,
          title: newPromo.title,
          type: newPromo.type,
          value: newPromo.value,
          min_purchase: newPromo.minPurchase,
          code: newPromo.code,
          is_active: newPromo.isActive,
          start_date: newPromo.startDate,
          end_date: newPromo.endDate
        });
      } catch (e) {}
    }

    setIsAddOpen(false);
    setTitle('');
    setCode('');
  };

  const handleToggleActive = async (promo: Promotion) => {
    const updated = { ...promo, isActive: !promo.isActive };
    const updatedList = promotions.map((p) => (p.id === promo.id ? updated : p));
    setPromotions(updatedList);
    localStorage.setItem('minimarket_promotions_v1', JSON.stringify(updatedList));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('promotions').update({ is_active: updated.isActive }).eq('id', updated.id);
      } catch (e) {}
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (confirm('Yakin ingin menghapus kupon promo ini?')) {
      const updatedList = promotions.filter((p) => p.id !== id);
      setPromotions(updatedList);
      localStorage.setItem('minimarket_promotions_v1', JSON.stringify(updatedList));

      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('promotions').delete().eq('id', id);
        } catch (e) {}
      }
    }
  };

  const filteredPromos = promotions.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800">
      <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            <span>Manajemen Promosi & Kode Diskon (CRUD)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Atur kupon potongan belanja, batas nominal minimarket, dan aktivasi diskon kasir.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode/judul promo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#eef2f6] text-xs text-slate-800 font-bold pl-9 pr-3 py-2.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Promo Baru</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredPromos.length > 0 ? (
          filteredPromos.map((p) => (
            <div
              key={p.id}
              className="bg-[#eef2f6] p-4 rounded-3xl space-y-3 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 relative"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl shadow-[inset_1px_1px_2px_#cbd2d9]">
                  {p.code}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(p)}
                    title={p.isActive ? 'Nonaktifkan Promo' : 'Aktifkan Promo'}
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all ${
                      p.isActive
                        ? 'bg-emerald-100 text-emerald-800 shadow-[inset_1px_1px_2px_#cbd2d9]'
                        : 'bg-rose-100 text-rose-800 shadow-[inset_1px_1px_2px_#cbd2d9]'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{p.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                  </button>

                  <button
                    onClick={() => handleDeletePromo(p.id)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-800 line-clamp-1">{p.title}</h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Besar Diskon:{' '}
                  <span className="font-black text-emerald-700">
                    {p.type === 'PERCENTAGE' ? `${p.value}%` : formatCurrency(p.value)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Syarat Belanja: {formatCurrency(p.minPurchase)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-400 bg-[#eef2f6] rounded-3xl shadow-[inset_3px_3px_6px_#cbd2d9]">
            <Tag className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="text-xs font-bold">Belum ada promo terdaftar yang cocok.</p>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleAddPromo}
            className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-3.5"
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">Tambah Promo Diskon Baru</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Judul Promo</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Contoh: Diskon Hari Raya 10%"
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Kode Promo / Kupon</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Contoh: HARIRAYA10"
                  className="w-full bg-[#eef2f6] text-emerald-800 font-mono font-black p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Tipe Diskon</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="FIXED">Potongan Tetap Nominal (Rp)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nilai Diskon</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  required
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Minimal Belanja Syarat (Rp)</label>
                <input
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(Number(e.target.value))}
                  required
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
              >
                SIMPAN PROMO
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
