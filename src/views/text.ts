/** Bỏ tiền tố mã lặp trong nội dung ("HT-20 — Thực hiện…" → "Thực hiện…"). */
export function boNhan(ma: string, noiDung: string): string {
  const re = new RegExp(`^\\s*${ma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]\\s*`, "i");
  return noiDung.replace(re, "").trim() || noiDung;
}
