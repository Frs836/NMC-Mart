export function formatCurrency(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'short'
    }).format(d);
  } catch {
    return dateString;
  }
}

export function generateWhatsAppReceiptUrl(phone: string, storeName: string, receiptText: string): string {
  // Clean phone number format
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  const encodedText = encodeURIComponent(receiptText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

export function generateBarcode(): string {
  const digits = '899' + Math.floor(100000000 + Math.random() * 900000000).toString();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}

export function isValidEAN13(code: string): boolean {
  const c = String(code || '').trim();
  if (!/^\d{13}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(c[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(c[12]);
}

export function isSameLocalDay(dateStr: string, targetDate: Date): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === targetDate.getFullYear() &&
      d.getMonth() === targetDate.getMonth() &&
      d.getDate() === targetDate.getDate()
    );
  } catch {
    return false;
  }
}

export function isSameLocalMonth(dateStr: string, targetDate: Date): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
  } catch {
    return false;
  }
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
