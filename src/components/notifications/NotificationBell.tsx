import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import {
  AppNotification,
  NotificationType,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  onLocalNotification
} from '../../services/notifications';

const TYPE_COLOR: Record<NotificationType, string> = {
  SALE: 'bg-emerald-500',
  REFUND: 'bg-rose-500',
  CASH_IN: 'bg-sky-500',
  CASH_OUT: 'bg-amber-500',
  OWNER_DRAW: 'bg-violet-500',
  PO: 'bg-blue-500',
  SYSTEM: 'bg-slate-400'
};

function timeAgo(iso: string): string {
  try {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'baru saja';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
  } catch (e) {
    return '';
  }
}

export const NotificationBell: React.FC = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const list = await fetchNotifications();
    setItems((prev) => {
      const merged = [...list];
      for (const p of prev) {
        if (!merged.some((m) => m.id === p.id)) merged.push(p);
      }
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return merged.slice(0, 50);
    });
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 20000);
    const off = onLocalNotification((n) => {
      setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 50));
    });
    return () => {
      clearInterval(iv);
      off();
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const ids = items.filter((n) => !n.readAt).map((n) => n.id);
      markNotificationsRead(ids).then(() => {
        setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
      });
    }
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        title="Notifikasi"
        className="relative flex items-center bg-[#eef2f6] px-2 py-1.5 rounded-xl text-xs shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all"
      >
        {unread > 0 ? <BellRing className="w-4 h-4 text-rose-500 shrink-0" /> : <Bell className="w-4 h-4 text-slate-500 shrink-0" />}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#eef2f6] rounded-2xl shadow-[8px_8px_16px_#cbd2d9,-8px_-8px_16px_#ffffff] border border-white/60 z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 hover:underline">
                <CheckCheck className="w-3 h-3 shrink-0" />
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-200/70">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-400 font-semibold">Belum ada notifikasi</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`px-3 py-2.5 ${n.readAt ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.readAt ? 'bg-slate-300' : TYPE_COLOR[n.type] || 'bg-emerald-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold text-slate-800 leading-tight">{n.title}</p>
                      {n.body && <p className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">{n.body}</p>}
                      <p className="text-[9px] text-slate-400 font-semibold mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
