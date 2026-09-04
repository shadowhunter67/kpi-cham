import type { Nguoi } from "../types";

export type TrangThaiNguoi = "chua-bat-dau" | "dang-cham" | "du-chua-chot" | "da-chot";

export function trangThaiCuaNguoi(n: Nguoi): TrangThaiNguoi {
  if (n.daChot) return "da-chot";
  if (n.daCham <= 0) return "chua-bat-dau";
  if (n.daCham >= n.tongTieuChi) return "du-chua-chot";
  return "dang-cham";
}

export function moTaTrangThai(n: Nguoi): string {
  switch (trangThaiCuaNguoi(n)) {
    case "da-chot": return "🔒 Đã chốt";
    case "du-chua-chot": return `✓ Đã đủ ${n.daCham}/${n.tongTieuChi} · Chưa chốt`;
    case "dang-cham": return `Đang chấm · ${n.daCham}/${n.tongTieuChi}`;
    default: return `Chưa bắt đầu · 0/${n.tongTieuChi}`;
  }
}
