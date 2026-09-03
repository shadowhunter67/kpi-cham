import { h, fmt, openModal } from "../dom";
import { tongHop } from "../scoring";
import { laneCua, diemHienCo } from "./scoreTable";
import { boNhan } from "./text";
import type { PhieuResp } from "../types";

/**
 * Sidebar — CHỈ 1 card tóm tắt (không lặp lại thông tin ở nhiều nơi).
 * Ưu tiên trạng thái của LỚP đang chấm (Tổ hoặc Hội đồng) vì đây là
 * màn hình thao tác của người đó; điểm tự chấm + lớp còn lại chỉ là
 * dòng tham khảo bên dưới.
 */
export function renderSidebarSummary(phieu: PhieuResp): HTMLElement {
  const t = tongHop(phieu);
  const lane = laneCua(phieu);

  const row = (label: string, value: string) =>
    h("div", { class: "sidebar-row" }, h("span", {}, label), h("b", {}, value));

  const btnChiTiet = h("button", { class: "btn-secondary", type: "button" }, "Xem chi tiết điểm");
  btnChiTiet.addEventListener("click", () => moChiTietDiem(phieu, lane));

  // Chế độ chỉ xem (thành viên hội đồng) — không có lớp nào đang thao tác,
  // hiện KPI tổng hợp làm tham khảo.
  if (lane == null) {
    return h("aside", { class: "card sidebar-card" },
      h("p", { class: "sidebar-title" }, "Tổng điểm KPI tạm tính"),
      h("div", { class: "sidebar-score" },
        t.kpiCuoi == null ? "Chưa đủ điểm" : String(t.kpiCuoi),
        t.kpiCuoi != null && h("span", {}, " / 100"),
      ),
      h("div", { class: "sidebar-rows" },
        row("Cá nhân tự chấm (20%)", `${fmt(t.tuCham)} / 100`),
        row("Tổ chấm (30%)", t.toChua ? "Chưa chấm" : `${fmt(t.toCham)} / 100`),
        row("Hội đồng (50%)", t.hoiDongChua ? "Chưa chấm" : `${fmt(t.hoiDong)} / 100`),
      ),
      h("div", { class: "sidebar-actions" }, btnChiTiet),
    );
  }

  const chinh = lane === "hoiDong"
    ? { nhan: "ĐIỂM HỘI ĐỒNG CHẤM", gia: t.hoiDong, chua: t.hoiDongChua }
    : { nhan: "ĐIỂM TỔ CHẤM", gia: t.toCham, chua: t.toChua };

  const conLai = lane === "hoiDong"
    ? row("Tổ chấm", t.toChua ? "Chưa chấm" : `${fmt(t.toCham)} / 100`)
    : row("Hội đồng", t.hoiDongChua ? "Chưa chấm" : `${fmt(t.hoiDong)} / 100`);

  const done = phieu.rows.filter((r) => diemHienCo(lane, r) != null).length;
  const total = phieu.rows.length;
  const con = total - done;

  return h("aside", { class: "card sidebar-card" },
    h("p", { class: "sidebar-title" }, chinh.nhan),
    h("div", { class: "sidebar-score" },
      chinh.chua ? "Chưa đủ điểm" : fmt(chinh.gia),
      !chinh.chua && h("span", {}, " / 100"),
    ),

    h("div", { class: "sidebar-progress" },
      h("span", { class: "sidebar-sub" }, "Tiến độ"),
      h("span", { class: "sidebar-progress-val" }, `${done} / ${total} tiêu chí`),
    ),
    con > 0 && h("div", { class: "sidebar-progress" },
      h("span", { class: "sidebar-sub" }, "Còn thiếu"),
      h("span", { class: "sidebar-progress-val warn" }, `${con} tiêu chí`),
    ),

    h("div", { class: "sidebar-rows" },
      row("Điểm cá nhân tự chấm", `${fmt(t.tuCham)} / 100`),
      conLai,
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
