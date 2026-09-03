import "./styles.css";
import { CONFIG } from "./config";
import { h, mount } from "./dom";
import { initAuth, renderSignInButton, clearToken } from "./auth";
import { api, ApiError } from "./api";
import { renderPicker } from "./views/picker";
import { renderScoreTable, laneCua, diemHienCo } from "./views/scoreTable";
import { renderSummary } from "./views/summary";
import { renderSidebarSummary } from "./views/sidebarSummary";
import { renderPersonHeader } from "./views/personHeader";
import { renderTuChamCard } from "./views/tuChamPanel";
import type { KhoiTaoResp, Nguoi, VaiTro } from "./types";

let phien: KhoiTaoResp | null = null;
let dangChon: Nguoi | null = null;

let stickyObserver: IntersectionObserver | null = null;
let stickyBar: HTMLElement | null = null;

function donDepSticky() {
  stickyObserver?.disconnect();
  stickyObserver = null;
  stickyBar?.remove();
  stickyBar = null;
}

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
  donDepSticky();
  clearToken();
  phien = null;
  dangChon = null;
  showSignIn();
}

async function chonNguoi(n: Nguoi | null) {
  dangChon = n;
  render();
  donDepSticky();
  if (!n) return;

  const holder = document.getElementById("phieu-holder");
  if (holder) holder.replaceChildren(h("div", { class: "card" }, h("p", {}, "Đang tải phiếu…")));

  try {
    const phieu = await api.layPhieu(n.hoTen, n.chucDanh, n.to);
    const el = document.getElementById("phieu-holder");
    if (!el) return;

    const lane = laneCua(phieu);
    const tongTieuChi = phieu.rows.length;
    const daChamBanDau = phieu.rows.filter((r) => diemHienCo(lane, r) != null).length;

    const stickyProgress = h("span", {}, `Đã chấm ${daChamBanDau} / ${tongTieuChi} tiêu chí`);
    stickyBar = h("div", { class: "sticky-eval-bar" },
      h("strong", {}, `${phieu.hoTen} · Kỳ ${phieu.ky}`),
      stickyProgress,
    );
    document.body.appendChild(stickyBar);

    const personHeader = renderPersonHeader(phieu);

    const { el: scoreEl } = renderScoreTable(phieu, () => void chonNguoi(dangChon), (done, total) => {
      stickyProgress.textContent = `Đã chấm ${done} / ${total} tiêu chí`;
    });

    el.replaceChildren(
      h("div", { class: "kpi-layout" },
        h("div", { class: "card" },
          personHeader,
          renderSummary(phieu),
          scoreEl,
        ),
        h("div", {},
          renderSidebarSummary(phieu),
          renderTuChamCard(phieu),
        ),
      ),
    );

    stickyObserver = new IntersectionObserver(
      ([entry]) => stickyBar?.classList.toggle("visible", !entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );
    stickyObserver.observe(personHeader);
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err);
    const el = document.getElementById("phieu-holder");
    if (el) el.replaceChildren(h("div", { class: "card loi-box" }, h("p", {}, msg)));
  }
}

function render() {
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
