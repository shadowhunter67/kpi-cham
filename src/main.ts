import "./styles.css";
import { CONFIG } from "./config";
import { h, mount, openModal } from "./dom";
import { initAuth, renderSignInButton, clearToken } from "./auth";
import { api, ApiError } from "./api";
import { renderOverview } from "./views/overview";
import { renderScoreTable, laneCua, diemHienCo, type ScoreTableHandle } from "./views/scoreTable";
import { renderSidebarSummary } from "./views/sidebarSummary";
import { renderPersonHeader } from "./views/personHeader";
import { trangThaiCuaNguoi, type TrangThaiNguoi } from "./views/nguoiTrangThai";
import type { KhoiTaoResp, Nguoi, PhieuResp, VaiTro } from "./types";

let phien: KhoiTaoResp | null = null;
let dangChon: Nguoi | null = null;
/** Handle của form đang mở (nếu có) — dùng để hỏi "còn thay đổi chưa lưu" trước khi điều hướng đi nơi khác. */
let scoreHandle: ScoreTableHandle | null = null;

function moTaVaiTro(v: VaiTro): string {
  const phan: string[] = [];
  if (v.to) phan.push(`Tổ "${v.to}" — Tổ ${v.toChucVu}`);
  if (v.hoiDong) phan.push(`Hội đồng — ${v.hoiDong}`);
  return phan.join(" · ") || "Chưa có vai trò";
}

function screen(...children: (Node | string | false | null | undefined)[]): HTMLElement {
  return h("main", { class: "screen" },
    h("header", { class: "app-bar" },
      h("div", {},
        h("h1", {}, "Chấm điểm KPI"),
        h("p", { class: "app-sub" }, "Trường TH&THCS Chu Văn An"),
      ),
    ),
    ...children,
  );
}

function showConfigError() {
  mount(screen(
    h("div", { class: "card loi-box" },
      h("h2", {}, "Chưa cấu hình"),
      h("p", {}, "Thiếu VITE_APPS_SCRIPT_URL hoặc VITE_GOOGLE_CLIENT_ID. Xem README."),
    ),
  ));
}

function showSignIn() {
  const btnBox = h("div", { class: "signin-box" });
  mount(screen(
    h("div", { class: "card" },
      h("p", {}, "Đăng nhập bằng tài khoản Google đã được cấp quyền chấm điểm."),
      btnBox,
    ),
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

/** Quay lại Tổng quan — tải lại danh sách để phản ánh đúng tiến độ mới nhất sau khi chấm. */
async function quayLaiTongQuan() {
  dangChon = null;
  scoreHandle = null;
  renderTongQuan();
  try {
    phien = await api.khoiTao();
    renderTongQuan();
  } catch {
    // Giữ nguyên dữ liệu cũ nếu tải lại lỗi — không chặn người dùng ở màn hình tổng quan.
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

function renderTongQuan() {
  if (!phien) return;
  mount(screen(
    h("div", { class: "card ident-block" },
      h("div", { class: "ident-info" },
        h("div", { class: "ident-email" }, phien.email),
        h("div", { class: "ident-role" }, moTaVaiTro(phien.vaiTro)),
        h("div", { class: "ident-ky" }, `Kỳ đánh giá: ${phien.ky}`),
      ),
      h("button", { class: "btn-ghost btn-logout", type: "button", onclick: dangXuat }, "Đăng xuất"),
    ),
    phien.nguoiDuocCham.length === 0
      ? h("div", { class: "card muc-note warn" }, "Chưa có ai nộp Form trong kỳ này (hoặc chưa tới kỳ chấm).")
      : h("div", { class: "card" },
        h("h2", { class: "field-label" }, "Tổng quan chấm KPI"),
        renderOverview(phien.nguoiDuocCham, (n) => void moPhieuChiTiet(n)),
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
  const stickyBar = h("div", { class: "sticky-eval-bar" },
    h("strong", {}, `${phieu.hoTen} · Kỳ ${phieu.ky}`),
    stickyProgress,
  );

  const personHeader = renderPersonHeader(phieu);
  const sidebarWrap = h("div", { class: "kpi-sidebar" }, renderSidebarSummary(phieu));

  const onSaved = () => void moPhieuChiTiet(dangChon!);
  const onDraftSaved = (phieuMoi: PhieuResp) => {
    // Lưu nháp KHÔNG tải lại cả màn hình — chỉ vẽ lại sidebar tại chỗ từ
    // dữ liệu vừa được scoreTable cập nhật tại chỗ (xem ghi chú trong
    // scoreTable.ts) để tránh mất dữ liệu do đọc-ngay-sau-ghi bị trễ.
    sidebarWrap.replaceChildren(renderSidebarSummary(phieuMoi));
  };
  const handle = renderScoreTable(phieu, onSaved, (done, total) => {
    stickyProgress.textContent = `Đã chấm ${done} / ${total} tiêu chí`;
  }, onDraftSaved);
  scoreHandle = handle;

  const ke = nguoiTiepTheoUuTien();
  const nav = () => h("div", { class: "detail-nav" },
    h("button", {
      class: "btn-ghost", type: "button",
      onclick: () => dieuHuongAnToan(() => void quayLaiTongQuan()),
    }, "← Quay lại tổng quan"),
    h("button", {
      class: "btn-secondary", type: "button", disabled: !ke,
      onclick: () => { if (ke) dieuHuongAnToan(() => void moPhieuChiTiet(ke)); },
    }, ke ? "Chấm người tiếp theo →" : "Đã chấm hết mọi người"),
  );

  mount(screen(
    nav(),
    h("div", { class: "kpi-layout" },
      h("div", { class: "card" },
        personHeader,
        stickyBar,
        handle.el,
      ),
      sidebarWrap,
    ),
    nav(),
  ));
}

async function moPhieuChiTiet(n: Nguoi) {
  dangChon = n;
  scoreHandle = null;
  renderManHinhChiTiet({ kind: "loading" });

  try {
    const phieu = await api.layPhieu(n.hoTen, n.chucDanh, n.to);
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
