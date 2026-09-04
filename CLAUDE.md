# kpi-cham — Ghi chú cho Claude

Trang web chấm điểm KPI. **Backend + nghiệp vụ nằm ở project `../TH-THCS-ChuVanAn-DLK`**
(Apps Script, sheet `CẤU HÌNH HỆ THỐNG` + 4 sheet chấm — folder này trước tên `KPI`,
đã đổi 2026-09-04 cho khớp tên repo GitHub). Đọc `../TH-THCS-ChuVanAn-DLK/AGENTS.md` và
`../TH-THCS-ChuVanAn-DLK/docs/kien-truc-va-canh-bao.md` trước khi đổi contract API.

## Ràng buộc

- FE tĩnh, **không framework** — giữ nhẹ. Không thêm dependency nếu không thật cần.
- Contract API = `src/types.ts` phải khớp `../TH-THCS-ChuVanAn-DLK/appscript/KPI_CHAM_TO.gs`
  (`doPost` router). Sửa 1 bên thì sửa bên kia.
- `api.ts` **không được đặt header `Content-Type`** — sẽ kích hoạt CORS preflight mà
  Apps Script không trả được. Body đi qua `text/plain` mặc định.
- Không commit `.env*` (chỉ `.env.example`). `VITE_*` là biến build, không phải secret
  (Client ID + URL Apps Script vốn công khai) nhưng vẫn nạp qua GitHub Actions Variables.
- Dữ liệu thật (tên/điểm cán bộ) KHÔNG bao giờ nằm trong repo này — chỉ ở Google Sheets.

## Kiểm tra trước khi commit

```bash
npm run build      # tsc + vite build, phải xanh
```

Không test được luồng thật ở local nếu Apps Script Web App chưa deploy.
