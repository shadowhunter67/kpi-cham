import { h, fmt } from "../dom";
import { tongHop } from "../scoring";
import type { PhieuResp } from "../types";

/** Dải tóm tắt điểm 3 lớp + KPI tạm tính. Chỉ đọc. */
export function renderSummary(phieu: PhieuResp): HTMLElement {
  const t = tongHop(phieu);

  const o = (label: string, value: string, note?: string) =>
    h("div", { class: "sum-cell" },
      h("span", { class: "sum-label" }, label),
      h("span", { class: "sum-value" }, value),
      note && h("span", { class: "sum-note" }, note),
    );

  return h("div", { class: "summary" },
    o("Tự chấm (20%)", fmt(t.tuCham) + " / 100"),
    o("Tổ chấm (30%)", fmt(t.toCham) + " / 100", t.toChamThieu ? "chưa đủ 2 người" : undefined),
    o(
      "Hội đồng (50%)",
      fmt(t.hoiDong) + " / 100",
      t.hoiDong == null ? "chưa đủ điểm" : t.hoiDongTamTinh ? "đề xuất, chưa chốt" : "đã chốt",
    ),
    o(
      "KPI tạm tính",
      t.kpiCuoi == null ? "—" : fmt(t.kpiCuoi),
      t.xepLoai ?? "cần đủ điểm 3 lớp",
    ),
    h("p", { class: "summary-disclaimer" },
      "Xếp loại cuối còn phụ thuộc điều kiện Nghị định 233/2026/NĐ-CP — con số ở đây chỉ để tham khảo."),
  );
}
