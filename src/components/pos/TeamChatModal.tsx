import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, AlertTriangle, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { TeamMessage, User } from '../../types';
import { sendTeamMessage, getBranchTeamMessages } from '../../services/api';

interface TeamChatModalProps {
  currentUser: User;
  onClose: () => void;
}

export const TeamChatModal: React.FC<TeamChatModalProps> = ({ currentUser, onClose }) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await getBranchTeamMessages(currentUser.branchId || 'default-branch-001');
    setMessages(msgs);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, []);

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
    setInputText('');
    setIsUrgent(false);
    setSending(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-md">OWNER</span>;
      case 'MANAGER':
        return <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-md">MANAGER</span>;
      default:
        return <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md">CASHIER / SHIFTER</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-[#eef2f6] border border-white/80 w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shadow-[inset_2px_2px_4px_#cbd2d9]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-800">Chat & Pengingat Tim Internal Store</h3>
              <p className="text-[11px] text-slate-500">Pesan langsung antar Owner, Manager, dan Karyawan Shifter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMessages}
              className="p-2 bg-[#eef2f6] rounded-xl text-slate-600 hover:text-slate-900 shadow-[2px_2px_4px_#cbd2d9]"
              title="Refresh Pesan"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message List Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[260px] max-h-[400px]">
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500 font-bold">Memuat pesan tim internal...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-bold">Belum ada catatan atau pesan. Mulai tulis pesan pertama!</div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                    m.isUrgent
                      ? 'bg-rose-50 border-rose-200 shadow-[2px_2px_5px_rgba(225,29,72,0.15)]'
                      : isMe
                      ? 'bg-emerald-50/80 border-emerald-200/80 ml-6 shadow-[2px_2px_5px_#cbd2d9]'
                      : 'bg-white/80 border-slate-200 mr-6 shadow-[2px_2px_5px_#cbd2d9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800">{m.senderName}</span>
                      {getRoleBadge(m.senderRole)}
                      {m.isUrgent && (
                        <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
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
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-600">Tulis Pesan / Instruksi Operasional Shift:</label>
            <label className="flex items-center gap-1.5 text-[10px] text-rose-700 font-extrabold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded border-rose-400 text-rose-600 focus:ring-rose-500"
              />
              <span>Tandai sebagai URGENT 🚨</span>
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Contoh: Tolong restock Aqua 600ml di etalase depan ya, sisa 2 botol."
              className="flex-1 bg-[#eef2f6] text-slate-800 font-bold p-3 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] border-none focus:outline-none text-xs"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-400 text-white font-black rounded-2xl flex items-center justify-center gap-1.5 shadow-[4px_4px_10px_rgba(147,51,234,0.3)]"
            >
              <Send className="w-4 h-4" />
              <span>Kirim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
