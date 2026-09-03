import "./styles.css";
import { CONFIG } from "./config";
import { h, mount } from "./dom";
import { initAuth, renderSignInButton, clearToken } from "./auth";
import { api, ApiError } from "./api";
import { renderPicker } from "./views/picker";
import { renderScoreTable } from "./views/scoreTable";
import { renderSummary } from "./views/summary";
import { renderTuChamDrawer } from "./views/tuChamPanel";
import type { KhoiTaoResp, Nguoi, VaiTro } from "./types";

let phien: KhoiTaoResp | null = null;
let dangChon: Nguoi | null = null;

function moTaVaiTro(v: VaiTro): string {
  const phan: string[] = [];
  if (v.to) phan.push(`Tổ "${v.to}" — Tổ ${v.toChucVu}`);
  if (v.hoiDong) phan.push(`Hội đồng — ${v.hoiDong}`);
  return phan.join(" · ") || "Chưa có vai trò";
}

function screen(...children: (Node | string | false | null | undefined)[]): HTMLElement {
  return h("main", { class: "screen" },
    h("header", { class: "app-bar" },
      h("h1", {}, "Chấm điểm KPI"),
      h("p", { class: "app-sub" }, "Trường TH&THCS Chu Văn An"),
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
    render();
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
  showSignIn();
}

async function chonNguoi(n: Nguoi | null) {
  dangChon = n;
  render();
  if (!n) return;

  const holder = document.getElementById("phieu-holder");
  if (holder) holder.replaceChildren(h("div", { class: "card" }, h("p", {}, "Đang tải phiếu…")));

  try {
    const phieu = await api.layPhieu(n.hoTen, n.chucDanh, n.to);
    const el = document.getElementById("phieu-holder");
    if (!el) return;
    const { toggle, drawer } = renderTuChamDrawer(phieu);
    el.replaceChildren(
      h("div", { class: "card" },
        h("div", { class: "phieu-head" },
          h("h2", {}, `${phieu.hoTen} — ${phieu.chucDanh}`),
          h("span", { class: "phieu-ky" }, `Kỳ ${phieu.ky} · ${phieu.to}`),
          h("span", { class: `badge tt-${phieu.trangThai.to === "đã chốt" ? "chot" : "chua"}` },
            `Tổ: ${phieu.trangThai.to === "đã chốt" ? "đã chốt" : "chưa chốt"}`),
          h("span", { class: `badge tt-${phieu.trangThai.hoiDong === "đã chốt" ? "chot" : "chua"}` },
            `HĐ: ${phieu.trangThai.hoiDong === "đã chốt" ? "đã chốt" : "chưa chốt"}`),
          toggle,
        ),
        renderSummary(phieu),
        renderScoreTable(phieu, () => void chonNguoi(dangChon)),
      ),
      drawer,
    );
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err);
    const el = document.getElementById("phieu-holder");
    if (el) el.replaceChildren(h("div", { class: "card loi-box" }, h("p", {}, msg)));
  }
}

function render() {
  if (!phien) return;
  mount(screen(
    h("div", { class: "card ident" },
      h("div", {},
        h("div", { class: "ident-email" }, phien.email),
        h("div", { class: "ident-role" }, moTaVaiTro(phien.vaiTro)),
        h("div", { class: "ident-ky" }, `Kỳ đánh giá: ${phien.ky}`),
      ),
      h("button", { class: "btn-ghost", type: "button", onclick: dangXuat }, "Đăng xuất"),
    ),
    phien.nguoiDuocCham.length === 0
      ? h("div", { class: "card muc-note warn" }, "Chưa có ai nộp Form trong kỳ này (hoặc chưa tới kỳ chấm).")
      : h("div", { class: "card" },
        h("label", { class: "field-label" }, "Người cần chấm"),
        renderPicker(phien.nguoiDuocCham, dangChon, (n) => void chonNguoi(n)),
      ),
    h("div", { id: "phieu-holder" }),
  ));
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
