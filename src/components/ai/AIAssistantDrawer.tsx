import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, ShieldCheck, Send, MessageSquare, Key, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { fetchAIInsights, sendAIChatMessage, fetchAIStatus } from '../../services/ai';
import { AIInsightsResponse } from '../../types';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface AIStatusState {
  hasKey: boolean;
  isFunctional: boolean;
  message: string;
  model: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const [apiStatus, setApiStatus] = useState<AIStatusState | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showKeyGuide, setShowKeyGuide] = useState(false);

  const [customApiKeyInput, setCustomApiKeyInput] = useState(() => localStorage.getItem('minimarket_gemini_api_key') || '');
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkApiConnection();
      if (!insights) {
        loadInsights();
      }
      if (chatMessages.length === 0) {
        setChatMessages([
          {
            sender: 'ai',
            text: 'Halo! Saya Asisten Bisnis Pintar Gemini AI RetailFlow POS. Saya terhubung langsung ke database real-time toko Anda. Silakan tanyakan analisis omset penjualan, rekomendasi restock produk, ide paket promo, atau histori audit log keuangan.'
          }
        ]);
      }
    }
  }, [isOpen]);

  const handleSaveCustomApiKey = () => {
    const trimmed = customApiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('minimarket_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('minimarket_gemini_api_key');
    }
    setSaveKeySuccess(true);
    setTimeout(() => setSaveKeySuccess(false), 3000);
    checkApiConnection();
    loadInsights();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const checkApiConnection = async () => {
    setIsCheckingStatus(true);
    const status = await fetchAIStatus();
    setApiStatus(status);
    setIsCheckingStatus(false);
  };

  const loadInsights = async () => {
    setLoading(true);
    const data = await fetchAIInsights();
    setInsights(data);
    setLoading(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isSending) return;

    const userMsg: ChatMessage = { sender: 'user', text: query };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsSending(true);

    const historyForAi = chatMessages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const aiReply = await sendAIChatMessage(query, historyForAi);
    setChatMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
    setIsSending(false);
  };

  if (!isOpen) return null;

  const quickQueries = [
    'Barang apa yang hampir habis?',
    'Analisis omset & penjualan hari ini',
    'Bantu cari audit log transaksi/keuangan',
    'Rekomendasi paket promo & bundling'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#eef2f6] border-l border-white/80 h-full flex flex-col shadow-[-12px_0px_24px_rgba(0,0,0,0.1)] p-4 sm:p-5 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-[2px_2px_4px_#cbd2d9]">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Asisten Bisnis Gemini AI</h3>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Penasihat Pintar Minimarket
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Connection Status Banner */}
        <div className="mt-2.5 p-2.5 bg-[#eef2f6] rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              {isCheckingStatus ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span className="text-slate-600">Memeriksa Koneksi API Gemini...</span>
                </>
              ) : apiStatus?.isFunctional ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-black">API Gemini Terhubung (gemini-2.5-flash)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-800 font-extrabold">
                    {apiStatus?.hasKey ? 'Koneksi Terkendala (Engine Lokal)' : 'API Key Belum Diset (Engine Lokal)'}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={checkApiConnection}
                title="Cek ulang status koneksi Gemini"
                className="p-1 hover:bg-slate-200 rounded-lg transition-all text-slate-600"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowKeyGuide(!showKeyGuide)}
                className="text-[10px] font-black text-emerald-700 underline hover:text-emerald-900 px-1"
              >
                {showKeyGuide ? 'Tutup Pengaturan' : 'Set API Key / Panduan'}
              </button>
            </div>
          </div>

          {apiStatus?.message && !apiStatus.isFunctional && (
            <p className="text-[10px] text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200/60 leading-tight">
              {apiStatus.message}
            </p>
          )}

          {/* Expandable Key Instructions & Custom Input Guide */}
          {showKeyGuide && (
            <div className="mt-1 p-3 bg-slate-800 text-slate-200 rounded-xl text-[11px] leading-relaxed space-y-2 shadow-inner">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-300">
                <Key className="w-3.5 h-3.5" />
                <span>Pengaturan API Key Google AI Studio:</span>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] text-slate-300 font-bold">
                  Masukkan Gemini API Key Google AI Studio:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    placeholder="Masukkan Gemini API Key..."
                    value={customApiKeyInput}
                    onChange={(e) => setCustomApiKeyInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomApiKey}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
                  >
                    Simpan
                  </button>
                </div>
                {saveKeySuccess && (
                  <p className="text-[10px] text-emerald-400 font-bold">✓ API Key disimpan & koneksi diverifikasi!</p>
                )}
              </div>

              <div className="border-t border-slate-700/80 pt-2 space-y-1 text-slate-300">
                <p className="font-semibold text-amber-200 text-[10px]">💡 Catatan API Key Gemini:</p>
                <p>
                  1. Ambil API key Anda di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">Google AI Studio (aistudio.google.com/app/apikey)</a>.
                </p>
                <p>
                  2. Model utama menggunakan <code className="text-emerald-300">gemini-flash-latest</code>. Kunci dari AI Studio dapat disimpan melalui input di atas atau melalui environment variable.
                </p>
                <p>
                  3. Jika belum dipasang, AI tetap aktif melayani tanya jawab dengan Engine Analisis Lokal terintegrasi berbasis database real-time toko Anda.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex bg-[#eef2f6] p-1 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] my-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-[#eef2f6] text-emerald-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya Jawab AI</span>
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'insights'
                ? 'bg-[#eef2f6] text-emerald-700 shadow-[3px_3px_6px_#cbd2d9,-3px_-3px_6px_#ffffff]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rangkuman Eksekutif</span>
          </button>
        </div>

        {/* Tab 1: Interactive AI Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Quick Query Recommendation Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isSending}
                  className="text-[10px] font-extrabold bg-[#eef2f6] hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-xl shadow-[2px_2px_4px_#cbd2d9,-2px_-2px_4px_#ffffff] active:shadow-[inset_1px_1px_2px_#cbd2d9] transition-all text-left"
                >
                  ✨ {q}
                </button>
              ))}
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-[#eef2f6] text-slate-800 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] border border-white/60 rounded-bl-none'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <span className="text-[10px] font-black text-emerald-800 uppercase block mb-1">
                        Gemini AI Advisor
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-[#eef2f6] text-slate-600 p-3 rounded-2xl text-xs font-bold shadow-[inset_2px_2px_4px_#cbd2d9] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span>Menganalisis database minimarket...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-1 border-t border-slate-200/80"
            >
              <input
                type="text"
                placeholder="Ketik pertanyaan dalam Bahasa Indonesia..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isSending}
                className="flex-1 bg-[#eef2f6] text-xs font-bold text-slate-800 px-3.5 py-3 rounded-2xl shadow-[inset_3px_3px_6px_#cbd2d9,inset_-3px_-3px_6px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isSending}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-[3px_3px_6px_rgba(16,185,129,0.3)] transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Insights Summary */}
        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-1">
            <button
              onClick={loadInsights}
              disabled={loading}
              className="w-full py-2.5 bg-[#eef2f6] hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#cbd2d9] transition-all"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menganalisis Stok & Penjualan...' : 'Muat Ulang Analisis AI'}</span>
            </button>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 py-12">
                <Sparkles className="w-10 h-10 text-emerald-600 animate-bounce" />
                <p className="text-xs font-bold">Gemini AI sedang mengolah performa toko...</p>
              </div>
            ) : insights ? (
              <div className="space-y-4 text-xs">
                {/* Executive Summary */}
                <div className="bg-[#eef2f6] p-4 rounded-3xl shadow-[inset_2px_2px_4px_#cbd2d9] space-y-1">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                    Rangkuman Performa Toko
                  </span>
                  <p className="text-slate-700 font-medium leading-relaxed">{insights.executiveSummary}</p>
                </div>

                {/* Restock Urgent Predictions */}
                <div className="bg-[#eef2f6] p-4 rounded-3xl shadow-[inset_2px_2px_4px_#cbd2d9] space-y-2">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Peringatan Restock Produk
                  </span>
                  <ul className="space-y-1.5 pl-1">
                    {insights.restockUrgent?.map((item, idx) => (
                      <li key={idx} className="text-slate-700 font-medium flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Promotional Advice */}
                <div className="bg-[#eef2f6] p-4 rounded-3xl shadow-[inset_2px_2px_4px_#cbd2d9] space-y-2">
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Rekomendasi Paket Promo & Bundling
                  </span>
                  <ul className="space-y-1.5 pl-1">
                    {insights.promotionalAdvice?.map((item, idx) => (
                      <li key={idx} className="text-slate-700 font-medium flex items-start gap-1.5">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Revenue Tip */}
                <div className="bg-[#eef2f6] p-4 rounded-3xl shadow-[6px_6px_12px_#cbd2d9,-6px_-6px_12px_#ffffff] border border-white/60 space-y-1">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Strategi Peningkatan Omset
                  </span>
                  <p className="text-slate-700 font-bold leading-relaxed">{insights.revenueGrowthTip}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};


