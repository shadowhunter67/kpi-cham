import { h, fmt } from "../dom";
import { tongHop } from "../scoring";
import { TRONG_SO } from "../config";
import { laneCua, diemHienCo } from "./scoreTable";
import type { PhieuResp } from "../types";

/**
 * Sidebar — CHỈ 1 card tóm tắt (không lặp lại thông tin ở nhiều nơi).
 * Ưu tiên trạng thái của LỚP đang chấm (Tổ hoặc Hội đồng) vì đây là
 * màn hình thao tác của người đó; điểm tự chấm + lớp còn lại chỉ là
 * dòng tham khảo bên dưới.
 *
 * Không có nút "Xem chi tiết điểm" — bảng chính bên cạnh đã hiển thị đủ
 * toàn bộ 26 tiêu chí kèm dòng "Điểm cá nhân tự chấm"/"Tổ đã chấm" tham
 * khảo trên từng card rồi, thêm modal chỉ lặp lại y hệt nội dung đó.
 */
export function renderSidebarSummary(phieu: PhieuResp): HTMLElement {
  const t = tongHop(phieu);
  const lane = laneCua(phieu);

  const row = (label: string, value: string) =>
    h("div", { class: "sidebar-row" }, h("span", {}, label), h("b", {}, value));

  // Chế độ chỉ xem (thành viên hội đồng) — không có lớp nào đang thao tác,
  // hiện KPI tổng hợp làm tham khảo.
  if (lane == null) {
    return h("aside", { class: "card sidebar-card" },
      h("p", { class: "sidebar-title" }, "Tổng điểm KPI tạm tính"),
      t.kpiCuoi == null
        ? h("div", { class: "sidebar-score sidebar-score-sub" }, "Chưa đủ dữ liệu")
        : h("div", { class: "sidebar-score" }, String(t.kpiCuoi), h("span", {}, " / 100")),
      h("div", { class: "sidebar-rows" },
        row("Cá nhân tự chấm (20%)", `${fmt(t.tuCham)} / 100`),
        row("Tổ chấm (30%)", t.toChua ? "Chưa chấm" : `${fmt(t.toCham)} / 100`),
        row("Hội đồng (50%)", t.hoiDongChua ? "Chưa chấm" : `${fmt(t.hoiDong)} / 100`),
      ),
    );
  }

  const chinh = lane === "hoiDong"
    ? { nhan: "ĐIỂM HỘI ĐỒNG CHẤM", gia: t.hoiDong, chua: t.hoiDongChua }
    : { nhan: "ĐIỂM TỔ CHẤM", gia: t.toCham, chua: t.toChua };

  const done = phieu.rows.filter((r) => diemHienCo(lane, r) != null).length;
  const total = phieu.rows.length;
  const con = total - done;

  return h("aside", { class: "card sidebar-card" },
    h("p", { class: "sidebar-title" }, chinh.nhan),
    chinh.chua
      ? h("div", { class: "sidebar-score sidebar-score-sub" }, "Chưa đủ dữ liệu")
      : h("div", { class: "sidebar-score" }, fmt(chinh.gia), h("span", {}, " / 100")),

    h("div", { class: "sidebar-progress" },
      h("span", { class: "sidebar-sub" }, "Tiến độ"),
      h("span", { class: "sidebar-progress-val" }, `${done} / ${total} tiêu chí`),
    ),
    con > 0 && h("div", { class: "sidebar-progress" },
      h("span", { class: "sidebar-sub" }, "Còn thiếu"),
      h("span", { class: "sidebar-progress-val warn" }, `${con} tiêu chí`),
    ),

    lane === "hoiDong"
      // Hiệu trưởng cần thấy CÁCH TÍNH ra điểm tổng — mỗi thành phần kèm
      // hệ số quy đổi + số điểm nó đóng góp thật, không chỉ điểm thô.
      ? h("div", { class: "sidebar-rows sidebar-contrib" },
        dongGopRow("Cá nhân tự chấm", t.tuCham, TRONG_SO.tu, false),
        dongGopRow("Tổ chấm", t.toCham, TRONG_SO.to, t.toChua),
        dongGopRow("Hội đồng chấm", t.hoiDong, TRONG_SO.hoiDong, t.hoiDongChua),
      )
      : h("div", { class: "sidebar-rows" },
        row("Điểm cá nhân tự chấm", `${fmt(t.tuCham)} / 100`),
        row("Hội đồng", t.hoiDongChua ? "Chưa chấm" : `${fmt(t.hoiDong)} / 100`),
      ),

    // Chỉ Hiệu trưởng (lane hoiDong) mới thấy — và chỉ khi đã đủ điểm CẢ
    // Tổ lẫn Hội đồng (t.kpiCuoi chỉ khác null khi cả 2 lớp đều đủ 26/26,
    // xem tongHop() trong scoring.ts) nên tự nó đã bao gồm điều kiện "Tổ
    // phải chấm xong" mà không cần kiểm tra riêng.
    lane === "hoiDong" && t.kpiCuoi != null && h("div", { class: "sidebar-final" },
      h("p", { class: "sidebar-final-title" }, "ĐIỂM TỔNG KPI"),
      h("div", { class: "sidebar-final-score" }, String(t.kpiCuoi), h("span", {}, " / 100")),
      t.xepLoai && h("p", { class: "sidebar-final-xeploai" }, t.xepLoai),
    ),
  );
}

/** 1 dòng thành phần trong công thức tính điểm tổng: điểm thô + hệ số + số điểm đóng góp thật (điểm thô × hệ số). */
function dongGopRow(label: string, gia: number, trongSo: number, chua: boolean): HTMLElement {
  const dongGop = Math.round(gia * trongSo * 100) / 100;
  return h("div", { class: "sidebar-contrib-row" },
    h("div", { class: "sidebar-contrib-head" },
      h("span", {}, label),
      h("b", {}, chua ? "Chưa chấm" : `${fmt(gia)} / 100`),
    ),
    h("div", { class: "sidebar-contrib-sub" },
      h("span", {}, `Đóng góp ${Math.round(trongSo * 100)}%`),
      h("span", { class: "sidebar-contrib-val" }, chua ? "—" : `+${fmt(dongGop)}`),
    ),
  );
}
