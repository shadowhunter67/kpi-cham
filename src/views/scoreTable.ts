import { h, fmt, kids, openModal } from "../dom";
import { api, ApiError } from "../api";
import { promptReauth } from "../auth";
import { boNhan } from "./text";
import { renderProgress, type ProgressController } from "./progress";
import type { DiemItem, DongPhieu, PhieuResp } from "../types";

export type Lane = "to" | "hoiDong" | null;

export function laneCua(phieu: PhieuResp): Lane {
  if (phieu.quyen.laHieuTruong) return "hoiDong";
  if (phieu.quyen.laNguoiChamTo) return "to";
  return null;
}

/** Điểm đã lưu của lớp đang chấm (KHÔNG phải giá trị đang gõ dở). */
export function diemHienCo(lane: Lane, r: DongPhieu): number | null {
  return lane === "hoiDong" ? r.diemHoiDong : r.diemTo;
}

function diemLopTruoc(lane: Lane, r: DongPhieu): number | null {
  return lane === "hoiDong" ? r.diemTo : r.diemTuCham;
}

export interface ScoreTableHandle {
  el: HTMLElement;
  progress: ProgressController | null;
}

export function renderScoreTable(
  phieu: PhieuResp,
  onSaved: () => void,
  onProgress?: (done: number, total: number) => void,
): ScoreTableHandle {
  const lane = laneCua(phieu);
  const daChot = lane === "hoiDong"
    ? phieu.trangThai.hoiDong === "đã chốt"
    : lane === "to"
      ? phieu.trangThai.to === "đã chốt"
      : false;
  const choToChot = lane === "hoiDong" && phieu.quyen.hoiDongChoTo;
  const chiDoc = lane == null || daChot || choToChot;

  const wrap = h("div", { class: "score-table" });

  // ---- chế độ chỉ đọc ----
  if (chiDoc) {
    const cards = phieu.rows.map((r) => buildReadonlyCard(lane, r));
    const note = lane == null
      ? h("p", { class: "muc-note" }, "Bạn không được phân công chấm phiếu này — chế độ chỉ xem.")
      : choToChot
        ? h("p", { class: "muc-note warn" }, "Chờ Tổ bấm “Chốt & khóa” phiếu này rồi Hội đồng mới chấm được.")
        : h("p", { class: "muc-note warn" }, `Phiếu ${lane === "hoiDong" ? "Hội đồng" : "Tổ"} đã chốt.`);

    wrap.append(...kids(
      note,
      renderSection("A. TIÊU CHÍ CHUNG", "30 điểm", cards.slice(0, 6)),
      renderSection("B. KPI THEO CHỨC DANH", "70 điểm", cards.slice(6)),
      phieu.nhanXet.to && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét Tổ: "), phieu.nhanXet.to),
      phieu.nhanXet.hoiDong && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét Hội đồng: "), phieu.nhanXet.hoiDong),
    ));

    if (lane && daChot) {
      const ketQua = h("div", { class: "save-feedback" });
      const btnMo = h("button", { class: "btn-ghost", type: "button" }, "Mở lại phiếu") as HTMLButtonElement;
      btnMo.addEventListener("click", () => {
        btnMo.disabled = true;
        ketQua.className = "save-feedback";
        ketQua.textContent = "Đang mở lại…";
        const fn = lane === "hoiDong" ? api.moLaiHoiDong : api.moLaiTo;
        fn({ hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to })
          .then(() => { ketQua.className = "save-feedback ok"; ketQua.textContent = "Đã mở lại."; setTimeout(onSaved, 500); })
          .catch((err: unknown) => {
            btnMo.disabled = false;
            ketQua.className = "save-feedback loi";
            ketQua.textContent = err instanceof ApiError ? err.message : String(err);
          });
      });
      wrap.append(h("div", { class: "actions" }, btnMo, ketQua));
    }
    return { el: wrap, progress: null };
  }

  // ---- chế độ nhập điểm ----
  const inputs = new Map<string, HTMLInputElement>();
  const cardsByMa = new Map<string, HTMLElement>();

  const layGiaTri = (ma: string): number | null => {
    const raw = inputs.get(ma)?.value.trim();
    if (raw === undefined || raw === "") return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };

  const progress = renderProgress(() => nhayToiTieuChiChuaCham());

  const capNhatTienDo = () => {
    const done = phieu.rows.filter((r) => layGiaTri(r.ma) != null).length;
    progress.update(done, phieu.rows.length);
    onProgress?.(done, phieu.rows.length);
  };

  function nhayToiTieuChiChuaCham() {
    const target = phieu.rows.find((r) => layGiaTri(r.ma) == null);
    if (!target) return;
    const card = cardsByMa.get(target.ma);
    const input = inputs.get(target.ma);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus();
  }

  const nhanCham = lane === "hoiDong" ? "Điểm Hội đồng chấm" : "Điểm Tổ chấm";

  const cards = phieu.rows.map((r) => {
    const truoc = diemLopTruoc(lane, r);
    const nguong = r.diemToiDa * 0.25;

    const input = h("input", {
      type: "number", min: "0", max: String(r.diemToiDa), step: "0.5", inputmode: "decimal",
      value: diemHienCo(lane, r) ?? "",
    }) as HTMLInputElement;
    input.addEventListener("focus", () => input.select());

    const warn = h("span", { class: "row-warn-msg" });
    const status = h("p", { class: "row-status chua" }, "Chưa chấm");

    const card = h("div", { class: "row-card" },
      h("div", { class: "row-head" },
        h("span", { class: "row-ma" }, r.ma),
        h("span", { class: "row-max" }, `Tối đa ${r.diemToiDa} điểm`),
      ),
      h("div", { class: "row-noidung" }, boNhan(r.ma, r.noiDung)),
      h("div", { class: "row-scores-line" },
        h("span", { class: "row-tu-cham" }, "Điểm tự chấm: ", h("b", {}, fmt(r.diemTuCham))),
        lane === "hoiDong" && h("span", { class: "row-tu-cham" }, "Tổ đã chấm: ", h("b", {}, fmt(r.diemTo))),
        h("span", { class: "row-cham-chinh" },
          h("span", { class: "row-cham-label" }, `${nhanCham}:`),
          input,
          h("span", { class: "row-max-inline" }, `/ ${r.diemToiDa}`),
        ),
      ),
      status,
      warn,
    );

    const kiemTra = () => {
      const raw = input.value.trim();
      card.classList.remove("row-invalid", "row-warn", "row-done");
      warn.textContent = "";

      if (raw === "") {
        status.textContent = "Chưa chấm";
        status.className = "row-status chua";
        capNhatTienDo();
        setDirty();
        return;
      }

      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > r.diemToiDa) {
        card.classList.add("row-invalid");
        warn.textContent = `Điểm phải từ 0 đến ${r.diemToiDa}.`;
        status.textContent = "Chưa chấm";
        status.className = "row-status chua";
        capNhatTienDo();
        setDirty();
        return;
      }

      card.classList.add("row-done");
      status.textContent = "✓ Đã chấm";
      status.className = "row-status da";

      if (truoc != null && Math.abs(v - truoc) >= nguong) {
        card.classList.add("row-warn");
        warn.textContent = `Lệch ${fmt(Math.abs(v - truoc))} điểm so với lớp trước — kiểm tra lại.`;
      }
      capNhatTienDo();
      setDirty();
    };

    input.addEventListener("input", kiemTra);
    inputs.set(r.ma, input);
    cardsByMa.set(r.ma, card);
    // Khởi tạo trạng thái ban đầu (không tính là "có thay đổi").
    const raw0 = input.value.trim();
    if (raw0 !== "") { card.classList.add("row-done"); status.textContent = "✓ Đã chấm"; status.className = "row-status da"; }

    return card;
  });

  capNhatTienDo();

  const nxLabel = lane === "hoiDong" ? "Nhận xét của Hội đồng" : "Nhận xét chung của Tổ";
  const nxValue = lane === "hoiDong" ? phieu.nhanXet.hoiDong : phieu.nhanXet.to;
  const nxInput = h("textarea", {
    rows: "5", value: nxValue,
    placeholder: "Nhập nhận xét chung về kết quả đánh giá...",
  }) as HTMLTextAreaElement;
  nxInput.addEventListener("input", setDirty);

  const feedback = h("span", { class: "save-feedback" });

  function setDirty() {
    feedback.className = "save-feedback dirty";
    feedback.textContent = "Có thay đổi chưa lưu.";
  }

  const finalizeBox = h("div", { class: "finalize-block" });

  const btnLuu = h("button", { class: "btn-secondary", type: "button" }, "Lưu nháp") as HTMLButtonElement;
  const btnChot = h("button", { class: "btn-primary", type: "button" }, "Chốt & khóa") as HTMLButtonElement;

  const chay = (fn: () => Promise<unknown>, okMsg: string) => {
    btnLuu.disabled = true;
    btnChot.disabled = true;
    feedback.className = "save-feedback";
    feedback.textContent = "Đang lưu…";
    fn()
      .then(() => {
        feedback.className = "save-feedback ok";
        const gio = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        feedback.textContent = `${okMsg} Đã lưu lúc ${gio}.`;
        setTimeout(onSaved, 700);
      })
      .catch((err: unknown) => {
        btnLuu.disabled = false;
        btnChot.disabled = false;
        const msg = err instanceof ApiError ? err.message : String(err);
        feedback.className = "save-feedback loi";
        feedback.textContent = msg;
        if (err instanceof ApiError && err.canhBaoDangNhap) promptReauth();
      });
  };

  const thuThapDiemHopLe = (): DiemItem[] | null => {
    const out: DiemItem[] = [];
    for (const r of phieu.rows) {
      const raw = inputs.get(r.ma)!.value.trim();
      if (raw === "") continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > r.diemToiDa) {
        feedback.className = "save-feedback loi";
        feedback.textContent = `Điểm mã ${r.ma} không hợp lệ (0–${r.diemToiDa}).`;
        return null;
      }
      out.push({ ma: r.ma, diem: v });
    }
    return out;
  };

  const payload = () => {
    const diem = thuThapDiemHopLe();
    if (!diem) return null;
    return { hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to, diem, nhanXet: nxInput.value };
  };

  btnLuu.addEventListener("click", () => {
    const p = payload();
    if (!p) return;
    chay(() => (lane === "hoiDong" ? api.luuDiemHoiDong(p) : api.luuDiemTo(p)), "Đã lưu nháp.");
  });

  btnChot.addEventListener("click", () => {
    const thieu = phieu.rows.filter((r) => layGiaTri(r.ma) == null);

    finalizeBox.replaceChildren();

    if (thieu.length > 0) {
      const btnDi = h("button", { class: "btn-link", type: "button" }, "Đi đến tiêu chí chưa chấm →");
      btnDi.addEventListener("click", nhayToiTieuChiChuaCham);
      finalizeBox.append(
        h("div", { class: "finalize-warning" },
          h("strong", {}, "Chưa thể chốt kết quả"),
          `Bạn còn ${thieu.length} tiêu chí chưa chấm.`,
          h("br", {}), btnDi,
        ),
      );
      return;
    }

    const p = payload();
    if (!p) return;

    const tong = Math.round(p.diem.reduce((s, d) => s + d.diem, 0) * 100) / 100;
    const modalBody = h("div", {},
      h("p", {}, "Sau khi chốt, bạn sẽ không thể sửa điểm nếu không được mở khóa lại."),
      h("div", { class: "readonly-block" },
        h("p", {}, h("b", {}, "Người được chấm: "), phieu.hoTen),
        h("p", {}, h("b", {}, "Số tiêu chí: "), `${p.diem.length} / ${phieu.rows.length}`),
        h("p", {}, h("b", {}, "Tổng điểm: "), `${tong} / 100`),
      ),
    );

    const btnHuy = h("button", { class: "btn-ghost", type: "button" }, "Hủy");
    const btnXacNhan = h("button", { class: "btn-primary", type: "button" }, "Xác nhận chốt & khóa");
    modalBody.append(h("div", { class: "modal-actions" }, btnHuy, btnXacNhan));

    const modal = openModal("Chốt kết quả đánh giá?", modalBody);
    btnHuy.addEventListener("click", modal.close);
    btnXacNhan.addEventListener("click", () => {
      modal.close();
      chay(() => (lane === "hoiDong" ? api.chotHoiDong(p) : api.chotTo(p)), "Đã chốt & khóa.");
    });
  });

  wrap.append(...kids(
    progress.el,
    renderSection("A. TIÊU CHÍ CHUNG", "30 điểm", cards.slice(0, 6)),
    renderSection("B. KPI THEO CHỨC DANH", "70 điểm", cards.slice(6)),
    h("label", { class: "nx-field" }, h("span", {}, nxLabel), nxInput),
    finalizeBox,
    h("div", { class: "actions" }, btnLuu, btnChot, feedback),
  ));

  return { el: wrap, progress };
}

function renderSection(title: string, diem: string, cards: HTMLElement[]): HTMLElement {
  return h("div", { class: "criteria-section" },
    h("div", { class: "criteria-section-head" }, h("h3", {}, title), h("span", {}, diem)),
    h("div", { class: "rows-grid" }, ...cards),
  );
}

function buildReadonlyCard(lane: Lane, r: DongPhieu): HTMLElement {
  const gia = diemHienCo(lane, r);

  return h("div", { class: `row-card${gia != null ? " row-done" : ""}` },
    h("div", { class: "row-head" },
      h("span", { class: "row-ma" }, r.ma),
      h("span", { class: "row-max" }, `Tối đa ${r.diemToiDa} điểm`),
    ),
    h("div", { class: "row-noidung" }, boNhan(r.ma, r.noiDung)),
    h("div", { class: "row-scores-line" },
      h("span", { class: "row-tu-cham" }, "Điểm tự chấm: ", h("b", {}, fmt(r.diemTuCham))),
      (lane === "hoiDong" || lane == null) &&
        h("span", { class: "row-tu-cham" }, "Tổ: ", h("b", {}, fmt(r.diemTo))),
      lane == null && h("span", { class: "row-tu-cham" }, "Hội đồng: ", h("b", {}, fmt(r.diemHoiDong))),
    ),
    h("p", { class: `row-status ${gia != null ? "da" : "chua"}` }, gia != null ? "✓ Đã chấm" : "Chưa chấm"),
  );
}
