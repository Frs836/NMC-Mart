import React, { useState, useEffect } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { openShiftServer, getActiveShiftServer, logAudit } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface OpenShiftModalProps {
  currentUser: any;
  activeBranch: any;
  setActiveShift: (shift: any) => void;
  onClose: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  currentUser,
  activeBranch,
  setActiveShift,
  onClose
}) => {
  const [cashierName, setCashierName] = useState(currentUser.name);
  const [openingCash, setOpeningCash] = useState<number>(100000); // Default Rp 100.000
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkActive = async () => {
      try {
        const active = await getActiveShiftServer(activeBranch?.id);
        if (active && isMounted) {
          setActiveShift(active);
          onClose();
        }
      } catch (e) {}
    };
    checkActive();
    return () => { isMounted = false; };
  }, [activeBranch?.id]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const shift = await openShiftServer(currentUser.id, cashierName, openingCash, activeBranch?.id || 'default-branch-001');
      await logAudit(
        'BUKA_SHIFT',
        'SHIFT',
        `Kasir ${cashierName} membuka shift dengan kas awal ${formatCurrency(openingCash)}`,
        cashierName,
        currentUser.id
      );
      setActiveShift(shift);
      onClose();
    } catch (e) {
      console.error('Error opening shift:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <form
        onSubmit={handleOpenShift}
        className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-emerald-700">
          <LogIn className="w-5 h-5" />
          <h3 className="font-extrabold text-base text-slate-800">Buka Shift Kasir Baru</h3>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-600 block mb-1 font-bold">Nama Kasir Bertugas</label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              required
              className="w-full bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Kas Awal Laci Register (Rp)</label>
            <div className="relative">
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                required
                className="w-full bg-[#eef2f6] text-emerald-800 font-black p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none pl-9 text-base"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold">Rp</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Saldo uang tunai awal di dalam laci kasir untuk kembalian.</p>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-bold">Catatan Shift (Opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Shift Pagi 08:00 - 16:00"
              className="w-full bg-[#eef2f6] text-slate-800 font-medium p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none h-20"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-[#eef2f6] text-slate-700 font-bold rounded-2xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-[4px_4px_10px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'BUKA SHIFT'}
          </button>
        </div>
      </form>
    </div>
  );
};
