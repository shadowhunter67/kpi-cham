import type { Nguoi } from "../types";

export type TrangThaiNguoi = "chua-bat-dau" | "dang-cham" | "du-chua-chot" | "da-chot";

export const CAC_TRANG_THAI: TrangThaiNguoi[] = ["chua-bat-dau", "dang-cham", "du-chua-chot", "da-chot"];

/** Nhận dạng chung {daCham, tongTieuChi, daChot} — dùng lại được cho trạng thái Tổ lẫn Hội đồng. */
function tinhTrangThai(daCham: number, tongTieuChi: number, daChot: boolean): TrangThaiNguoi {
  if (daChot) return "da-chot";
  if (daCham <= 0) return "chua-bat-dau";
  if (daCham >= tongTieuChi) return "du-chua-chot";
  return "dang-cham";
}

export function trangThaiCuaNguoi(n: Nguoi): TrangThaiNguoi {
  return tinhTrangThai(n.daCham, n.tongTieuChi, n.daChot);
}

/** Trạng thái CHẤM CỦA TỔ đối với người này — chỉ có khi đang xem với vai trò Hội đồng (xem `Nguoi.toDaCham`/`toDaChot`). */
export function trangThaiToCuaNguoi(n: Nguoi): TrangThaiNguoi | null {
  if (n.toDaCham == null || n.toDaChot == null) return null;
  return tinhTrangThai(n.toDaCham, n.tongTieuChi, n.toDaChot);
}

export function nhanTrangThai(t: TrangThaiNguoi): string {
  switch (t) {
    case "da-chot": return "Đã chốt";
    case "du-chua-chot": return "Đã đủ điểm · Chưa chốt";
    case "dang-cham": return "Đang chấm";
    case "chua-bat-dau": return "Chưa bắt đầu";
  }
}

/** Nhãn nút hành động phù hợp cho từng trạng thái, hiện trên danh sách Tổng quan. */
export function nhanHanhDong(t: TrangThaiNguoi): string {
  switch (t) {
    case "chua-bat-dau": return "Chấm ngay";
    case "dang-cham": return "Tiếp tục chấm";
    case "du-chua-chot": return "Xem & chỉnh sửa";
    case "da-chot": return "Xem kết quả";
  }
}
