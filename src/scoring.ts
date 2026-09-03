import { TRONG_SO } from "./config";
import type { PhieuResp } from "./types";

export interface TongHop {
  tuCham: number;
  toCham: number;
  toThieu: boolean; // còn thiếu ít nhất 1 tiêu chí (không đủ điều kiện tính KPI cuối)
  toChua: boolean; // chưa chấm tiêu chí nào cả
  hoiDong: number;
  hoiDongThieu: boolean;
  hoiDongChua: boolean;
  kpiCuoi: number | null;
  xepLoai: string | null;
}

function xepLoai(diem: number): string {
  if (diem >= 90) return "Hoàn thành xuất sắc";
  if (diem >= 70) return "Hoàn thành tốt";
  if (diem >= 50) return "Hoàn thành";
  return "Không hoàn thành";
}

/** Cộng dồn điểm từng lớp và tính KPI tạm tính (Điều 6 quy chế). */
export function tongHop(phieu: PhieuResp): TongHop {
  const rows = phieu.rows;

  const tuCham = rows.reduce((s, r) => s + (r.diemTuCham ?? 0), 0);

  let toDaCham = 0;
  const toCham = rows.reduce((s, r) => {
    if (r.diemTo != null) toDaCham++;
    return s + (r.diemTo ?? 0);
  }, 0);
  const toThieu = toDaCham < rows.length;
  const toChua = toDaCham === 0;

  let hdDaCham = 0;
  const hoiDong = rows.reduce((s, r) => {
    if (r.diemHoiDong != null) hdDaCham++;
    return s + (r.diemHoiDong ?? 0);
  }, 0);
  const hoiDongThieu = hdDaCham < rows.length;
  const hoiDongChua = hdDaCham === 0;

  let kpiCuoi: number | null = null;
  if (!toThieu && !hoiDongThieu) {
    kpiCuoi = Math.round(
      (tuCham * TRONG_SO.tu + toCham * TRONG_SO.to + hoiDong * TRONG_SO.hoiDong) * 100,
    ) / 100;
  }

  return {
    tuCham: Math.round(tuCham * 100) / 100,
    toCham: Math.round(toCham * 100) / 100,
    toThieu,
    toChua,
    hoiDong: Math.round(hoiDong * 100) / 100,
    hoiDongThieu,
    hoiDongChua,
    kpiCuoi,
    xepLoai: kpiCuoi == null ? null : xepLoai(kpiCuoi),
  };
}
