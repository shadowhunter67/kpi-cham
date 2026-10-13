import { h } from "../dom";
import { icon, avatar } from "./icons";
import type { PhieuResp } from "../types";

/**
 * KpiPersonHeader — trả lời ngay 3 câu hỏi đầu: đang chấm cho ai, kỳ
 * nào, trạng thái Tổ/Hội đồng đã chốt chưa. Đặt cố định ở đầu bảng
 * chấm; `id` để IntersectionObserver ở main.ts biết khi nào cuộn khỏi
 * màn hình mà hiện sticky-eval-bar.
 */
export function renderPersonHeader(phieu: PhieuResp): HTMLElement {
  const toDaChot = phieu.trangThai.to === "đã chốt";
  const hdDaChot = phieu.trangThai.hoiDong === "đã chốt";

  const meta = (ic: Parameters<typeof icon>[0], text: string) =>
    h("span", { class: "person-meta-item" }, icon(ic, 20), text);

  return h("div", { class: "person-header", id: "person-header" },
    avatar(phieu.hoTen, "avatar-xl"),
    h("div", { class: "person-body" },
      h("h2", {}, phieu.hoTen),
      h("p", { class: "person-role" }, `${phieu.chucDanh} · ${phieu.to}`),
      h("div", { class: "person-meta" },
        meta("calendar", `Kỳ đánh giá ${phieu.ky}`),
        phieu.tuCham.thoiGianNop && meta("clock", `Nộp Form lúc ${phieu.tuCham.thoiGianNop}`),
        phieu.tuCham.nhiemVuKiemNhiem && meta("briefcase", `Kiêm nhiệm: ${phieu.tuCham.nhiemVuKiemNhiem}`),
      ),
      h("div", { class: "badge-row" },
        h("span", { class: `badge ${toDaChot ? "badge-ok" : "badge-warn"}` },
          `Tổ: ${toDaChot ? "Đã chốt" : "Chưa chốt"}`),
        h("span", { class: `badge ${hdDaChot ? "badge-ok" : "badge-warn"}` },
          `Hội đồng: ${hdDaChot ? "Đã chốt" : "Chưa chốt"}`),
      ),
    ),
  );
}
