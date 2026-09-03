export type VaiTroHoiDong = "hiệu trưởng" | "thành viên";
export type ToChucVu = "trưởng" | "phó";

export interface VaiTro {
  to: string | null;
  toChucVu: ToChucVu | null;
  hoiDong: VaiTroHoiDong | null;
}

export interface Nguoi {
  hoTen: string;
  chucDanh: string;
  to: string;
}

export interface KhoiTaoResp {
  email: string;
  ky: string;
  vaiTro: VaiTro;
  nguoiDuocCham: Nguoi[];
}

export interface DongPhieu {
  ma: string;
  noiDung: string;
  diemToiDa: number;
  diemTuCham: number | null;
  diemTo: number | null;
  diemHoiDong: number | null;
}

export type TrangThai = "" | "đã chốt";

export interface PhieuResp {
  hoTen: string;
  chucDanh: string;
  to: string;
  ky: string;
  vaiTro: VaiTro;
  quyen: { laNguoiChamTo: boolean; laHieuTruong: boolean };
  canEdit: { to: boolean; hoiDong: boolean };
  trangThai: { to: TrangThai; hoiDong: TrangThai };
  rows: DongPhieu[];
  nhanXet: { to: string; hoiDong: string };
}

export interface DiemItem {
  ma: string;
  diem: number;
}
