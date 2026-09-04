import { h } from "../dom";
import { trangThaiCuaNguoi, moTaTrangThai } from "./nguoiTrangThai";
import type { Nguoi } from "../types";

const soSanh = (a: Nguoi, b: Nguoi | null): boolean =>
  !!b && a.hoTen === b.hoTen && a.chucDanh === b.chucDanh && a.to === b.to;

/**
 * Danh sách người cần chấm dạng ROW (không dùng native <select>) — mỗi
 * người phải thấy TRẠNG THÁI (chưa bắt đầu / đang chấm / đã đủ / đã
 * chốt) TRƯỚC KHI mở phiếu, không phải đoán. Row cao ≥60px, dễ bấm.
 */
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

  const summary = h("p", { class: "nguoi-summary" });
  const list = h("div", { class: "nguoi-list", role: "listbox" });

  const veLai = () => {
    const loc = danhSach.filter(
      (n) => (!locTo || n.to === locTo) && (!locCd || n.chucDanh === locCd),
    );

    const dem = { "chua-bat-dau": 0, "dang-cham": 0, "du-chua-chot": 0, "da-chot": 0 };
    loc.forEach((n) => { dem[trangThaiCuaNguoi(n)]++; });
    summary.textContent =
      `${loc.length} người cần chấm — ${dem["chua-bat-dau"]} chưa bắt đầu · ` +
      `${dem["dang-cham"]} đang chấm · ${dem["du-chua-chot"]} đã chấm đủ · ${dem["da-chot"]} đã chốt`;

    list.replaceChildren(...loc.map((n) => {
      const trangThai = trangThaiCuaNguoi(n);
      const active = soSanh(n, dangChon);
      const row = h("button", {
        type: "button",
        class: `nguoi-row ${trangThai}${active ? " chon" : ""}`,
        role: "option",
        "aria-selected": String(active),
      },
        h("span", { class: "nguoi-info" },
          h("span", { class: "nguoi-ten" }, n.hoTen),
          h("span", { class: "nguoi-chuc-danh" }, coLoc ? `${n.chucDanh} · ${n.to}` : n.chucDanh),
        ),
        h("span", { class: `nguoi-trang-thai ${trangThai}` }, moTaTrangThai(n)),
      );
      row.addEventListener("click", () => onPick(n));
      return row;
    }));

    if (!loc.length) {
      list.append(h("p", { class: "muc-note" }, "Không có ai khớp bộ lọc."));
    }
  };

  const mkFilter = (label: string, opts: string[], set: (v: string) => void) => {
    const s = h("select", {}, h("option", { value: "" }, label),
      ...opts.map((o) => h("option", { value: o }, o))) as HTMLSelectElement;
    s.addEventListener("change", () => { set(s.value); veLai(); });
    return s;
  };

  veLai();

  return h("div", { class: "picker" },
    summary,
    coLoc && h("div", { class: "picker-filters" },
      mkFilter("Tất cả tổ", cacTo, (v) => (locTo = v)),
      mkFilter("Tất cả chức danh", cacCd, (v) => (locCd = v)),
    ),
    list,
  );
}
