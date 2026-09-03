import { h } from "../dom";
import type { Nguoi } from "../types";

/** Chọn người cần chấm. Nhiều người (hội đồng) → có bộ lọc tổ + chức danh. */
export function renderPicker(
  danhSach: Nguoi[],
  dangChon: Nguoi | null,
  onPick: (n: Nguoi | null) => void,
): HTMLElement {
  const cacTo = [...new Set(danhSach.map((n) => n.to))].sort();
  const cacCd = [...new Set(danhSach.map((n) => n.chucDanh))].sort();
  const coLoc = danhSach.length > 12;

  let locTo = "";
  let locCd = "";

  const select = h("select", { class: "picker-select" }) as HTMLSelectElement;

  const veLai = () => {
    const loc = danhSach.filter(
      (n) => (!locTo || n.to === locTo) && (!locCd || n.chucDanh === locCd),
    );
    select.replaceChildren(h("option", { value: "" }, `— Chọn người (${loc.length}) —`));
    for (const n of loc) {
      const key = JSON.stringify(n);
      const opt = h("option", { value: key }, `${n.hoTen} — ${n.chucDanh}${coLoc ? " · " + n.to : ""}`);
      if (dangChon && JSON.stringify(dangChon) === key) opt.selected = true;
      select.append(opt);
    }
  };

  select.addEventListener("change", () => {
    onPick(select.value ? (JSON.parse(select.value) as Nguoi) : null);
  });

  const mkFilter = (label: string, opts: string[], set: (v: string) => void) => {
    const s = h("select", {}, h("option", { value: "" }, label),
      ...opts.map((o) => h("option", { value: o }, o))) as HTMLSelectElement;
    s.addEventListener("change", () => { set(s.value); veLai(); });
    return s;
  };

  veLai();

  return h("div", { class: "picker" },
    coLoc && h("div", { class: "picker-filters" },
      mkFilter("Tất cả tổ", cacTo, (v) => (locTo = v)),
      mkFilter("Tất cả chức danh", cacCd, (v) => (locCd = v)),
    ),
    select,
  );
}
