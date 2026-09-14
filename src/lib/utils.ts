/**
 * Utility functions for Freelancer Storan
 */

export function formatRupiah(number: number): string {
  if (isNaN(number) || number === null || number === undefined) {
    return 'Rp0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatIndonesianDateTime(isoOrDate: string | Date | number): string {
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d) + ' WIB';
  } catch {
    return '-';
  }
}

export function formatRelativeTime(isoOrDate: string | Date | number): string {
  try {
    const d = new Date(isoOrDate);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari lalu`;
    return formatIndonesianDateTime(d);
  } catch {
    return '-';
  }
}

export function isValidPhoneNumber(phone: string): boolean {
  // Indonesian phone numbers usually start with 08 or +628 or 628, 9-14 digits
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return /^(08|\+628|628)[0-9]{8,12}$/.test(cleaned);
}
