import { h } from "../dom";
import type { PhieuResp } from "../types";

/**
 * Thẻ thông tin cơ bản của bản tự chấm — đặt cạnh bảng chấm, dính
 * (position: sticky) theo cuộn trang trên màn rộng, xuống dưới bảng
 * chấm trên màn hẹp. KHÔNG lặp lại bảng 26 dòng (đã có sẵn trong từng
 * ô "Tự chấm: …" của bảng chấm) — chỉ hiện thông tin tổng quan.
 */
export function renderTuChamCard(phieu: PhieuResp): HTMLElement {
  const tc = phieu.tuCham;
  const tong = Math.round((tc.tongTC + tc.tongKPI) * 100) / 100;

  return h("aside", { class: "card tc-side" },
    h("h3", { class: "tc-title" }, "Thông tin tự chấm"),
    h("p", { class: "tc-meta" }, h("b", {}, phieu.hoTen)),
    h("p", { class: "tc-meta" }, phieu.chucDanh),
    h("p", { class: "tc-meta" }, `${phieu.to} · Kỳ ${phieu.ky}`),
    tc.thoiGianNop && h("p", { class: "tc-meta" }, "Nộp Form: ", h("b", {}, tc.thoiGianNop)),
    tc.nhiemVuKiemNhiem &&
      h("p", { class: "tc-meta" }, "Kiêm nhiệm: ", h("b", {}, tc.nhiemVuKiemNhiem)),
    h("div", { class: "tc-tong" },
      h("span", {}, "Tiêu chí chung: ", h("b", {}, `${tc.tongTC} / 30`)),
      h("span", {}, "KPI: ", h("b", {}, `${tc.tongKPI} / 70`)),
      h("span", {}, "Tổng tự chấm: ", h("b", {}, `${tong} / 100`)),
    ),
  );
}
