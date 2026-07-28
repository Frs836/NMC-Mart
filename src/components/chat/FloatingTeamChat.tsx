import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, AlertTriangle, RefreshCw, Bell, BellOff, ChevronDown } from 'lucide-react';
import { TeamMessage, User } from '../../types';
import { sendTeamMessage, getBranchTeamMessages } from '../../services/api';

interface FloatingTeamChatProps {
  currentUser: User;
}

// Utility to play audio alert tone using Web Audio API
const playAlertChime = (isUrgent: boolean) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isUrgent ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isUrgent ? 880 : 587.33, ctx.currentTime); // A5 or D5
    if (isUrgent) {
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
    } else {
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    }

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isUrgent ? 0.4 : 0.25));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isUrgent ? 0.4 : 0.25));
  } catch (e) {
    console.warn('Audio play error:', e);
  }
};

export const FloatingTeamChat: React.FC<FloatingTeamChatProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [hasUnreadUrgent, setHasUnreadUrgent] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const prevMsgCountRef = useRef<number>(0);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const loadMessages = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    const branchId = currentUser.branchId || 'default-branch-001';
    const msgs = await getBranchTeamMessages(branchId);

    // Check if new urgent message arrived
    if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      const latest = msgs[0];
      if (latest && latest.senderId !== currentUser.id) {
        // Trigger audio chime
        playAlertChime(latest.isUrgent);

        // Trigger native device notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(
            latest.isUrgent ? '🚨 URGENT: Pesan Tim Store!' : `💬 Pesan Baru dari ${latest.senderName}`,
            {
              body: `${latest.senderName} (${latest.senderRole}): "${latest.message}"`,
              icon: '/favicon.ico'
            }
          );
        }

        if (latest.isUrgent) {
          setHasUnreadUrgent(true);
        }
      }
    }

    prevMsgCountRef.current = msgs.length;
    setMessages(msgs);
    if (!isPoll) setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const pollTime = isOpen ? 8000 : 15000;
    const interval = setInterval(() => {
      loadMessages(true);
    }, pollTime);
    return () => clearInterval(interval);
  }, [currentUser.branchId, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    const newMsg = await sendTeamMessage({
      branchId: currentUser.branchId || 'default-branch-001',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientRole: 'ALL',
      message: inputText.trim(),
      isUrgent
    });

    setMessages((prev) => [newMsg, ...prev]);
    prevMsgCountRef.current = prevMsgCountRef.current + 1;
    setInputText('');
    setIsUrgent(false);
    setSending(false);

    // Play feedback tone
    playAlertChime(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-md">OWNER</span>;
      case 'MANAGER':
        return <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-md">MANAGER</span>;
      default:
        return <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md">KASIR / SHIFTER</span>;
    }
  };

  const urgentCount = messages.filter((m) => m.isUrgent).length;

  return (
    <>
      {/* FLOATING ACTION BUTTON (FAB) - Elevated Position to clear bottom action bars */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasUnreadUrgent(false);
            if (notificationPermission === 'default') {
              requestNotificationPermission();
            }
          }}
          className={`flex items-center gap-2 px-4 py-3 rounded-full font-black text-xs text-white shadow-[0_10px_30px_rgba(147,51,234,0.45)] transition-all transform hover:scale-105 active:scale-95 border border-white/20 ${
            hasUnreadUrgent || urgentCount > 0
              ? 'bg-gradient-to-r from-purple-600 to-rose-600 animate-bounce'
              : 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500'
          }`}
          title="Buka Chat & Pengingat Tim Internal Store"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {(hasUnreadUrgent || urgentCount > 0) && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-ping" />
            )}
          </div>
          <span className="hidden sm:inline">Chat Tim</span>
          {urgentCount > 0 && (
            <span className="bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
              {urgentCount} URGENT
            </span>
          )}
        </button>
      </div>

      {/* FLOATING CHAT DRAWER / POPUP MODAL - Positioned higher with backdrop overlay option */}
      {isOpen && (
        <>
          {/* Subtle click-away backdrop on small devices to prevent unintended clicks behind chat */}
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed bottom-36 right-3 sm:right-8 sm:bottom-24 z-50 w-[94vw] sm:w-[420px] bg-[#eef2f6] border border-white/90 rounded-3xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35),10px_10px_20px_#cbd2d9] space-y-3 flex flex-col max-h-[65vh] sm:max-h-[520px] transition-all animate-in fade-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shadow-[inset_2px_2px_4px_#cbd2d9]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800 leading-tight">Chat & Instruksi Tim Store</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-slate-500">Realtime interaksi Owner, Manager & Kasir</p>
                    <span className="text-[9px] bg-purple-100 text-purple-900 font-bold px-1.5 py-0.2 rounded-full border border-purple-200">Auto Clear 24 Jam ⏳</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Device Notification Button */}
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="p-1.5 bg-amber-100 text-amber-900 rounded-xl hover:bg-amber-200 text-[10px] font-bold flex items-center gap-1 shadow-[1px_1px_3px_#cbd2d9]"
                    title="Aktifkan Notifikasi Hp/Komputer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden sm:inline">Notif On</span>
                  </button>
                )}

                <button
                  onClick={() => loadMessages()}
                  className="p-1.5 bg-[#eef2f6] rounded-xl text-slate-600 hover:text-slate-900 shadow-[2px_2px_4px_#cbd2d9]"
                  title="Refresh Pesan"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200"
                  title="Tutup Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Device Notification Banner */}
          {notificationPermission !== 'granted' && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-[10px] text-amber-900 font-medium">
              <span>Klik &quot;Notif On&quot; agar popup notifikasi device berbunyi saat pesan urgent masuk.</span>
              <button
                onClick={requestNotificationPermission}
                className="ml-2 px-2 py-1 bg-amber-600 text-white font-extrabold rounded-lg text-[9px]"
              >
                Izinkan
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px] max-h-[350px]">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500 font-bold">Memuat pesan tim...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-bold">
                Belum ada instruksi atau catatan shift. Kirim pesan pertama!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === currentUser.id;
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                      m.isUrgent
                        ? 'bg-rose-50 border-rose-300 shadow-[2px_2px_6px_rgba(225,29,72,0.15)]'
                        : isMe
                        ? 'bg-purple-50/90 border-purple-200 ml-4 shadow-[2px_2px_4px_#cbd2d9]'
                        : 'bg-white/90 border-slate-200 mr-4 shadow-[2px_2px_4px_#cbd2d9]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-800">{m.senderName}</span>
                        {getRoleBadge(m.senderRole)}
                        {m.isUrgent && (
                          <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="space-y-2 shrink-0 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-600">Kirim Instruksi / Catatan:</span>
              <label className="flex items-center gap-1 text-rose-700 font-extrabold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded border-rose-400 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <span>URGENT 🚨</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Tulis pesan ke tim shift..."
                className="flex-1 bg-[#eef2f6] text-slate-800 font-bold p-2.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-400 text-white font-black rounded-2xl flex items-center justify-center gap-1 shadow-[3px_3px_8px_rgba(147,51,234,0.3)] text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </form>
        </div>
      </>
    )}
  </>
);
};
