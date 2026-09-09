# kpi-cham — Trang web chấm điểm KPI

Trang web tĩnh (Vite + TypeScript, không framework) để **Tổ** và **Hội đồng**
chấm điểm KPI hằng tháng — Trường TH&THCS Chu Văn An.

- Dữ liệu ở **Google Sheets**, không có database riêng.
- Backend là **Google Apps Script Web App** (JSON API) trong repo
  [`TH-THCS-ChuVanAn-DLK`](https://github.com/shadowhunter67/TH-THCS-ChuVanAn-DLK)
  — file `appscript/KPI_CHAM_TO.gs`. Trang này chỉ là giao diện.
- Đăng nhập bằng **tài khoản Google**. Ai được chấm gì lấy từ 2 mục trong
  sheet `CẤU HÌNH HỆ THỐNG`:
  - **Mục F** — email Tổ trưởng / Tổ phó của từng tổ.
  - **Mục G** — email Hội đồng.

## Cách chấm (quy chế Điều 6)

| Lớp | Ai nhập | Trọng số |
|---|---|---|
| Tự chấm | Cá nhân, qua Google Form | 20% |
| Tổ chấm | Tổ trưởng. Riêng phiếu của Tổ trưởng do Tổ phó chấm | 30% |
| Hội đồng | Một người trong mục G | 50% |

Mỗi lớp có nút **Lưu** và **Chốt & khóa** (chốt xong khóa lại, có **Mở lại**).
Hội đồng chỉ chấm được sau khi Tổ đã chốt. Chốt xong, điểm tự đồng bộ lên
phiếu in trong Google Sheets.

## Chạy ở máy

```bash
cp .env.example .env.local     # điền VITE_APPS_SCRIPT_URL + VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                    # http://localhost:5173
```

## Deploy

Push lên nhánh `main` → GitHub Actions tự build và đăng lên GitHub Pages:
<https://shadowhunter67.github.io/kpi-cham/>

Hai biến `VITE_APPS_SCRIPT_URL` và `VITE_GOOGLE_CLIENT_ID` khai ở
**Settings → Secrets and variables → Actions → Variables**.

Khi sửa code Apps Script, phải tạo **deployment version mới** thì URL cũ mới
cập nhật.

## Cấu trúc code

```
src/
├── api.ts        gọi API (body text/plain để né CORS preflight)
├── auth.ts       đăng nhập Google, lấy ID token
├── scoring.ts    cộng dồn 3 lớp → điểm KPI + xếp loại
├── config.ts     biến môi trường + trọng số
├── types.ts      kiểu dữ liệu API — phải khớp KPI_CHAM_TO.gs
├── dom.ts        h() tạo phần tử (không framework)
├── main.ts       điều phối màn hình
└── views/        overview · scoreTable · sidebarSummary · personHeader · ...
```

Kiểm tra trước khi push: `npm run build` phải xanh.
