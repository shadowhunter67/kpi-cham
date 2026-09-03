const url = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

if (!url || !clientId) {
  // Không throw — để main.ts hiện thông báo cấu hình thân thiện.
  console.warn("Thiếu VITE_APPS_SCRIPT_URL hoặc VITE_GOOGLE_CLIENT_ID");
}

export const CONFIG = {
  appsScriptUrl: url ?? "",
  googleClientId: clientId ?? "",
  isConfigured: Boolean(url && clientId),
};

// Trọng số quy chế (Điều 6). Xếp loại kèm điều kiện NĐ 233/2026 — web chỉ hiển thị "tạm tính".
export const TRONG_SO = { tu: 0.2, to: 0.3, hoiDong: 0.5 } as const;
