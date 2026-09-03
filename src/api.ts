import { CONFIG } from "./config";
import { getToken } from "./auth";
import type { KhoiTaoResp, PhieuResp, DiemItem } from "./types";

export class ApiError extends Error {
  readonly canhBaoDangNhap: boolean;
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
    this.canhBaoDangNhap = /đăng nhập lại|hết hạn|không hợp lệ.*token|thiếu token/i.test(message);
  }
}

async function post<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new ApiError("Chưa đăng nhập. Hãy đăng nhập bằng Google.");

  let res: Response;
  try {
    // KHÔNG đặt header Content-Type → trình duyệt gửi text/plain → không có
    // CORS preflight (Apps Script không trả OPTIONS được).
    res = await fetch(CONFIG.appsScriptUrl, {
      method: "POST",
      body: JSON.stringify({ token, action, payload }),
      redirect: "follow",
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError("Máy chủ trả về dữ liệu không đọc được.");
  }

  if (data && typeof data === "object" && "loi" in data) {
    throw new ApiError(String((data as { loi: unknown }).loi));
  }
  return data as T;
}

type LuuPayload = {
  hoTen: string;
  chucDanh: string;
  to: string;
  diem: DiemItem[];
  nhanXet: string;
};
type NguoiPayload = { hoTen: string; chucDanh: string; to: string };

export const api = {
  khoiTao: () => post<KhoiTaoResp>("khoiTao"),

  layPhieu: (hoTen: string, chucDanh: string, to: string) =>
    post<PhieuResp>("layPhieu", { hoTen, chucDanh, to }),

  luuDiemTo: (p: LuuPayload) => post<{ ok: true }>("luuDiemTo", p),
  chotTo: (p: LuuPayload) => post<{ ok: true }>("chotTo", p),
  moLaiTo: (p: NguoiPayload) => post<{ ok: true }>("moLaiTo", p),

  luuDiemHoiDong: (p: LuuPayload) => post<{ ok: true }>("luuDiemHoiDong", p),
  chotHoiDong: (p: LuuPayload) => post<{ ok: true }>("chotHoiDong", p),
  moLaiHoiDong: (p: NguoiPayload) => post<{ ok: true }>("moLaiHoiDong", p),
};
