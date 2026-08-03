import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportPdfItem {
  barcode: string;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
}

export interface ReportPdfMovement {
  createdAt: string;
  type: 'CASH_IN' | 'EXPENSE_OUT' | 'OWNER_DRAW';
  category: string;
  description: string;
  createdBy: string;
  amount: number;
}

export interface ReportPdfStockRow {
  name: string;
  stock: number;
  minStock: number;
  status: 'LOW' | 'EXPIRED';
}

export interface ReportPdfData {
  store: { name: string; address: string; phone: string; logoUrl?: string };
  filterLabel: string;
  generatedAt: string;
  operatorName: string;
  summary: {
    revenue: number;
    cashSales: number;
    nonCashSales: number;
    grossProfit: number;
    expenses: number;
    ownerDraw: number;
    netProfit: number;
    txCount: number;
    itemsSoldQty: number;
    availableCash: number;
    shiftLabel?: string;
    shiftExpectedCash?: number;
  };
  items: ReportPdfItem[];
  movements: ReportPdfMovement[];
  stockWarnings: ReportPdfStockRow[];
}

// jsPDF font bawaan hanya Latin-1 — sanitasi karakter non-Latin
function sanitize(s: any): string {
  return String(s ?? '')
    .replace(/—|–/g, '-')
    .replace(/•/g, '-')
    .replace(/✓/g, 'OK')
    .replace(/✗/g, 'X')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/“|”|"/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/…/g, '...');
}

function fmtRp(n: any): string {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
}

function fmtDate(iso: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return sanitize(iso);
  }
}

async function loadImageDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read error'));
      reader.readAsDataURL(blob);
    });
    const dim = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });
    if (dim.width <= 0) return null;
    return { dataUrl, width: dim.width, height: dim.height };
  } catch (e) {
    console.warn('Logo load error:', e);
    return null;
  }
}

export async function generateReportPdf(data: ReportPdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 12; // margin mm
  const pageW = 210;
  let y = M;

  const primary: [number, number, number] = [5, 150, 105]; // emerald-ish
  const dark: [number, number, number] = [30, 41, 59];

  // ---- Header ----
  let logo: { dataUrl: string; width: number; height: number } | null = null;
  if (data.store.logoUrl) {
    logo = await loadImageDataUrl(data.store.logoUrl);
  }

  if (logo) {
    const box = 20;
    const scale = Math.min(box / logo.width, box / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    try {
      doc.addImage(logo.dataUrl, 'PNG', M, y, w, h);
    } catch (e) {
      logo = null;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...dark);
  doc.text(sanitize(data.store.name || 'Laporan Toko'), M + (logo ? 24 : 0), y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  if (data.store.address) {
    doc.text(sanitize(data.store.address), M + (logo ? 24 : 0), y + 13);
  }
  if (data.store.phone) {
    doc.text('Tel: ' + sanitize(data.store.phone), M + (logo ? 24 : 0), y + 17);
  }

  y += 24;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.6);
  doc.line(M, y, pageW - M, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.text('LAPORAN FINANCIAL AUDIT', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text('Periode: ' + sanitize(data.filterLabel), M, y);
  doc.text('Dicetak: ' + fmtDate(data.generatedAt), pageW - M, y, { align: 'right' });
  y += 4;
  doc.text('Operator: ' + sanitize(data.operatorName || '-'), M, y);
  y += 6;

  // ---- Ringkasan Keuangan ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text('1. RINGKASAN KEUANGAN', M, y);
  y += 2;

  const summaryRows: (string | number)[][] = [
    ['Total Omset Penjualan (Kotor)', fmtRp(data.summary.revenue)],
    ['Penjualan Tunai (Cash)', fmtRp(data.summary.cashSales)],
    ['Penjualan Non-tunai (QRIS/Transfer)', fmtRp(data.summary.nonCashSales)],
    ['Laba Kotor Penjualan', fmtRp(data.summary.grossProfit)],
    ['Beban Operasional (Kas Keluar)', fmtRp(data.summary.expenses)],
    ['Penarikan Owner', fmtRp(data.summary.ownerDraw)],
    ['Laba Bersih Operasional', fmtRp(data.summary.netProfit)],
    ['Jumlah Transaksi', String(data.summary.txCount)],
    ['Unit Barang Keluar Terjual', String(data.summary.itemsSoldQty)],
    ['KAS TERSEDIA (Laci)', fmtRp(data.summary.availableCash)]
  ];
  if (data.summary.shiftLabel && data.summary.shiftExpectedCash !== undefined) {
    summaryRows.push([`Expected Closing Cash - ${data.summary.shiftLabel}`, fmtRp(data.summary.shiftExpectedCash)]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Metrik', 'Nilai']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: primary, fontSize: 9, halign: 'left' },
    styles: { fontSize: 9, cellPadding: 1.8, textColor: dark },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---- Rincian SKU Keluar ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text('2. RINCIAN BARANG KELUAR / TERJUAL PER SKU', M, y);
  y += 2;
  if (data.items.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Tidak ada data penjualan pada periode ini.', M, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Barcode', 'Produk', 'Kategori', 'Qty', 'Revenue', 'Modal', 'Margin']],
      body: data.items.map((i) => [
        sanitize(i.barcode || '-'),
        sanitize(i.name),
        sanitize(i.category || '-'),
        String(i.qty),
        fmtRp(i.revenue),
        fmtRp(i.cost),
        fmtRp(i.margin)
      ]),
      theme: 'grid',
      headStyles: { fillColor: dark, fontSize: 8, halign: 'left' },
      styles: { fontSize: 8, cellPadding: 1.5, textColor: dark },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      didParseCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 6) {
          const val = hook.cell.raw;
          const marginColor: [number, number, number] = Number(String(val).replace(/[^0-9-]/g, '')) < 0 ? [220, 38, 38] : [22, 163, 74];
          hook.cell.styles.textColor = marginColor;
        }
      }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---- Arus Kas ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text('3. ARUS KAS', M, y);
  y += 2;
  if (data.movements.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Tidak ada pencatatan kas pada periode ini.', M, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Oleh', 'Jumlah']],
      body: data.movements.map((m) => [
        fmtDate(m.createdAt),
        m.type === 'CASH_IN' ? 'Kas Masuk' : m.type === 'OWNER_DRAW' ? 'Penarikan Owner' : 'Pengeluaran',
        sanitize(m.category),
        sanitize(m.description || '-'),
        sanitize(m.createdBy || '-'),
        (m.type === 'CASH_IN' ? '+' : '-') + fmtRp(m.amount)
      ]),
      theme: 'grid',
      headStyles: { fillColor: dark, fontSize: 8, halign: 'left' },
      styles: { fontSize: 8, cellPadding: 1.5, textColor: dark },
      columnStyles: { 5: { halign: 'right' } }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---- Peringatan Stok ----
  if (data.stockWarnings.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primary);
    doc.text('4. PERINGATAN STOK', M, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Produk', 'Stok', 'Min. Stok', 'Status']],
      body: data.stockWarnings.map((s) => [
        sanitize(s.name),
        String(s.stock),
        String(s.minStock),
        s.status === 'EXPIRED' ? 'Mendekati Expired' : 'Stok Menipis'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] as [number, number, number], fontSize: 8, halign: 'left' },
      styles: { fontSize: 8, cellPadding: 1.5, textColor: dark }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---- Tanda Tangan ----
  let sigY = Math.max(y + 10, 265);
  if (sigY > 275) {
    doc.addPage();
    sigY = 30;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  const colW = (pageW - M * 2) / 3;
  const names = ['Kasir', 'Manager', 'Owner'];
  const cols = [0, 1, 2].map((i) => M + i * colW);
  cols.forEach((x, i) => {
    doc.text(names[i], x + colW / 2, sigY, { align: 'center' });
    doc.line(x + colW * 0.15, sigY + 30, x + colW * 0.85, sigY + 30);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text('(.....................)', x + colW / 2, sigY + 34, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(...dark);
  });

  // ---- Footer halaman ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text('Dicetak dari NMC Mart POS', M, 292);
    doc.text(`Halaman ${i} / ${totalPages}`, pageW - M, 292, { align: 'right' });
  }

  const safeName = sanitize(data.store.name || 'toko').replace(/[^a-zA-Z0-9-]+/g, '-').slice(0, 30);
  doc.save(`laporan-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
