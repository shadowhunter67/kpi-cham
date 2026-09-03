# kpi-cham — Trang web chấm điểm KPI

Trang tĩnh (Vite + TypeScript thuần, không framework) cho **Tổ**, **Hội đồng** và
**Hiệu trưởng** chấm điểm KPI hằng tháng — Trường TH&THCS Chu Văn An.

- **Dữ liệu**: Google Sheets (không có DB riêng).
- **Backend**: Google Apps Script Web App = JSON API (`KPI/appscript/KPI_CHAM_TO.gs`
  trong repo `TH-THCS-ChuVanAn-DLK`). Trang này chỉ là giao diện.
- **Đăng nhập**: Google Identity Services (ID token). Gmail cá nhân dùng được;
  phân quyền dựa trên allowlist trong sheet (mục F "NGƯỜI CHẤM TỔ" + mục G "HỘI ĐỒNG").

## Luồng chấm (quy chế Điều 6)

| Lớp | Ai | Trọng số |
|---|---|---|
| Tự chấm | Cá nhân (Google Form) | 20% |
| Tổ chấm | 2 người/tổ, điểm = TB | 30% |
| Hội đồng | Thư ký nhập 1 bộ điểm (hội đồng đã họp) | tạo số 50% |
| Hiệu trưởng | Duyệt / ghi đè + lý do → chốt & khóa | quyết định số 50% |

Realtime, không có bước "gửi phiếu". Tổ vẫn sửa được sau khi Hiệu trưởng chốt
(điểm 50% giữ khóa).

## Chạy local

```bash
cp .env.example .env.local     # điền VITE_APPS_SCRIPT_URL + VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                    # http://localhost:5173
```

Phải thêm `http://localhost:5173` vào **Authorized JavaScript origins** của OAuth client
(không cần redirect URI — GIS dùng origin).

## Thiết lập một lần

### 1. Google Cloud — OAuth Client ID

1. Cùng GCP project với Apps Script. **APIs & Services → Credentials → Create
   credentials → OAuth client ID → Application type: Web application**.
2. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://<user>.github.io` (origin của GitHub Pages — KHÔNG kèm path)
3. **OAuth consent screen**: User type *External*, publishing status *In production*.
   Scope chỉ cần `openid`, `email`, `profile` (không nhạy cảm → không cần Google duyệt).
4. Copy **Client ID** → dùng cho cả `VITE_GOOGLE_CLIENT_ID` (repo này) và
   `KPI_CHAM_CLIENT_ID` (đầu file `KPI_CHAM_TO.gs`).

### 2. Apps Script — deploy Web App

1. Dán `KPI_CHAM_TO.gs` (đã điền `KPI_CHAM_CLIENT_ID`) + `KPI_HE_THONG.gs` vào editor,
   xoá file HTML cũ `KPI_CHAM_TO_FORM`.
2. Chạy menu **KPI → 🗳️ Khởi tạo sheet Hội đồng**, rồi điền email vào mục F/G
   (`CẤU HÌNH HỆ THỐNG`).
3. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy URL `…/exec` → `VITE_APPS_SCRIPT_URL`.

> Mỗi lần sửa code phải **Manage deployments → Edit → Version: New** để URL cũ cập nhật.

### 3. GitHub — repo + Pages

1. Repo **public** này, push nhánh `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables** (tab *Variables*, không phải Secrets):
   - `VITE_APPS_SCRIPT_URL`
   - `VITE_GOOGLE_CLIENT_ID`
4. Push → workflow `Deploy to GitHub Pages` build & deploy. URL:
   `https://<user>.github.io/<repo>/`.

## Kiểm thử

Xem mục *Verification* trong `../KPI` plan (`.claude/plans/agile-scribbling-harp.md`):
lần lượt đăng nhập bằng email ở mục F / mục G `thư ký` / `hiệu trưởng`, chấm thử 1 người,
đối chiếu 4 sheet `ĐIỂM CHẤM - TỔ` / `NHẬN XÉT - TỔ` / `ĐIỂM CHẤM - HỘI ĐỒNG` /
`NHẬN XÉT - HỘI ĐỒNG`.

## Cấu trúc

```
src/
├── config.ts       biến môi trường + trọng số quy chế
├── types.ts        contract API
├── api.ts          post(action,payload) — body text/plain né CORS preflight
├── auth.ts         GIS: đăng nhập, ID token, đăng nhập lại
├── scoring.ts      cộng dồn 3 lớp + KPI tạm tính + xếp loại
├── dom.ts          h() tạo phần tử, không framework
├── main.ts         điều phối màn hình theo vai trò
└── views/
    ├── picker.ts       chọn người (có lọc tổ/chức danh cho hội đồng)
    ├── scoreTable.ts   bảng 26 dòng, 4 chế độ: to | hoiDong | hieuTruong | xem
    └── summary.ts      dải tóm tắt điểm
```
