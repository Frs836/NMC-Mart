import React from 'react';
import { Printer, Send, CheckCircle2, X } from 'lucide-react';
import { Transaction, Branch } from '../../types';
import { formatCurrency, formatDate, generateWhatsAppReceiptUrl } from '../../utils/formatters';

interface ReceiptModalProps {
  tx: Transaction;
  branch: Branch;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ tx, branch, onClose }) => {
  const footerMessage = branch.receiptFooter || 'Terima kasih telah berbelanja bersama kami!';
  const receiptText = `*${branch.name}*
${branch.address}
Tel: ${branch.phone}
--------------------------------
No. Struk: ${tx.txUuid.slice(0, 8).toUpperCase()}
Tanggal: ${formatDate(tx.createdAt)}
Kasir: ${tx.cashierName}
Pelanggan: ${tx.customerName || 'Pelanggan Umum'}
--------------------------------
${tx.items
  .map(
    (item) =>
      `${item.product.name}\n${item.quantity} x ${formatCurrency(item.product.sellingPrice)} = ${formatCurrency(
        item.subtotal
      )}`
  )
  .join('\n')}
--------------------------------
Subtotal: ${formatCurrency(tx.subtotal)}
Diskon: ${formatCurrency(tx.discountTotal)}
TOTAL BELANJA: ${formatCurrency(tx.grandTotal)}
Bayar (${tx.paymentMethod}): ${formatCurrency(tx.payAmount)}
Kembalian: ${formatCurrency(tx.changeAmount)}
--------------------------------
${footerMessage}`;

  const sendWhatsApp = () => {
    if (!tx.customerPhone) {
      const phone = prompt('Masukkan nomor WhatsApp pelanggan (+62...):', '+628');
      if (!phone) return;
      const url = generateWhatsAppReceiptUrl(phone, branch.name, receiptText);
      window.open(url, '_blank');
    } else {
      const url = generateWhatsAppReceiptUrl(tx.customerPhone, branch.name, receiptText);
      window.open(url, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-[#eef2f6] border border-white/80 w-full max-w-md rounded-3xl p-5 shadow-[12px_12px_24px_#cbd2d9,-12px_-12px_24px_#ffffff] space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-extrabold text-sm sm:text-base text-slate-800">Transaksi Berhasil</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Visual Preview */}
        <div className="flex-1 bg-white text-slate-900 font-mono text-xs p-4 rounded-2xl shadow-[inset_2px_2px_4px_#cbd2d9] overflow-y-auto space-y-2 select-all print:p-0">
          <div className="text-center font-bold">
            <h2 className="text-sm uppercase tracking-wide">{branch.name}</h2>
            <p className="text-[10px] font-normal text-slate-600">{branch.address}</p>
            <p className="text-[10px] font-normal text-slate-600">Tel: {branch.phone}</p>
          </div>

          <div className="border-b border-dashed border-slate-400 py-1 text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>No. Struk:</span>
              <span className="font-bold">{tx.txUuid.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal:</span>
              <span>{formatDate(tx.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{tx.cashierName}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-slate-400 py-2 space-y-1.5">
            {tx.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold text-slate-900">{item.product.name}</div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>
                    {item.quantity} x {formatCurrency(item.product.sellingPrice)}
                  </span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-1 text-xs space-y-1">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal:</span>
              <span>{formatCurrency(tx.subtotal)}</span>
            </div>
            {tx.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Diskon:</span>
                <span>-{formatCurrency(tx.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm border-t border-slate-900 pt-1">
              <span>TOTAL BELANJA:</span>
              <span>{formatCurrency(tx.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Bayar ({tx.paymentMethod}):</span>
              <span>{formatCurrency(tx.payAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900">
              <span>Kembalian:</span>
              <span>{formatCurrency(tx.changeAmount)}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-400 pt-2 whitespace-pre-line">
            {footerMessage}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={sendWhatsApp}
            className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-[4px_4px_10px_rgba(16,185,129,0.3)]"
          >
            <Send className="w-4 h-4" />
            <span>Kirim WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-3 bg-[#eef2f6] text-slate-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-[4px_4px_8px_#cbd2d9,-4px_-4px_8px_#ffffff]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
