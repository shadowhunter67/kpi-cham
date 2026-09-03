import { h, fmt } from "../dom";
import { tongHop } from "../scoring";
import type { PhieuResp } from "../types";

/** ScoreSummary — 4 ô tổng quan điểm. Chưa có điểm nào ghi rõ chữ "Chưa chấm". */
export function renderSummary(phieu: PhieuResp): HTMLElement {
  const t = tongHop(phieu);

  const o = (label: string, value: string, note?: string, muted?: boolean) =>
    h("div", { class: "sum-cell" },
      h("span", { class: "sum-label" }, label),
      h("span", { class: `sum-value${muted ? " muted" : ""}` }, value),
      note && h("span", { class: "sum-note" }, note),
    );

  const oLop = (label: string, gia: number, chua: boolean, thieu: boolean, ttChot: "" | "đã chốt") => {
    if (chua) return o(label, "Chưa chấm", undefined, true);
    const note = thieu ? "chưa đủ điểm" : (ttChot === "đã chốt" ? "đã chốt" : "chưa chốt");
    return o(label, `${fmt(gia)} / 100`, note, thieu);
  };

  return h("div", { class: "summary" },
    o("Tự chấm (20%)", `${fmt(t.tuCham)} / 100`),
    oLop("Tổ chấm (30%)", t.toCham, t.toChua, t.toThieu, phieu.trangThai.to),
    oLop("Hội đồng (50%)", t.hoiDong, t.hoiDongChua, t.hoiDongThieu, phieu.trangThai.hoiDong),
    t.kpiCuoi == null
      ? o("KPI tạm tính", "Chưa đủ điểm", "cần đủ điểm cả 3 lớp", true)
      : o("KPI tạm tính", fmt(t.kpiCuoi), t.xepLoai ?? undefined),
    h("p", { class: "summary-disclaimer" },
      "Xếp loại cuối còn phụ thuộc điều kiện Nghị định 233/2026/NĐ-CP — con số ở đây chỉ để tham khảo."),
  );
}
