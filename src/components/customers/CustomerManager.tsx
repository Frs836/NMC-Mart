import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Phone, Award, X, Trash2, Search, Edit2 } from 'lucide-react';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { getSupabaseClient } from '../../services/supabase';

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Ahmad Subagja', whatsapp: '081234567890', email: 'ahmad@gmail.com', loyaltyPoints: 240, totalSpent: 1250000, lastVisit: '2026-03-28' },
  { id: 'cust-2', name: 'Siti Nurhaliza', whatsapp: '089876543210', email: 'siti@yahoo.com', loyaltyPoints: 120, totalSpent: 620000, lastVisit: '2026-03-29' }
];

export const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(50);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client.from('customers').select('*');
        if (data && data.length > 0) {
          const list: Customer[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            whatsapp: d.whatsapp || '',
            email: d.email || '',
            loyaltyPoints: Number(d.loyalty_points || 0),
            totalSpent: Number(d.total_spent || 0),
            lastVisit: d.last_visit || new Date().toISOString()
          }));
          setCustomers(list);
          return;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('minimarket_customers_v1');
    if (saved) {
      setCustomers(JSON.parse(saved));
    } else {
      setCustomers(INITIAL_CUSTOMERS);
      localStorage.setItem('minimarket_customers_v1', JSON.stringify(INITIAL_CUSTOMERS));
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedList: Customer[] = [];
    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name,
        whatsapp,
        email,
        loyaltyPoints
      };
      updatedList = customers.map((c) => (c.id === updated.id ? updated : c));
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name,
        whatsapp,
        email,
        loyaltyPoints,
        totalSpent: 0,
        lastVisit: new Date().toISOString()
      };
      updatedList = [newCust, ...customers];
    }

    setCustomers(updatedList);
    localStorage.setItem('minimarket_customers_v1', JSON.stringify(updatedList));

    const client = getSupabaseClient();
    if (client) {
      try {
        for (const c of updatedList) {
          await client.from('customers').upsert({
            id: c.id,
            name: c.name,
            whatsapp: c.whatsapp,
            email: c.email,
            loyalty_points: c.loyaltyPoints,
            total_spent: c.totalSpent,
            last_visit: c.lastVisit
          });
        }
      } catch (e) {}
    }

    setIsAddOpen(false);
    setEditingCustomer(null);
    setName('');
    setWhatsapp('');
    setEmail('');
    setLoyaltyPoints(50);
  };

  const handleEditClick = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setWhatsapp(c.whatsapp);
    setEmail(c.email || '');
    setLoyaltyPoints(c.loyaltyPoints);
    setIsAddOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Yakin ingin menghapus data member ini?')) {
      const updatedList = customers.filter((c) => c.id !== id);
      setCustomers(updatedList);
      localStorage.setItem('minimarket_customers_v1', JSON.stringify(updatedList));
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('customers').delete().eq('id', id);
        } catch (e) {}
      }
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.whatsapp.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 md:pb-6 text-slate-800">
      <div className="bg-[#eef2f6] p-5 rounded-3xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Manajemen Pelanggan & Member Loyalitas (CRUD)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Kelola data member minimarket, tambah/edit poin reward, dan hapus pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari member / WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#eef2f6] text-xs text-slate-800 font-bold pl-9 pr-3 py-2.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setName('');
              setWhatsapp('');
              setEmail('');
              setLoyaltyPoints(50);
              setIsAddOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)] transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Member</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-[#eef2f6] p-4 rounded-3xl space-y-2.5 shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 relative"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-extrabold text-sm text-slate-800 line-clamp-1">{c.name}</h3>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-xl shadow-[inset_1px_1px_2px_#cbd2d9] flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-600" />
                    {c.loyaltyPoints} Poin
                  </span>

                  <button
                    onClick={() => handleEditClick(c)}
                    className="p-1 text-slate-500 hover:text-emerald-600 rounded-lg"
                    title="Edit Member"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c.id)}
                    className="p-1 text-slate-500 hover:text-rose-600 rounded-lg"
                    title="Hapus Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{c.whatsapp || 'Tanpa No. WhatsApp'}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-bold">Total Belanja: {formatCurrency(c.totalSpent)}</p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-400 bg-[#eef2f6] rounded-3xl shadow-[inset_3px_3px_6px_#cbd2d9]">
            <Users className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="text-xs font-bold">Belum ada member terdaftar yang cocok.</p>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-3.5"
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingCustomer ? 'Edit Data Member' : 'Registrasi Member Baru'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nama Lengkap Pelanggan</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Nomor WhatsApp (+62...)</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+62812345678"
                  required
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-bold">Jumlah Poin Loyalitas</label>
                <input
                  type="number"
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                  required
                  className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingCustomer(null);
                }}
                className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
              >
                SIMPAN MEMBER
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
