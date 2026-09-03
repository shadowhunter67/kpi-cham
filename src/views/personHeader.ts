import { h } from "../dom";
import type { PhieuResp } from "../types";

/**
 * KpiPersonHeader — trả lời ngay 3 câu hỏi đầu: đang chấm cho ai, kỳ
 * nào, trạng thái Tổ/Hội đồng đã chốt chưa. Đặt cố định ở đầu bảng
 * chấm; `id` để IntersectionObserver ở main.ts biết khi nào cuộn khỏi
 * màn hình mà hiện sticky-eval-bar.
 */
export function renderPersonHeader(phieu: PhieuResp): HTMLElement {
  const toDaChot = phieu.trangThai.to === "đã chốt";
  const hdDaChot = phieu.trangThai.hoiDong === "đã chốt";

  const nop = phieu.tuCham.thoiGianNop
    ? ` · Nộp Form lúc ${phieu.tuCham.thoiGianNop}`
    : "";
  const kiemNhiem = phieu.tuCham.nhiemVuKiemNhiem
    ? ` · Kiêm nhiệm: ${phieu.tuCham.nhiemVuKiemNhiem}`
    : "";

  return h("div", { class: "person-header", id: "person-header" },
    h("h2", {}, phieu.hoTen),
    h("p", { class: "person-role" }, phieu.chucDanh),
    h("p", { class: "person-meta" }, `Kỳ đánh giá ${phieu.ky}  ·  ${phieu.to}${nop}${kiemNhiem}`),
    h("div", { class: "badge-row" },
      h("span", { class: `badge ${toDaChot ? "badge-ok" : "badge-warn"}` },
        `Tổ: ${toDaChot ? "Đã chốt" : "Chưa chốt"}`),
      h("span", { class: `badge ${hdDaChot ? "badge-ok" : "badge-warn"}` },
        `Hội đồng: ${hdDaChot ? "Đã chốt" : "Chưa chốt"}`),
    ),
  );
}
