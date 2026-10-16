export function fmtDate(d?: string | null, lang = 'en', opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!d) return '';
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  try { return dt.toLocaleDateString(lang === 'si' ? 'si-LK' : 'en-GB', opts); } catch { return d; }
}
export function money(n?: number | null, cur = 'LKR') { return n == null ? '' : `${cur} ${Math.round(n).toLocaleString('en-US')}`; }
