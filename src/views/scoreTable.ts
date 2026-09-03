import { h, fmt, kids } from "../dom";
import { api, ApiError } from "../api";
import { promptReauth } from "../auth";
import type { DiemItem, DongPhieu, PhieuResp } from "../types";

type Lane = "to" | "hoiDong" | null;

/** Bỏ tiền tố mã lặp trong nội dung ("HT-20 — Thực hiện…" → "Thực hiện…"). */
function boNhan(ma: string, noiDung: string): string {
  const re = new RegExp(`^\\s*${ma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]\\s*`, "i");
  return noiDung.replace(re, "").trim() || noiDung;
}

function laneCua(phieu: PhieuResp): Lane {
  if (phieu.quyen.laHieuTruong) return "hoiDong";
  if (phieu.quyen.laNguoiChamTo) return "to";
  return null;
}

function diemHienCo(lane: Lane, r: DongPhieu): number | null {
  return lane === "hoiDong" ? r.diemHoiDong : r.diemTo;
}

function diemLopTruoc(lane: Lane, r: DongPhieu): number | null {
  return lane === "hoiDong" ? r.diemTo : r.diemTuCham;
}

export function renderScoreTable(phieu: PhieuResp, onSaved: () => void): HTMLElement {
  const lane = laneCua(phieu);
  const daChot = lane === "hoiDong"
    ? phieu.trangThai.hoiDong === "đã chốt"
    : lane === "to"
      ? phieu.trangThai.to === "đã chốt"
      : false;
  // Hội đồng phải chờ Tổ chốt xong.
  const choToChot = lane === "hoiDong" && phieu.quyen.hoiDongChoTo;
  const chiDoc = lane == null || daChot || choToChot;

  const inputs = new Map<string, HTMLInputElement>();
  const cards: HTMLElement[] = [];

  for (const r of phieu.rows) {
    const truoc = diemLopTruoc(lane, r);
    const nguong = r.diemToiDa * 0.25;

    const refs: HTMLElement[] = [
      h("span", {}, "Tự chấm: ", h("b", {}, fmt(r.diemTuCham))),
    ];
    if (lane === "hoiDong" || lane == null) {
      refs.push(h("span", {}, "Tổ: ", h("b", {}, fmt(r.diemTo))));
    }
    if (lane == null) {
      refs.push(h("span", {}, "Hội đồng: ", h("b", {}, fmt(r.diemHoiDong))));
    }

    const card = h("div", { class: "row-card" },
      h("div", { class: "row-head" },
        h("span", { class: "row-ma" }, r.ma),
        h("span", { class: "row-max" }, `tối đa ${r.diemToiDa}đ`),
      ),
      h("div", { class: "row-noidung" }, boNhan(r.ma, r.noiDung)),
      h("div", { class: "row-refs" }, ...refs),
    );

    if (!chiDoc) {
      const input = h("input", {
        type: "number",
        min: "0",
        max: String(r.diemToiDa),
        step: "0.5",
        inputmode: "decimal",
        value: diemHienCo(lane, r) ?? "",
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
        h("label", { class: "row-input" }, h("span", {}, "Bạn chấm"), input),
        warn,
      );
    }

    cards.push(card);
  }

  const nxLabel = lane === "hoiDong" ? "Nhận xét của Hội đồng" : "Nhận xét chung của Tổ";
  const nxValue = lane === "hoiDong" ? phieu.nhanXet.hoiDong : phieu.nhanXet.to;
  const nxInput = h("textarea", { rows: "3", value: nxValue }) as HTMLTextAreaElement;

  const ketQua = h("div", { class: "ket-qua" });
  const wrap = h("div", { class: "score-table" });

  // ---- chế độ chỉ đọc ----
  if (chiDoc) {
    const note = lane == null
      ? h("p", { class: "muc-note" }, "Bạn không được phân công chấm phiếu này — chế độ chỉ xem.")
      : choToChot
        ? h("p", { class: "muc-note warn" }, "Chờ Tổ bấm “Chốt & khóa” phiếu này rồi Hội đồng mới chấm được.")
        : h("p", { class: "muc-note warn" }, `Phiếu ${lane === "hoiDong" ? "Hội đồng" : "Tổ"} đã chốt.`);
    wrap.append(...kids(
      note,
      ...cards,
      phieu.nhanXet.to && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét Tổ: "), phieu.nhanXet.to),
      phieu.nhanXet.hoiDong && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét Hội đồng: "), phieu.nhanXet.hoiDong),
    ));

    if (lane && daChot) {
      const btnMo = h("button", { class: "btn-ghost", type: "button" }, "Mở lại phiếu") as HTMLButtonElement;
      btnMo.addEventListener("click", () => {
        btnMo.disabled = true;
        ketQua.className = "ket-qua";
        ketQua.textContent = "Đang mở lại…";
        const fn = lane === "hoiDong" ? api.moLaiHoiDong : api.moLaiTo;
        fn({ hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to })
          .then(() => { ketQua.className = "ket-qua ok"; ketQua.textContent = "Đã mở lại."; setTimeout(onSaved, 500); })
          .catch((err: unknown) => {
            btnMo.disabled = false;
            ketQua.className = "ket-qua loi";
            ketQua.textContent = err instanceof ApiError ? err.message : String(err);
          });
      });
      wrap.append(h("div", { class: "actions" }, btnMo), ketQua);
    }
    return wrap;
  }

  // ---- chế độ nhập ----
  const thuThap = (): DiemItem[] | null => {
    const out: DiemItem[] = [];
    for (const r of phieu.rows) {
      const raw = inputs.get(r.ma)!.value.trim();
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

  const btnLuu = h("button", { class: "btn-ghost", type: "button" }, "Lưu (chưa chốt)") as HTMLButtonElement;
  const btnChot = h("button", { class: "btn-primary", type: "button" }, "Chốt & khóa") as HTMLButtonElement;

  const chay = (fn: () => Promise<unknown>, ok: string) => {
    btnLuu.disabled = true;
    btnChot.disabled = true;
    ketQua.className = "ket-qua";
    ketQua.textContent = "Đang lưu…";
    fn()
      .then(() => { ketQua.className = "ket-qua ok"; ketQua.textContent = ok; setTimeout(onSaved, 600); })
      .catch((err: unknown) => {
        btnLuu.disabled = false;
        btnChot.disabled = false;
        const msg = err instanceof ApiError ? err.message : String(err);
        ketQua.className = "ket-qua loi";
        ketQua.textContent = msg;
        if (err instanceof ApiError && err.canhBaoDangNhap) promptReauth();
      });
  };

  const payload = () => {
    const diem = thuThap();
    if (!diem) return null;
    return {
      hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to,
      diem, nhanXet: nxInput.value,
    };
  };

  btnLuu.addEventListener("click", () => {
    const p = payload();
    if (!p) return;
    chay(() => (lane === "hoiDong" ? api.luuDiemHoiDong(p) : api.luuDiemTo(p)), "Đã lưu (chưa chốt).");
  });

  btnChot.addEventListener("click", () => {
    const p = payload();
    if (!p) return;
    if (!confirm("Chốt & khóa phiếu này? Sau khi chốt phải bấm “Mở lại” mới sửa được.")) return;
    chay(() => (lane === "hoiDong" ? api.chotHoiDong(p) : api.chotTo(p)), "Đã chốt & khóa.");
  });

  wrap.append(...kids(
    ...cards,
    h("label", { class: "nx-field" }, h("span", {}, nxLabel), nxInput),
    h("div", { class: "actions" }, btnLuu, btnChot),
    ketQua,
  ));

  return wrap;
}
