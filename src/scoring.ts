import { TRONG_SO } from "./config";
import type { PhieuResp } from "./types";

export interface TongHop {
  tuCham: number;
  toCham: number | null;
  toChamThieu: boolean;
  hoiDong: number | null;
  hoiDongTamTinh: boolean; // true khi chưa chốt (dùng điểm đề xuất)
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
    if (r.to.trungBinh == null) toThieu = true;
    return s + (r.to.trungBinh ?? 0);
  }, 0);

  const daChot = phieu.trangThai === "đã chốt";
  let hdThieu = false;
  const hoiDong = rows.reduce((s, r) => {
    const v = daChot ? r.hoiDong.chot : r.hoiDong.deXuat;
    if (v == null) hdThieu = true;
    return s + (v ?? 0);
  }, 0);

  const toOk = !toThieu ? toCham : null;
  const hdOk = !hdThieu ? hoiDong : null;

  let kpiCuoi: number | null = null;
  if (toOk != null && hdOk != null) {
    kpiCuoi =
      Math.round(
        (tuCham * TRONG_SO.tu + toOk * TRONG_SO.to + hdOk * TRONG_SO.hoiDong) * 100,
      ) / 100;
  }

  return {
    tuCham: Math.round(tuCham * 100) / 100,
    toCham: toOk,
    toChamThieu: toThieu,
    hoiDong: hdOk,
    hoiDongTamTinh: !daChot,
    kpiCuoi,
    xepLoai: kpiCuoi == null ? null : xepLoai(kpiCuoi),
  };
}
