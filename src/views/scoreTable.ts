import { h, fmt, kids } from "../dom";
import { api, ApiError } from "../api";
import { promptReauth } from "../auth";
import type { DiemItem, DongPhieu, PhieuResp } from "../types";

type Mode = "to" | "hoiDong" | "hieuTruong" | "xem";

function modeCua(phieu: PhieuResp): Mode {
  if (phieu.vaiTro.hoiDong === "hiệu trưởng") return "hieuTruong";
  if (phieu.vaiTro.hoiDong === "thư ký") return "hoiDong";
  if (phieu.vaiTro.to) return "to";
  return "xem";
}

/** Lớp điểm mà người dùng đang chấm phải tham chiếu (để cảnh báo lệch lớn). */
function diemLopTruoc(mode: Mode, r: DongPhieu): number | null {
  if (mode === "to") return r.diemTuCham;
  if (mode === "hoiDong") return r.to.trungBinh;
  if (mode === "hieuTruong") return r.hoiDong.deXuat;
  return null;
}

function giaTriDangCo(mode: Mode, phieu: PhieuResp, r: DongPhieu): number | null {
  if (mode === "to") {
    return phieu.slotBanCham === 2 ? r.to.diem2 : r.to.diem1;
  }
  if (mode === "hoiDong") return r.hoiDong.deXuat;
  if (mode === "hieuTruong") return r.hoiDong.hieuTruong; // chỉ điền khi ghi đè
  return null;
}

export function renderScoreTable(phieu: PhieuResp, onSaved: () => void): HTMLElement {
  const mode = modeCua(phieu);
  const daChot = phieu.trangThai === "đã chốt";
  const chiDoc = mode === "xem" || (mode === "hoiDong" && daChot);

  const inputs = new Map<string, HTMLInputElement>();
  const cards: HTMLElement[] = [];

  for (const r of phieu.rows) {
    const truoc = diemLopTruoc(mode, r);
    const nguong = r.diemToiDa * 0.25;

    const refs: HTMLElement[] = [
      h("span", {}, "Tự chấm: ", h("b", {}, fmt(r.diemTuCham))),
    ];
    if (mode === "hoiDong" || mode === "hieuTruong" || mode === "xem") {
      refs.push(h("span", {}, "Tổ (TB): ", h("b", {}, fmt(r.to.trungBinh)),
        ` (${fmt(r.to.diem1)} / ${fmt(r.to.diem2)})`));
    }
    if (mode === "to") {
      const kia = phieu.slotBanCham === 2 ? r.to.diem1 : r.to.diem2;
      refs.push(h("span", {}, "Người chấm kia: ", h("b", {}, fmt(kia))));
    }
    if (mode === "hieuTruong" || mode === "xem") {
      refs.push(h("span", {}, "Hội đồng: ", h("b", {}, fmt(r.hoiDong.deXuat))));
    }
    if (mode === "xem") {
      refs.push(h("span", {}, "Chốt: ", h("b", {}, fmt(r.hoiDong.chot))));
    }

    const card = h("div", { class: "row-card" },
      h("div", { class: "row-head" },
        h("span", { class: "row-ma" }, r.ma),
        h("span", { class: "row-max" }, `tối đa ${r.diemToiDa}đ`),
      ),
      h("div", { class: "row-noidung" }, r.noiDung),
      h("div", { class: "row-refs" }, ...refs),
    );

    if (!chiDoc) {
      const input = h("input", {
        type: "number",
        min: "0",
        max: String(r.diemToiDa),
        step: "0.5",
        inputmode: "decimal",
        value: giaTriDangCo(mode, phieu, r) ?? "",
        placeholder: mode === "hieuTruong" ? "(giữ nguyên hội đồng)" : "",
      }) as HTMLInputElement;

      const warn = h("span", { class: "row-warn-msg" });
      const kiemTra = () => {
        const raw = input.value.trim();
        card.classList.remove("row-invalid", "row-warn");
        warn.textContent = "";
        if (raw === "") return;
        const v = Number(raw);
        if (!Number.isFinite(v) || v < 0 || v > r.diemToiDa) {
          card.classList.add("row-invalid");
          warn.textContent = `Nhập số trong khoảng 0–${r.diemToiDa}`;
          return;
        }
        if (truoc != null && Math.abs(v - truoc) >= nguong) {
          card.classList.add("row-warn");
          warn.textContent = `Lệch ${fmt(Math.abs(v - truoc))}đ so với lớp trước — kiểm tra lại`;
        }
      };
      input.addEventListener("input", kiemTra);
      kiemTra();

      inputs.set(r.ma, input);
      card.append(
        h("label", { class: "row-input" },
          h("span", {}, mode === "hieuTruong" ? "Ghi đè" : "Bạn chấm"),
          input,
        ),
        warn,
      );
    }

    cards.push(card);
  }

  // ---- vùng nhận xét ----
  const nxLabel =
    mode === "hieuTruong" ? "Nhận xét của Hiệu trưởng"
      : mode === "hoiDong" ? "Nhận xét chung của Hội đồng"
        : mode === "to" ? "Nhận xét chung của Tổ"
          : "Nhận xét";
  const nxValue =
    mode === "hieuTruong" ? phieu.nhanXet.hieuTruong
      : mode === "hoiDong" ? phieu.nhanXet.hoiDong
        : phieu.nhanXet.to;

  const nxInput = h("textarea", { rows: "3", value: nxValue }) as HTMLTextAreaElement;

  const lyDoInput = h("textarea", {
    rows: "2", value: phieu.nhanXet.lyDo,
    placeholder: "Bắt buộc nếu có ghi đè điểm so với hội đồng",
  }) as HTMLTextAreaElement;

  const ketQua = h("div", { class: "ket-qua" });

  // ---- nút lưu ----
  const wrap = h("div", { class: "score-table" });

  if (chiDoc) {
    const lyDo = phieu.nhanXet.lyDo
      ? h("div", { class: "readonly-block" }, h("b", {}, "Lý do điều chỉnh: "), phieu.nhanXet.lyDo)
      : null;
    wrap.append(...kids(
      mode === "xem"
        ? h("p", { class: "muc-note" }, "Chế độ chỉ xem.")
        : h("p", { class: "muc-note warn" }, "Phiếu đã được Hiệu trưởng chốt — nhờ Hiệu trưởng bấm “Mở lại” nếu cần sửa."),
      ...cards,
      phieu.nhanXet.hoiDong && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét hội đồng: "), phieu.nhanXet.hoiDong),
      phieu.nhanXet.hieuTruong && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét hiệu trưởng: "), phieu.nhanXet.hieuTruong),
      lyDo,
    ));
    return wrap;
  }

  const thuThapDiem = (): DiemItem[] | null => {
    const out: DiemItem[] = [];
    for (const r of phieu.rows) {
      const input = inputs.get(r.ma)!;
      const raw = input.value.trim();
      if (raw === "") continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > r.diemToiDa) {
        ketQua.className = "ket-qua loi";
        ketQua.textContent = `Điểm mã ${r.ma} không hợp lệ (0–${r.diemToiDa}).`;
        return null;
      }
      out.push({ ma: r.ma, diem: v });
    }
    return out;
  };

  const chay = async (fn: () => Promise<unknown>, thanhCong: string) => {
    btnLuu.disabled = true;
    if (btnMoLai) btnMoLai.disabled = true;
    ketQua.className = "ket-qua";
    ketQua.textContent = "Đang lưu…";
    try {
      await fn();
      ketQua.className = "ket-qua ok";
      ketQua.textContent = thanhCong;
      setTimeout(onSaved, 600);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      ketQua.className = "ket-qua loi";
      ketQua.textContent = msg;
      if (err instanceof ApiError && err.canhBaoDangNhap) promptReauth();
    } finally {
      btnLuu.disabled = false;
      if (btnMoLai) btnMoLai.disabled = false;
    }
  };

  const btnLuu = h("button", { class: "btn-primary", type: "button" },
    mode === "hieuTruong" ? "Chốt & khóa phiếu" : "Lưu điểm & nhận xét",
  ) as HTMLButtonElement;

  const btnMoLai =
    mode === "hieuTruong" && daChot
      ? (h("button", { class: "btn-ghost", type: "button" }, "Mở lại phiếu") as HTMLButtonElement)
      : null;

  btnLuu.addEventListener("click", () => {
    const p = { hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to };

    if (mode === "to") {
      const diem = thuThapDiem();
      if (!diem) return;
      void chay(() => api.luuDiemTo({ ...p, diem, nhanXet: nxInput.value }), "Đã lưu điểm Tổ.");
      return;
    }

    if (mode === "hoiDong") {
      const diem = thuThapDiem();
      if (!diem) return;
      void chay(() => api.luuDiemHoiDong({ ...p, diem, nhanXet: nxInput.value }), "Đã lưu điểm Hội đồng (trạng thái: đề xuất).");
      return;
    }

    // hieuTruong: chỉ gửi các mã ghi đè khác điểm đề xuất
    const ghiDe: DiemItem[] = [];
    for (const r of phieu.rows) {
      const raw = inputs.get(r.ma)!.value.trim();
      if (raw === "") continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > r.diemToiDa) {
        ketQua.className = "ket-qua loi";
        ketQua.textContent = `Điểm mã ${r.ma} không hợp lệ.`;
        return;
      }
      if (r.hoiDong.deXuat == null || v !== r.hoiDong.deXuat) ghiDe.push({ ma: r.ma, diem: v });
    }
    if (ghiDe.length && !lyDoInput.value.trim()) {
      ketQua.className = "ket-qua loi";
      ketQua.textContent = "Có ghi đè điểm — bắt buộc nhập Lý do điều chỉnh.";
      lyDoInput.focus();
      return;
    }
    void chay(
      () => api.chotHieuTruong({ ...p, ghiDe, lyDo: lyDoInput.value, nhanXet: nxInput.value }),
      "Đã chốt và khóa phiếu.",
    );
  });

  btnMoLai?.addEventListener("click", () => {
    void chay(
      () => api.moLaiHieuTruong({ hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to }),
      "Đã mở lại phiếu (trạng thái: đề xuất).",
    );
  });

  wrap.append(...kids(
    ...cards,
    h("label", { class: "nx-field" }, h("span", {}, nxLabel), nxInput),
    mode === "hieuTruong" && h("label", { class: "nx-field" }, h("span", {}, "Lý do điều chỉnh"), lyDoInput),
    h("div", { class: "actions" }, btnLuu, btnMoLai),
    ketQua,
  ));

  return wrap;
}
