import { TRONG_SO } from "./config";
import type { PhieuResp } from "./types";

export interface TongHop {
  tuCham: number;
  toCham: number | null;
  toThieu: boolean;
  hoiDong: number | null;
  hoiDongThieu: boolean;
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

  let toThieu = false;
  const toCham = rows.reduce((s, r) => {
    if (r.diemTo == null) toThieu = true;
    return s + (r.diemTo ?? 0);
  }, 0);

  let hdThieu = false;
  const hoiDong = rows.reduce((s, r) => {
    if (r.diemHoiDong == null) hdThieu = true;
    return s + (r.diemHoiDong ?? 0);
  }, 0);

  const toOk = toThieu ? null : toCham;
  const hdOk = hdThieu ? null : hoiDong;

  let kpiCuoi: number | null = null;
  if (toOk != null && hdOk != null) {
    kpiCuoi = Math.round(
      (tuCham * TRONG_SO.tu + toOk * TRONG_SO.to + hdOk * TRONG_SO.hoiDong) * 100,
    ) / 100;
  }

  return {
    tuCham: Math.round(tuCham * 100) / 100,
    toCham: toOk,
    toThieu,
    hoiDong: hdOk,
    hoiDongThieu: hdThieu,
    kpiCuoi,
    xepLoai: kpiCuoi == null ? null : xepLoai(kpiCuoi),
  };
}
