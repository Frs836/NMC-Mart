import React, { useEffect, useState } from 'react';
import { AppNotification, NotificationType, onLocalNotification } from '../../services/notifications';

const TYPE_COLOR: Record<NotificationType, string> = {
  SALE: 'bg-emerald-500',
  REFUND: 'bg-rose-500',
  CASH_IN: 'bg-sky-500',
  CASH_OUT: 'bg-amber-500',
  OWNER_DRAW: 'bg-violet-500',
  PO: 'bg-blue-500',
  SYSTEM: 'bg-slate-400'
};

export const NotificationBanner: React.FC = () => {
  const [toast, setToast] = useState<AppNotification | null>(null);

  useEffect(() => {
    return onLocalNotification((n) => setToast(n));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <>
      <style>{`@keyframes notif-slide-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="fixed top-16 right-3 sm:right-6 z-[60] w-80 max-w-[calc(100vw-1.5rem)] bg-[#eef2f6] rounded-2xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/70 p-3 cursor-pointer"
        style={{ animation: 'notif-slide-in 0.2s ease-out' }}
        onClick={() => setToast(null)}
      >
        <div className="flex items-start gap-2">
          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${TYPE_COLOR[toast.type] || 'bg-emerald-500'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-slate-800 leading-tight">{toast.title}</p>
            {toast.body && <p className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">{toast.body}</p>}
          </div>
        </div>
      </div>
    </>
  );
};
