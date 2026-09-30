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
    return (
      new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d) + ' WIB'
    );
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
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return /^(08|\+628|628)[0-9]{8,12}$/.test(cleaned);
}

export function getDateStringWIB(isoOrDate: string | Date | number): string {
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

export function isTodayWIB(isoOrDate: string | Date | number): boolean {
  const dateStr = getDateStringWIB(isoOrDate);
  const todayStr = getDateStringWIB(new Date());
  return dateStr !== '' && dateStr === todayStr;
}

export function isEarlierThanTodayWIB(isoOrDate: string | Date | number): boolean {
  const dateStr = getDateStringWIB(isoOrDate);
  const todayStr = getDateStringWIB(new Date());
  return dateStr !== '' && dateStr < todayStr;
}

export function generateReferralCode(uid: string): string {
  const cleanUid = (uid || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = cleanUid.slice(0, 6) || Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AZG${suffix}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 3) return `${user.slice(0, 1)}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}
