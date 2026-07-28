export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
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
  return '899' + Math.floor(100000000 + Math.random() * 900000000).toString();
}
