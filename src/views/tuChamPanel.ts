import { h, fmt, kids } from "../dom";
import { boNhan } from "./text";
import type { PhieuResp } from "../types";

let dangMo = false;

/** Ngăn kéo trượt từ phải: thông tin cá nhân tự chấm (đối chiếu khi chấm). */
export function renderTuChamDrawer(phieu: PhieuResp): {
  toggle: HTMLElement;
  drawer: HTMLElement;
} {
  const tc = phieu.tuCham;
  const tong = Math.round((tc.tongTC + tc.tongKPI) * 100) / 100;

  const bang = h("table", { class: "tc-table" },
    h("thead", {}, h("tr", {},
      h("th", {}, "Mã"), h("th", {}, "Nội dung"), h("th", {}, "Tự chấm"))),
    h("tbody", {}, ...phieu.rows.map((r) =>
      h("tr", {},
        h("td", { class: "tc-ma" }, r.ma),
        h("td", {}, boNhan(r.ma, r.noiDung)),
        h("td", { class: "tc-diem" }, fmt(r.diemTuCham)),
      ),
    )),
  );

  const drawer = h("aside", { class: "drawer", "aria-hidden": "true" },
    h("div", { class: "drawer-backdrop" }),
    h("div", { class: "drawer-panel" },
      h("div", { class: "drawer-head" },
        h("h3", {}, "Bản tự chấm"),
        h("button", { class: "drawer-close", type: "button", "aria-label": "Đóng" }, "✕"),
      ),
      h("div", { class: "drawer-body" },
        h("p", { class: "tc-meta" },
          h("b", {}, `${phieu.hoTen}`), ` — ${phieu.chucDanh}`,
          h("br", {}), `${phieu.to} · Kỳ ${phieu.ky}`,
        ),
        ...kids(
          tc.thoiGianNop && h("p", { class: "tc-meta" }, "Nộp Form: ", h("b", {}, tc.thoiGianNop)),
          tc.nhiemVuKiemNhiem &&
            h("p", { class: "tc-meta" }, "Nhiệm vụ kiêm nhiệm: ", h("b", {}, tc.nhiemVuKiemNhiem)),
        ),
        h("div", { class: "tc-tong" },
          h("span", {}, "Tiêu chí chung: ", h("b", {}, `${fmt(tc.tongTC)} / 30`)),
          h("span", {}, "KPI: ", h("b", {}, `${fmt(tc.tongKPI)} / 70`)),
          h("span", {}, "Tổng tự chấm: ", h("b", {}, `${fmt(tong)} / 100`)),
        ),
        bang,
      ),
    ),
  );

  const setMo = (v: boolean) => {
    dangMo = v;
    drawer.classList.toggle("open", v);
    drawer.setAttribute("aria-hidden", v ? "false" : "true");
    document.body.classList.toggle("drawer-locked", v);
  };

  drawer.querySelector(".drawer-close")!.addEventListener("click", () => setMo(false));
  drawer.querySelector(".drawer-backdrop")!.addEventListener("click", () => setMo(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dangMo) setMo(false);
  });

  const toggle = h("button", { class: "btn-ghost tc-toggle", type: "button" },
    "📄 Xem bản tự chấm");
  toggle.addEventListener("click", () => setMo(true));

  return { toggle, drawer };
}
