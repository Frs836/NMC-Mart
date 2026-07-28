import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Layers, ChevronDown, ChevronUp, Clock, Lightbulb } from 'lucide-react';
import { Product } from '../../types';

interface AIPOSAlertWidgetProps {
  products: Product[];
  onOpenRackTransfer: () => void;
}

export const AIPOSAlertWidget: React.FC<AIPOSAlertWidgetProps> = ({
  products,
  onOpenRackTransfer
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Filter low shelf stock items (shelfStock <= 3 and stock > 0)
  const lowShelfProducts = products.filter((p) => {
    const s = p.shelfStock ?? p.stock;
    return s <= 3 && p.stock > 0;
  });

  // Filter near expiry
  const now = new Date();
  const nearExpiryProducts = products.filter((p) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  if (lowShelfProducts.length === 0 && nearExpiryProducts.length === 0) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900 shadow-[2px_2px_6px_#cbd2d9]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="font-extrabold">AI POS Assistant: Semua stok etalase & rak penjualan dalam kondisi optimal! ✨</span>
        </div>
        <button
          onClick={onOpenRackTransfer}
          className="text-[10px] bg-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-[2px_2px_4px_rgba(16,185,129,0.3)] hover:bg-emerald-500"
        >
          + Restock Rak
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-3xl p-3.5 sm:p-4 shadow-[4px_4px_12px_#cbd2d9,-4px_-4px_12px_#ffffff] text-xs space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-[1px_1px_3px_rgba(245,158,11,0.5)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-amber-900 text-xs flex items-center gap-1.5">
              AI POS Alert & Store Assistant
              <span className="bg-amber-200 text-amber-900 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full">
                {lowShelfProducts.length + nearExpiryProducts.length} Peringatan
              </span>
            </h4>
            <p className="text-[10px] text-amber-800/80">Deteksi otomatis stok etalase menipis & barang butuh perhatian kasir</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRackTransfer}
            className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-xl shadow-[2px_2px_6px_rgba(16,185,129,0.3)] flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Restock Rak Now</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Low Shelf Alerts */}
          {lowShelfProducts.length > 0 && (
            <div className="bg-white/80 p-3 rounded-2xl border border-amber-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Stok Etalase Menipis / Kritis (Segera Restock):</span>
              </div>
              <ul className="space-y-1">
                {lowShelfProducts.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                    <span className="truncate max-w-[180px] font-bold">• {p.name}</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-md">
                      Etalase: {p.shelfStock ?? p.stock} unit (Gudang: {p.stock})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Near Expiry Alerts */}
          {nearExpiryProducts.length > 0 && (
            <div className="bg-white/80 p-3 rounded-2xl border border-amber-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Barang Mendekati Kadaluarsa di Etalase:</span>
              </div>
              <ul className="space-y-1">
                {nearExpiryProducts.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                    <span className="truncate max-w-[180px] font-bold">• {p.name}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-md">
                      Exp: {p.expiryDate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
