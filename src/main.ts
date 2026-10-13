import "./styles.css";
import { CONFIG, TEN_TRUONG } from "./config";
import { h, mount, openModal } from "./dom";
import { initAuth, renderSignInButton, clearToken } from "./auth";
import { api, ApiError } from "./api";
import { renderOverview } from "./views/overview";
import { renderScoreTable, laneCua, diemHienCo, type ScoreTableHandle } from "./views/scoreTable";
import { renderSidebarSummary } from "./views/sidebarSummary";
import { tongHop } from "./scoring";
import { renderPersonHeader } from "./views/personHeader";
import { icon, avatar, type IconName } from "./views/icons";
import { trangThaiCuaNguoi, type TrangThaiNguoi } from "./views/nguoiTrangThai";
import type { KhoiTaoResp, Nguoi, PhieuResp, VaiTro } from "./types";

let phien: KhoiTaoResp | null = null;
let dangChon: Nguoi | null = null;
/** Handle của form đang mở (nếu có) — dùng để hỏi "còn thay đổi chưa lưu" trước khi điều hướng đi nơi khác. */
let scoreHandle: ScoreTableHandle | null = null;

function moTaVaiTro(v: VaiTro): string {
  const phan: string[] = [];
  if (v.to) phan.push(`${v.to} — Tổ ${v.toChucVu}`);
  if (v.hoiDong) phan.push("Hội đồng");
  return phan.join(" · ") || "Chưa có vai trò";
}

function screen(...children: (Node | string | false | null | undefined)[]): HTMLElement {
  return khung(false, ...children);
}

/** Khung chung sau đăng nhập: dải đầu trang (logo + tên trường), tuỳ chọn nút Đăng xuất ở góc phải. */
function khung(coDangXuat: boolean, ...children: (Node | string | false | null | undefined)[]): HTMLElement {
  return h("main", { class: "screen" },
    h("header", { class: "app-bar" },
      logoTile("app-logo"),
      h("div", {},
        h("h1", {}, "Chấm điểm KPI"),
        h("p", { class: "app-sub" }, TEN_TRUONG),
        h("p", { class: "app-sub2" }, "Hệ thống chấm điểm KPI nội bộ"),
      ),
      coDangXuat && nutDangXuat("btn-ghost btn-logout app-logout"),
    ),
    ...children,
  );
}

function nutDangXuat(cls: string): HTMLElement {
  return h("button", { class: cls, type: "button", onclick: () => dieuHuongAnToan(dangXuat) }, icon("logout", 20), "Đăng xuất");
}

function showConfigError() {
  mount(screen(
    h("div", { class: "card loi-box" },
      h("h2", {}, "Chưa cấu hình"),
      h("p", {}, "Thiếu VITE_APPS_SCRIPT_URL hoặc VITE_GOOGLE_CLIENT_ID. Xem README."),
    ),
  ));
}

/** Biểu tượng nhỏ (mũ cử nhân) — SVG tĩnh, không phụ thuộc ảnh ngoài. */
const LOGO_SVG =
  '<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false">' +
  '<polygon points="24,11 43,20 24,29 5,20" fill="#0B5EA8"/>' +
  '<path d="M13 26v7c0 2.6 5.1 5 11 5s11-2.4 11-5v-7l-11 5.2z" fill="#0B5EA8" fill-opacity="0.85"/>' +
  '<path d="M41 21.5v10" stroke="#0B5EA8" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
  "</svg>";

function logoTile(cls: string): HTMLElement {
  const el = h("span", { class: cls });
  el.innerHTML = LOGO_SVG;
  return el;
}

/** Trang đăng nhập: hai cột (giới thiệu | thẻ đăng nhập) trên máy tính, xếp dọc trên điện thoại. */
function showSignIn() {
  const btnBox = h("div", { class: "login-gsi" });
  const feature = (ic: IconName, tone: string, title: string, desc: string) =>
    h("li", { class: "login-feature" },
      h("span", { class: `login-feature-ico ${tone}` }, icon(ic)),
      h("b", {}, title),
      h("span", {}, desc),
    );

  mount(h("div", { class: "login-page" },
    h("main", { class: "login-main" },
      h("section", { class: "login-intro" },
        h("header", { class: "login-head" },
          logoTile("login-logo"),
          h("div", {},
            h("h1", {}, "Chấm điểm KPI"),
            h("p", { class: "login-school" }, TEN_TRUONG),
            h("p", { class: "login-place" }, "Xã Ea Drông, tỉnh Đắk Lắk"),
          ),
        ),
        h("hr", { class: "login-rule" }),
        h("p", { class: "login-lead" },
          "Hệ thống chấm điểm KPI phục vụ công tác đánh giá, quản lý và phát triển chất lượng giáo dục trong nhà trường."),
        h("ul", { class: "login-features" },
          feature("shield", "xanh", "Bảo mật an toàn", "Sử dụng tài khoản Google do nhà trường cấp quyền"),
          feature("users", "luc", "Dành cho cán bộ", "Chỉ tài khoản được phân quyền mới truy cập"),
          feature("chart", "tim", "Hỗ trợ công tác quản lý", "Đánh giá KPI minh bạch, hiệu quả, hiện đại"),
        ),
      ),
      h("section", { class: "login-card", "aria-labelledby": "login-title" },
        logoTile("login-card-logo"),
        h("h2", { id: "login-title" }, "Đăng nhập hệ thống"),
        h("p", { class: "login-desc" },
          "Sử dụng tài khoản Google đã được nhà trường cấp quyền để truy cập hệ thống chấm điểm KPI."),
        btnBox,
        h("p", { class: "login-note" }, icon("lock", 20),
          h("span", {}, "Chỉ tài khoản đã được phân quyền mới có thể truy cập hệ thống.")),
        h("p", { class: "login-note login-support" }, icon("help", 20),
          h("span", {}, "Nếu không đăng nhập được, vui lòng liên hệ quản trị viên nhà trường.")),
      ),
    ),
    h("footer", { class: "login-foot" }, `Hệ thống chấm điểm KPI nội bộ · ${TEN_TRUONG}`),
  ));
  renderSignInButton(btnBox);
}

async function onSignedIn() {
  mount(screen(h("div", { class: "card" }, h("p", {}, "Đang tải…"))));
  try {
    phien = await api.khoiTao();
    renderTongQuan();
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err);
    mount(screen(
      h("div", { class: "card loi-box" }, h("p", {}, msg),
        h("button", { class: "btn-ghost", type: "button", onclick: dangXuat }, "Đăng nhập lại")),
    ));
  }
}

function dangXuat() {
  clearToken();
  phien = null;
  dangChon = null;
  scoreHandle = null;
  showSignIn();
}

/**
 * Điều hướng có bảo vệ: nếu form đang mở có thay đổi chưa lưu, hỏi trước
 * khi rời màn hình thay vì âm thầm làm mất điểm vừa nhập.
 */
function dieuHuongAnToan(diChuyen: () => void) {
  if (!scoreHandle || !scoreHandle.isDirty()) {
    diChuyen();
    return;
  }

  const handle = scoreHandle;
  const errBox = h("p", { class: "save-feedback loi" });
  const btnOLai = h("button", { class: "btn-ghost", type: "button" }, "Ở lại");
  const btnBo = h("button", { class: "btn-ghost", type: "button" }, "Bỏ thay đổi");
  const btnLuu = h("button", { class: "btn-primary", type: "button" }, "Lưu và tiếp tục") as HTMLButtonElement;

  const body = h("div", {},
    h("p", {}, "Nếu chuyển sang người khác lúc này, các thay đổi chưa lưu có thể bị mất."),
    errBox,
    h("div", { class: "modal-actions" }, btnOLai, btnBo, btnLuu),
  );

  const modal = openModal("Bạn có thay đổi chưa lưu", body);
  btnOLai.addEventListener("click", modal.close);
  btnBo.addEventListener("click", () => { modal.close(); diChuyen(); });
  btnLuu.addEventListener("click", () => {
    btnOLai.disabled = true;
    btnBo.disabled = true;
    btnLuu.disabled = true;
    errBox.textContent = "";
    void handle.luuNhap().then((ket) => {
      if (ket.ok) {
        modal.close();
        diChuyen();
      } else {
        btnOLai.disabled = false;
        btnBo.disabled = false;
        btnLuu.disabled = false;
        errBox.textContent = ket.error;
      }
    });
  });
}

/** Quay lại Tổng quan — tải lại danh sách để phản ánh đúng tiến độ mới nhất sau khi chấm.
 * Giữ đúng kỳ đang xem (quan trọng với Hội đồng) — không để nhảy sang kỳ mặc định khác. */
async function quayLaiTongQuan() {
  dangChon = null;
  scoreHandle = null;
  renderTongQuan();
  try {
    phien = await api.khoiTao(phien?.ky);
    renderTongQuan();
  } catch {
    // Giữ nguyên dữ liệu cũ nếu tải lại lỗi — không chặn người dùng ở màn hình tổng quan.
  }
}

/** Hội đồng đổi kỳ đang xem qua dropdown — tải lại danh sách người cần chấm của kỳ mới. */
async function doiKy(kyMoi: string) {
  dangChon = null;
  scoreHandle = null;
  try {
    phien = await api.khoiTao(kyMoi);
    renderTongQuan();
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err);
    mount(screen(h("div", { class: "card loi-box" }, h("p", {}, msg))));
  }
}

/**
 * Người tiếp theo nên chấm — ưu tiên người còn việc dở trước (đang
 * chấm), rồi người chưa đụng tới, rồi người đã đủ điểm nhưng chưa
 * chốt; KHÔNG tự nhảy sang người đã chốt xong nếu vẫn còn ai chưa xong.
 */
function nguoiTiepTheoUuTien(): Nguoi | null {
  if (!phien || !dangChon) return null;
  const conLai = phien.nguoiDuocCham.filter((n) =>
    !(n.hoTen === dangChon!.hoTen && n.chucDanh === dangChon!.chucDanh && n.to === dangChon!.to),
  );
  const thuTuUuTien: TrangThaiNguoi[] = ["dang-cham", "chua-bat-dau", "du-chua-chot"];
  for (const t of thuTuUuTien) {
    const found = conLai.find((n) => trangThaiCuaNguoi(n) === t);
    if (found) return found;
  }
  return null;
}

function renderKyBlock() {
  if (!phien) return null;
  const ds = phien.dsKyHoiDong;
  if (!phien.vaiTro.hoiDong || !ds || ds.length <= 1) {
    return h("div", { class: "ident-ky" }, icon("calendar", 20), `Kỳ đánh giá: ${phien.ky}`);
  }

  const select = h("select", { class: "ky-select" },
    ...ds.map((k) => h("option", { value: k.ky, selected: k.ky === phien!.ky }, `Kỳ ${k.ky}${k.xong ? " — đã xong" : ""}`)),
  ) as HTMLSelectElement;
  select.addEventListener("change", () => void doiKy(select.value));

  return h("div", { class: "ident-ky" }, icon("calendar", 20), "Kỳ đánh giá: ", select);
}

function renderTongQuan() {
  if (!phien) return;
  mount(screen(
    h("div", { class: "card ident-block" },
      avatar(phien.email, "avatar-lg"),
      h("div", { class: "ident-info" },
        h("div", { class: "ident-email" }, phien.email),
        h("div", { class: "ident-role" }, icon("users", 20), moTaVaiTro(phien.vaiTro)),
        renderKyBlock(),
      ),
      nutDangXuat("btn-ghost btn-logout"),
    ),
    phien.nguoiDuocCham.length === 0
      ? h("div", { class: "card muc-note warn" }, "Chưa có ai nộp Form trong kỳ này (hoặc chưa tới kỳ chấm).")
      : h("div", { class: "card" },
        h("h2", { class: "section-title" }, h("span", { class: "section-ico" }, icon("chart", 22)), "Tổng quan chấm KPI"),
        renderOverview(phien.nguoiDuocCham, (n) => void moPhieuChiTiet(n), phien.ky),
      ),
  ));
}

type TrangThaiTaiPhieu =
  | { kind: "loading" }
  | { kind: "error"; msg: string }
  | { kind: "ready"; phieu: PhieuResp };

/**
 * Màn hình chấm chi tiết — TÁCH RIÊNG khỏi Tổng quan, không nhét thêm
 * thống kê/dashboard ở đây. Có 3 trạng thái tải rõ ràng: loading (chỉ
 * hiện text tải, KHÔNG render nav/sidebar/form để khỏi trông như lỗi
 * do nav xuất hiện 2 lần quanh 1 dòng "đang tải"), error (thử lại +
 * quay lại), ready (form đầy đủ + nav đầu/cuối).
 */
function renderManHinhChiTiet(trang: TrangThaiTaiPhieu) {
  if (!phien || !dangChon) return;

  if (trang.kind === "loading") {
    mount(screen(
      h("div", { class: "card" }, h("p", {}, "Đang tải phiếu đánh giá…")),
    ));
    return;
  }

  if (trang.kind === "error") {
    mount(screen(
      h("div", { class: "card loi-box" },
        h("h2", {}, "Không thể tải phiếu đánh giá."),
        h("p", {}, trang.msg),
        h("div", { class: "actions" },
          h("button", { class: "btn-secondary", type: "button", onclick: () => void moPhieuChiTiet(dangChon!) }, "Thử lại"),
          h("button", { class: "btn-ghost", type: "button", onclick: () => void quayLaiTongQuan() }, "Quay lại tổng quan"),
        ),
      ),
    ));
    return;
  }

  const phieu = trang.phieu;
  const lane = laneCua(phieu);
  const tongTieuChi = phieu.rows.length;
  const daChamBanDau = phieu.rows.filter((r) => diemHienCo(lane, r) != null).length;

  // position: sticky (không phải fixed) — tự dán đúng lúc khi cuộn qua
  // khỏi header, không cần JS tính toán khoảng trống bù (né lỗi
  // scroll-anchoring của Chrome khi đổi layout giữa lúc đang cuộn).
  const stickyProgress = h("span", {}, `Đã chấm ${daChamBanDau} / ${tongTieuChi} tiêu chí`);
  const stickyScore = h("span", { class: "sticky-eval-score" });
  const stickyBar = h("div", { class: "sticky-eval-bar" },
    h("strong", {}, `${phieu.hoTen} · Kỳ ${phieu.ky}`),
    h("span", { class: "sticky-eval-right" }, stickyProgress, stickyScore),
  );

  /** Điểm tổng KPI + xếp loại trên thanh sticky — hiện ngay khi đủ dữ liệu
   * cả 2 lớp (kể cả điểm đang gõ chưa Lưu, khi đó thêm chữ "tạm tính"). */
  const capNhatStickyScore = (nguon: PhieuResp, tamTinh: boolean) => {
    const t = tongHop(nguon);
    if (t.kpiCuoi == null) { stickyScore.textContent = ""; return; }
    stickyScore.textContent =
      `Điểm KPI${tamTinh ? " tạm tính" : ""}: ${t.kpiCuoi} / 100 · ${t.xepLoai ?? ""}`;
  };
  capNhatStickyScore(phieu, false);

  const personHeader = renderPersonHeader(phieu);
  const sidebarWrap = h("div", { class: "kpi-sidebar" }, renderSidebarSummary(phieu));

  const onSaved = () => void moPhieuChiTiet(dangChon!);
  const onDraftSaved = (phieuMoi: PhieuResp) => {
    // Lưu nháp KHÔNG tải lại cả màn hình — chỉ vẽ lại sidebar tại chỗ từ
    // dữ liệu vừa được scoreTable cập nhật tại chỗ (xem ghi chú trong
    // scoreTable.ts) để tránh mất dữ liệu do đọc-ngay-sau-ghi bị trễ.
    sidebarWrap.replaceChildren(renderSidebarSummary(phieuMoi));
    capNhatStickyScore(phieuMoi, false);
  };
  const onLive = (phieuTamTinh: PhieuResp) => {
    // Điểm đang gõ (chưa Lưu) — vẽ lại sidebar + thanh sticky với nhãn
    // "tạm tính" để người chấm thấy ngay điểm tổng + xếp loại khi vừa
    // nhập đủ 26 tiêu chí.
    sidebarWrap.replaceChildren(renderSidebarSummary(phieuTamTinh, true));
    capNhatStickyScore(phieuTamTinh, true);
  };
  const handle = renderScoreTable(phieu, onSaved, (done, total) => {
    stickyProgress.textContent = `Đã chấm ${done} / ${total} tiêu chí`;
  }, onDraftSaved, onLive);
  scoreHandle = handle;

  const ke = nguoiTiepTheoUuTien();
  const nutQuayLai = () => h("button", {
    class: "btn-ghost btn-icon", type: "button",
    onclick: () => dieuHuongAnToan(() => void quayLaiTongQuan()),
  }, icon("back", 20), "Quay lại tổng quan");
  const navTren = () => h("div", { class: "detail-top" },
    nutQuayLai(),
    h("h2", { class: "detail-title" }, "Chi tiết đánh giá KPI"),
  );
  const navDuoi = () => h("div", { class: "detail-nav" },
    nutQuayLai(),
    h("button", {
      class: "btn-primary btn-icon", type: "button", disabled: !ke,
      onclick: () => { if (ke) dieuHuongAnToan(() => void moPhieuChiTiet(ke)); },
    }, ke ? "Chấm người tiếp theo" : "Đã chấm hết mọi người", ke && icon("next", 20)),
  );

  mount(khung(true,
    navTren(),
    h("div", { class: "kpi-layout" },
      h("div", { class: "card detail-main" },
        personHeader,
        stickyBar,
        handle.el,
      ),
      sidebarWrap,
    ),
    navDuoi(),
  ));
}

async function moPhieuChiTiet(n: Nguoi) {
  dangChon = n;
  scoreHandle = null;
  renderManHinhChiTiet({ kind: "loading" });

  try {
    const phieu = await api.layPhieu(n.hoTen, n.chucDanh, n.to, n.ky);
    renderManHinhChiTiet({ kind: "ready", phieu });
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err);
    renderManHinhChiTiet({ kind: "error", msg });
  }
}

async function boot() {
  if (!CONFIG.isConfigured) return showConfigError();
  try {
    await initAuth(() => void onSignedIn());
  } catch (err) {
    mount(screen(h("div", { class: "card loi-box" }, h("p", {}, String(err)))));
    return;
  }
  showSignIn();
}

void boot();
