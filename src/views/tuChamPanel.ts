import { h, fmt } from "../dom";
import { boNhan } from "./text";
import type { PhieuResp } from "../types";

/**
 * Thẻ tự chấm dạng "điểm nổi bật + breakdown" (tham khảo layout thẻ điểm
 * bên uniscorevn) — số to ở trên, vài dòng breakdown, chi tiết 26 dòng
 * gấp lại trong <details> để không rối khi chưa cần xem.
 */
export function renderTuChamCard(phieu: PhieuResp): HTMLElement {
  const tc = phieu.tuCham;
  const tong = Math.round((tc.tongTC + tc.tongKPI) * 100) / 100;

  const row = (label: string, value: string) =>
    h("div", { class: "tc-row" }, h("span", {}, label), h("b", {}, value));

  return h("aside", { class: "card tc-side" },
    h("p", { class: "tc-label" }, "Tổng điểm tự chấm"),
    h("div", { class: "tc-score" }, String(tong), h("span", {}, " / 100")),

    h("div", { class: "tc-rows" },
      row("Tiêu chí chung", `${fmt(tc.tongTC)} / 30`),
      row("KPI", `${fmt(tc.tongKPI)} / 70`),
    ),

    h("details", { class: "tc-details" },
      h("summary", {}, "Xem chi tiết"),
      h("div", { class: "tc-details-body" },
        h("p", { class: "tc-meta" }, h("b", {}, phieu.hoTen), ` — ${phieu.chucDanh}`),
        h("p", { class: "tc-meta" }, `${phieu.to} · Kỳ ${phieu.ky}`),
        tc.thoiGianNop && h("p", { class: "tc-meta" }, "Nộp Form: ", h("b", {}, tc.thoiGianNop)),
        tc.nhiemVuKiemNhiem &&
          h("p", { class: "tc-meta" }, "Kiêm nhiệm: ", h("b", {}, tc.nhiemVuKiemNhiem)),
        h("table", { class: "detail-table" },
          h("thead", {}, h("tr", {}, h("th", {}, "Mã"), h("th", {}, "Nội dung"), h("th", {}, "Điểm"))),
          h("tbody", {}, ...phieu.rows.map((r) =>
            h("tr", {},
              h("td", { class: "detail-ma" }, r.ma),
              h("td", {}, boNhan(r.ma, r.noiDung)),
              h("td", { class: "detail-diem" }, fmt(r.diemTuCham)),
            ),
          )),
        ),
      ),
    ),
  );
}
