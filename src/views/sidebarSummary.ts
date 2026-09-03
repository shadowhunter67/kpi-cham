import { h, fmt, openModal } from "../dom";
import { tongHop } from "../scoring";
import { laneCua, diemHienCo } from "./scoreTable";
import { boNhan } from "./text";
import type { PhieuResp } from "../types";

/**
 * Sidebar dính (sticky) bên phải: tổng điểm KPI tạm tính (điểm thật,
 * dùng chung tongHop() với ScoreSummary — không tạo số liệu riêng) +
 * nút "Xem chi tiết điểm" mở modal 1 tầng scroll, tránh nhét bảng dài
 * vào 1 khung hẹp có scroll riêng.
 */
export function renderSidebarSummary(phieu: PhieuResp): HTMLElement {
  const t = tongHop(phieu);
  const lane = laneCua(phieu);

  const row = (label: string, value: string) =>
    h("div", { class: "sidebar-row" }, h("span", {}, label), h("b", {}, value));

  const btnChiTiet = h("button", { class: "btn-secondary", type: "button" }, "Xem chi tiết điểm");
  btnChiTiet.addEventListener("click", () => moChiTietDiem(phieu, lane));

  return h("aside", { class: "card sidebar-card kpi-sidebar" },
    h("p", { class: "sidebar-title" }, "Tổng điểm KPI tạm tính"),
    h("div", { class: "sidebar-score" },
      t.kpiCuoi == null ? "Chưa đủ điểm" : String(t.kpiCuoi),
      t.kpiCuoi != null && h("span", {}, " / 100"),
    ),
    h("div", { class: "sidebar-rows" },
      row("Tự chấm (20%)", `${fmt(t.tuCham)} / 100`),
      row("Tổ chấm (30%)", t.toChua ? "Chưa chấm" : `${fmt(t.toCham)} / 100`),
      row("Hội đồng (50%)", t.hoiDongChua ? "Chưa chấm" : `${fmt(t.hoiDong)} / 100`),
    ),
    h("div", { class: "sidebar-actions" }, btnChiTiet),
  );
}

function moChiTietDiem(phieu: PhieuResp, lane: ReturnType<typeof laneCua>) {
  const tieuDe = lane === "hoiDong" ? "Chi tiết điểm Hội đồng" : lane === "to" ? "Chi tiết điểm Tổ" : "Chi tiết điểm";

  const body = h("table", { class: "detail-table" },
    h("thead", {}, h("tr", {}, h("th", {}, "Mã"), h("th", {}, "Nội dung"), h("th", {}, "Điểm"))),
    h("tbody", {}, ...phieu.rows.map((r) =>
      h("tr", {},
        h("td", { class: "detail-ma" }, r.ma),
        h("td", {}, boNhan(r.ma, r.noiDung)),
        h("td", { class: "detail-diem" }, fmt(diemHienCo(lane, r))),
      ),
    )),
  );

  openModal(tieuDe, body, { wide: true });
}
