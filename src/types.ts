export type VaiTroHoiDong = "thư ký" | "hiệu trưởng" | "thành viên";

export interface VaiTro {
  to: string | null;
  slot: 1 | 2 | null;
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

export interface DiemTo {
  diem1: number | null;
  diem2: number | null;
  trungBinh: number | null;
}

export interface DiemHoiDong {
  deXuat: number | null;
  hieuTruong: number | null;
  chot: number | null;
}

export interface DongPhieu {
  ma: string;
  noiDung: string;
  diemToiDa: number;
  diemTuCham: number | null;
  to: DiemTo;
  hoiDong: DiemHoiDong;
}

export type TrangThai = "" | "đề xuất" | "đã chốt";

export interface PhieuResp {
  hoTen: string;
  chucDanh: string;
  to: string;
  ky: string;
  vaiTro: VaiTro;
  slotBanCham: 1 | 2 | null;
  trangThai: TrangThai;
  rows: DongPhieu[];
  nhanXet: {
    to: string;
    hoiDong: string;
    hieuTruong: string;
    lyDo: string;
  };
}

export interface DiemItem {
  ma: string;
  diem: number;
}
