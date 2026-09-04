import { h } from "../dom";
import { CAC_TRANG_THAI, nhanHanhDong, nhanTrangThai, trangThaiCuaNguoi, trangThaiToCuaNguoi, type TrangThaiNguoi } from "./nguoiTrangThai";
import type { Nguoi } from "../types";

/**
 * Trang "Tổng quan chấm KPI" — màn hình riêng, TRƯỚC màn hình chấm chi
 * tiết. Ưu tiên người trung niên/lớn tuổi: nền trắng, chữ lớn, danh
 * sách trạng thái rõ ràng — KHÔNG biểu đồ (không pie/donut). 4 ô trạng
 * thái đếm số lượng, bấm vào để lọc danh sách bên dưới.
 */
export function renderOverview(danhSach: Nguoi[], onPick: (n: Nguoi) => void): HTMLElement {
  const cacTo = [...new Set(danhSach.map((n) => n.to))].sort();
  const cacCd = [...new Set(danhSach.map((n) => n.chucDanh))].sort();
  const coLocPhu = danhSach.length > 12;

  let locTrangThai: TrangThaiNguoi | null = null;
  let locTo = "";
  let locCd = "";

  const dem: Record<TrangThaiNguoi, number> = { "chua-bat-dau": 0, "dang-cham": 0, "du-chua-chot": 0, "da-chot": 0 };
  danhSach.forEach((n) => { dem[trangThaiCuaNguoi(n)]++; });

  const tiles = new Map<TrangThaiNguoi, HTMLButtonElement>();
  const stats = h("div", { class: "overview-stats" },
    ...CAC_TRANG_THAI.map((t) => {
      const tile = h("button", { type: "button", class: `stat-tile stat-${t}`, "aria-pressed": "false" },
        h("span", { class: "stat-count" }, String(dem[t])),
        h("span", { class: "stat-label" }, nhanTrangThai(t)),
      ) as HTMLButtonElement;
      tile.addEventListener("click", () => {
        locTrangThai = locTrangThai === t ? null : t;
        veLai();
      });
      tiles.set(t, tile);
      return tile;
    }),
  );

  const filterTo = coLocPhu ? mkFilter("Tất cả tổ", cacTo, (v) => { locTo = v; veLai(); }) : null;
  const filterCd = coLocPhu ? mkFilter("Tất cả chức danh", cacCd, (v) => { locCd = v; veLai(); }) : null;

  const resetBtn = h("button", { type: "button", class: "overview-reset" }) as HTMLButtonElement;
  resetBtn.addEventListener("click", () => {
    locTrangThai = null;
    locTo = "";
    locCd = "";
    if (filterTo) filterTo.value = "";
    if (filterCd) filterCd.value = "";
    veLai();
  });

  const list = h("div", { class: "overview-list" });

  const veLai = () => {
    for (const [t, tile] of tiles) {
      const active = locTrangThai === t;
      tile.classList.toggle("chon", active);
      tile.setAttribute("aria-pressed", String(active));
    }

    const loc = danhSach.filter((n) =>
      (!locTrangThai || trangThaiCuaNguoi(n) === locTrangThai) &&
      (!locTo || n.to === locTo) &&
      (!locCd || n.chucDanh === locCd),
    );

    const dangLoc = !!locTrangThai || !!locTo || !!locCd;
    resetBtn.textContent = dangLoc
      ? `← Tất cả — ${danhSach.length} người`
      : `Tất cả — ${danhSach.length} người`;
    resetBtn.classList.toggle("dang-loc", dangLoc);

    list.replaceChildren(...loc.map((n) => {
      const t = trangThaiCuaNguoi(n);
      const tTo = trangThaiToCuaNguoi(n);
      return h("div", { class: `overview-row overview-${t}` },
        h("div", { class: "overview-info" },
          h("span", { class: "nguoi-ten" }, n.hoTen),
          h("span", { class: "nguoi-chuc-danh" }, coLocPhu ? `${n.chucDanh} · ${n.to}` : n.chucDanh),
          h("span", { class: "overview-tiendo" }, `Tiến độ: ${n.daCham} / ${n.tongTieuChi} tiêu chí`),
          // Chỉ Hội đồng thấy dòng này (n.toDaChot chỉ được backend trả khi
          // đang xem với vai trò Hội đồng) — báo trước Tổ đã xử lý tới đâu,
          // khỏi phải bấm vào mới biết vì sao phiếu đang bị khoá chỉ-xem.
          tTo && h("span", { class: `overview-to-trangthai ${tTo}` }, `Tổ: ${nhanTrangThai(tTo)}`),
        ),
        h("div", { class: "overview-action" },
          h("span", { class: `nguoi-trang-thai ${t}` }, nhanTrangThai(t)),
          h("button", { type: "button", class: "btn-primary", onclick: () => onPick(n) }, nhanHanhDong(t)),
        ),
      );
    }));

    if (!loc.length) {
      const lyDo = locTrangThai
        ? `Chưa có người nào ở trạng thái “${nhanTrangThai(locTrangThai)}”.`
        : "Không có ai khớp bộ lọc.";
      const btnXemHet = h("button", { type: "button", class: "btn-link" }, "Hiển thị tất cả");
      btnXemHet.addEventListener("click", () => resetBtn.click());
      list.append(h("div", { class: "overview-empty" },
        h("p", { class: "muc-note" }, lyDo),
        btnXemHet,
      ));
    }
  };

  function mkFilter(label: string, opts: string[], onChange: (v: string) => void): HTMLSelectElement {
    const s = h("select", {}, h("option", { value: "" }, label),
      ...opts.map((o) => h("option", { value: o }, o))) as HTMLSelectElement;
    s.addEventListener("change", () => onChange(s.value));
    return s;
  }

  veLai();

  return h("div", { class: "overview" },
    stats,
    resetBtn,
    (filterTo || filterCd) && h("div", { class: "picker-filters" }, filterTo, filterCd),
    list,
  );
}
