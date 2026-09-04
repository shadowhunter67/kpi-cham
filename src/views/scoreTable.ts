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

/** "5 / 5" nếu đã có điểm, "—" nếu chưa — không bắt người dùng suy luận từ điểm tối đa hiển thị nơi khác. */
function fmtTren(v: number | null, max: number): string {
  return v == null ? "—" : `${fmt(v)} / ${max}`;
}

function dinhDangLucLuu(): string {
  const now = new Date();
  const gio = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const ngay = now.toLocaleDateString("vi-VN");
  return `lúc ${gio} ${ngay}`;
}

export type KetQuaLuu = { ok: true } | { ok: false; error: string };

export interface ScoreTableHandle {
  el: HTMLElement;
  progress: ProgressController | null;
  /** Có thay đổi đã nhập trên form nhưng chưa lưu xuống hệ thống hay chưa. */
  isDirty: () => boolean;
  /** Lưu nháp từ bên ngoài (dùng cho dialog "Bạn có thay đổi chưa lưu") — không tự điều hướng đi đâu. */
  luuNhap: () => Promise<KetQuaLuu>;
}

export function renderScoreTable(
  phieu: PhieuResp,
  onSaved: () => void,
  onProgress?: (done: number, total: number) => void,
  /** Gọi sau khi "Lưu nháp"/"Lưu thay đổi" thành công — KHÔNG tải lại từ
   * server (tránh nguy cơ đọc-ngay-sau-ghi bị trễ khiến trông như mất dữ
   * liệu), chỉ để nơi gọi (sidebar) tự vẽ lại từ `phieu` đã cập nhật tại chỗ. */
  onDraftSaved?: (phieu: PhieuResp) => void,
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
      renderSection("B. KPI THEO CHỨC DANH", "70 điểm", chenNhomPhuKpi(cards.slice(6))),
      phieu.nhanXet.to && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét Tổ: "), phieu.nhanXet.to),
      phieu.nhanXet.hoiDong && h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét Hội đồng: "), phieu.nhanXet.hoiDong),
    ));

    if (lane && daChot) {
      const chotLuc = lane === "hoiDong" ? phieu.chotLuc.hoiDong : phieu.chotLuc.to;
      const ketQua = h("div", { class: "save-feedback" });
      const btnMo = h("button", { class: "btn-ghost", type: "button" }, "Mở khóa để chỉnh sửa") as HTMLButtonElement;
      btnMo.addEventListener("click", () => {
        btnMo.disabled = true;
        ketQua.className = "save-feedback";
        ketQua.textContent = "Đang mở khóa…";
        const fn = lane === "hoiDong" ? api.moLaiHoiDong : api.moLaiTo;
        fn({ hoTen: phieu.hoTen, chucDanh: phieu.chucDanh, to: phieu.to })
          .then(() => { ketQua.className = "save-feedback ok"; ketQua.textContent = "✓ Đã mở khóa."; setTimeout(onSaved, 500); })
          .catch((err: unknown) => {
            btnMo.disabled = false;
            ketQua.className = "save-feedback loi";
            ketQua.textContent = err instanceof ApiError ? err.message : String(err);
          });
      });
      wrap.append(
        h("div", { class: "finalize-block" },
          h("div", { class: "chot-block" },
            h("p", { class: "chot-title" }, "✓ ĐÃ CHỐT"),
            h("p", {}, "Kết quả đánh giá đã được khóa, không thể chỉnh sửa điểm/nhận xét."),
            chotLuc && h("p", { class: "chot-luc" }, `Chốt lúc ${chotLuc}`),
          ),
        ),
        h("div", { class: "actions" }, btnMo, ketQua),
      );
    }
    return { el: wrap, progress: null, isDirty: () => false, luuNhap: () => Promise.resolve({ ok: true }) };
  }

  // ---- chế độ nhập điểm ----
  const inputs = new Map<string, HTMLInputElement>();
  const cardsByMa = new Map<string, HTMLElement>();
  let dirty = false;
  // Phiếu đã có sẵn ít nhất 1 điểm đã lưu từ trước → coi việc lưu tiếp theo
  // là "sửa", không phải "nháp lần đầu".
  let daTungLuu = phieu.rows.some((r) => diemHienCo(lane, r) != null);

  const layGiaTri = (ma: string): number | null => {
    const raw = inputs.get(ma)?.value.trim();
    if (raw === undefined || raw === "") return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };

  const progress = renderProgress(() => nhayToiTieuChiChuaCham());
  const btnLuu = h("button", { class: "btn-secondary", type: "button" }, "Lưu nháp") as HTMLButtonElement;
  const btnChot = h("button", { class: "btn-primary", type: "button" }, "Chốt & khóa") as HTMLButtonElement;
  const chotStatus = h("p", { class: "muc-note chot-status" });

  const capNhatNhanLuu = () => {
    btnLuu.textContent = daTungLuu ? "Lưu thay đổi" : "Lưu nháp";
  };

  const capNhatTienDo = () => {
    const done = phieu.rows.filter((r) => layGiaTri(r.ma) != null).length;
    const total = phieu.rows.length;
    progress.update(done, total);
    onProgress?.(done, total);

    const duDieuKienChot = done >= total;
    btnChot.disabled = !duDieuKienChot;
    if (duDieuKienChot) {
      chotStatus.className = "muc-note chot-status ok";
      chotStatus.textContent = `Đã nhập đủ ${total} / ${total} tiêu chí.`;
    } else {
      chotStatus.className = "muc-note chot-status warn";
      chotStatus.textContent = `Còn ${total - done} tiêu chí chưa chấm. Vui lòng chấm đủ trước khi chốt.`;
    }
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
    const input = h("input", {
      type: "number", min: "0", max: String(r.diemToiDa), step: "0.5", inputmode: "decimal",
      value: diemHienCo(lane, r) ?? "",
    }) as HTMLInputElement;
    input.addEventListener("focus", () => input.select());

    const warn = h("span", { class: "row-warn-msg" });
    const statusBadge = h("span", { class: "row-status-badge chua" }, "Chưa chấm");

    const card = h("div", { class: "row-card row-chua" },
      h("div", { class: "row-head" },
        h("span", { class: "row-ma" }, r.ma),
        h("div", { class: "row-head-right" },
          statusBadge,
          h("span", { class: "row-max" }, `Tối đa ${r.diemToiDa} điểm`),
        ),
      ),
      h("div", { class: "row-noidung" }, boNhan(r.ma, r.noiDung)),
      h("div", { class: "row-scores-line" },
        h("span", { class: "row-tu-cham" }, "Điểm cá nhân tự chấm: ", h("b", {}, fmtTren(r.diemTuCham, r.diemToiDa))),
        lane === "hoiDong" && h("span", { class: "row-tu-cham" }, "Tổ đã chấm: ", h("b", {}, fmtTren(r.diemTo, r.diemToiDa))),
        h("span", { class: "row-cham-chinh" },
          h("span", { class: "row-cham-label" }, `${nhanCham}:`),
          input,
          h("span", { class: "row-max-inline" }, `/ ${r.diemToiDa}`),
        ),
      ),
      warn,
    );

    const datTrangThai = (trangThai: "chua" | "da" | "invalid") => {
      card.classList.remove("row-chua", "row-da", "row-invalid");
      statusBadge.classList.remove("chua", "da");
      if (trangThai === "invalid") {
        card.classList.add("row-invalid");
        statusBadge.classList.add("chua");
        statusBadge.textContent = "Chưa chấm";
      } else if (trangThai === "da") {
        card.classList.add("row-da");
        statusBadge.classList.add("da");
        statusBadge.textContent = "✓ Đã nhập";
      } else {
        card.classList.add("row-chua");
        statusBadge.classList.add("chua");
        statusBadge.textContent = "Chưa chấm";
      }
    };

    const kiemTra = () => {
      const raw = input.value.trim();
      warn.textContent = "";

      if (raw === "") {
        datTrangThai("chua");
        capNhatTienDo();
        setDirty();
        return;
      }

      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > r.diemToiDa) {
        datTrangThai("invalid");
        warn.textContent = `Điểm phải từ 0 đến ${r.diemToiDa}.`;
        capNhatTienDo();
        setDirty();
        return;
      }

      datTrangThai("da");
      capNhatTienDo();
      setDirty();
    };

    input.addEventListener("input", kiemTra);
    input.addEventListener("focus", () => card.classList.add("row-focused"));
    input.addEventListener("blur", () => card.classList.remove("row-focused"));
    inputs.set(r.ma, input);
    cardsByMa.set(r.ma, card);
    // Khởi tạo trạng thái ban đầu (không tính là "có thay đổi").
    if (input.value.trim() !== "") datTrangThai("da");

    return card;
  });

  capNhatTienDo();
  capNhatNhanLuu();

  const nxLabel = lane === "hoiDong" ? "Nhận xét của Hội đồng" : "Nhận xét chung của Tổ";
  const nxValue = lane === "hoiDong" ? phieu.nhanXet.hoiDong : phieu.nhanXet.to;
  const nxInput = h("textarea", {
    rows: "5", value: nxValue,
    placeholder: "Nhập nhận xét chung về kết quả đánh giá...",
  }) as HTMLTextAreaElement;
  nxInput.addEventListener("input", setDirty);

  // Hội đồng cần thấy Tổ đã nhận xét gì trước khi tự viết nhận xét của
  // mình — hiện làm dòng tham khảo chỉ-đọc, không phải ô nhập.
  const nxCuaTo = lane === "hoiDong" && phieu.nhanXet.to
    ? h("div", { class: "readonly-block" }, h("b", {}, "Nhận xét của Tổ: "), phieu.nhanXet.to)
    : null;

  const feedback = h("span", { class: "save-feedback" });

  function setDirty() {
    dirty = true;
    feedback.className = "save-feedback dirty";
    feedback.textContent = "Có thay đổi chưa lưu.";
  }

  /**
   * Lưu (nháp hoặc chốt) xuống server.
   *
   * `goiOnSaved=true` CHỈ dùng cho Chốt — lúc đó cần tải lại thật từ
   * server để lấy trạng thái xác thực (đã khóa, thời điểm chốt...).
   *
   * Với "Lưu nháp"/"Lưu thay đổi" (`goiOnSaved=false`), KHÔNG gọi lại
   * server nữa — trước đây làm vậy từng khiến người dùng tưởng mất hết
   * dữ liệu vừa nhập nếu Apps Script/Sheets đọc-ngay-sau-ghi bị trễ,
   * trả về bản cũ trong lúc dữ liệu mới đã lưu thật trên Sheet. Thay
   * vào đó, cập nhật NGAY `phieu.rows`/`nhanXet` tại chỗ bằng đúng dữ
   * liệu vừa gửi lên — không có gì để đọc sai — rồi báo `onDraftSaved`
   * để sidebar tự vẽ lại.
   */
  const luuXuongServer = (
    fn: () => Promise<unknown>,
    okMsg: string,
    goiOnSaved: boolean,
    p: { diem: DiemItem[]; nhanXet: string },
  ): Promise<boolean> => {
    btnLuu.disabled = true;
    btnChot.disabled = true;
    feedback.className = "save-feedback";
    feedback.textContent = "Đang lưu…";
    return fn()
      .then(() => {
        dirty = false;
        daTungLuu = true;
        btnLuu.disabled = false;
        capNhatNhanLuu();

        for (const d of p.diem) {
          const row = phieu.rows.find((r) => r.ma === d.ma);
          if (!row) continue;
          if (lane === "hoiDong") row.diemHoiDong = d.diem;
          else row.diemTo = d.diem;
        }
        if (lane === "hoiDong") phieu.nhanXet.hoiDong = p.nhanXet;
        else phieu.nhanXet.to = p.nhanXet;
        onDraftSaved?.(phieu);
        // btnChot bị disabled tạm lúc "Đang lưu…" ở trên — tính lại đúng
        // theo tiến độ THẬT, đừng để mắc kẹt ở trạng thái disabled mãi
        // sau khi lưu thành công dù đã nhập đủ.
        capNhatTienDo();

        feedback.className = "save-feedback ok";
        feedback.textContent = `${okMsg} ${dinhDangLucLuu()}.`;
        if (goiOnSaved) setTimeout(onSaved, 700);
        return true;
      })
      .catch((err: unknown) => {
        btnLuu.disabled = false;
        capNhatTienDo();
        const msg = err instanceof ApiError ? err.message : String(err);
        feedback.className = "save-feedback loi";
        feedback.textContent = msg;
        if (err instanceof ApiError && err.canhBaoDangNhap) promptReauth();
        return false;
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
    void luuXuongServer(() => (lane === "hoiDong" ? api.luuDiemHoiDong(p) : api.luuDiemTo(p)), "✓ Đã lưu", false, p);
  });

  /** Lưu nháp gọi từ bên ngoài (dialog "Bạn có thay đổi chưa lưu") — trả kết quả rõ ràng, không tự điều hướng. */
  const luuNhap = (): Promise<KetQuaLuu> => {
    const p = payload();
    if (!p) return Promise.resolve({ ok: false, error: feedback.textContent || "Điểm nhập chưa hợp lệ." });
    return luuXuongServer(() => (lane === "hoiDong" ? api.luuDiemHoiDong(p) : api.luuDiemTo(p)), "✓ Đã lưu", false, p)
      .then((ok) => (ok ? { ok: true } : { ok: false, error: feedback.textContent || "Lưu thất bại." }));
  };

  btnChot.addEventListener("click", () => {
    // btnChot đã bị disabled khi chưa nhập đủ (xem capNhatTienDo) — đây chỉ
    // là lớp chặn phòng hờ, không phải luồng chính.
    const thieu = phieu.rows.filter((r) => layGiaTri(r.ma) == null);
    if (thieu.length > 0) return;

    const p = payload();
    if (!p) return;

    const tong = Math.round(p.diem.reduce((s, d) => s + d.diem, 0) * 100) / 100;
    const nhanDiem = lane === "hoiDong" ? "Điểm Hội đồng" : "Điểm Tổ";
    const modalBody = h("div", {},
      h("p", {}, "Sau khi chốt, kết quả sẽ được khóa và bạn không thể chỉnh sửa nếu chưa được mở khóa lại."),
      h("div", { class: "readonly-block" },
        h("p", {}, h("b", {}, "Người được chấm: "), phieu.hoTen),
        h("p", {}, h("b", {}, "Tiêu chí: "), `${p.diem.length} / ${phieu.rows.length}`),
        h("p", {}, h("b", {}, `${nhanDiem}: `), `${tong} / 100`),
      ),
    );

    const btnHuy = h("button", { class: "btn-ghost", type: "button" }, "Hủy");
    const btnXacNhan = h("button", { class: "btn-primary", type: "button" }, "Xác nhận chốt & khóa");
    modalBody.append(h("div", { class: "modal-actions" }, btnHuy, btnXacNhan));

    const modal = openModal("Chốt kết quả đánh giá?", modalBody);
    btnHuy.addEventListener("click", modal.close);
    btnXacNhan.addEventListener("click", () => {
      modal.close();
      void luuXuongServer(() => (lane === "hoiDong" ? api.chotHoiDong(p) : api.chotTo(p)), "✓ Đã chốt & khóa", true, p);
    });
  });

  wrap.append(...kids(
    progress.el,
    renderSection("A. TIÊU CHÍ CHUNG", "30 điểm", cards.slice(0, 6)),
    renderSection("B. KPI THEO CHỨC DANH", "70 điểm", chenNhomPhuKpi(cards.slice(6))),
    nxCuaTo,
    h("label", { class: "nx-field" }, h("span", {}, nxLabel), nxInput),
    chotStatus,
    h("div", { class: "actions" }, btnLuu, btnChot, feedback),
  ));

  return { el: wrap, progress, isDirty: () => dirty, luuNhap };
}

function renderSection(title: string, diem: string, cards: HTMLElement[]): HTMLElement {
  return h("div", { class: "criteria-section" },
    h("div", { class: "criteria-section-head" }, h("h3", {}, title), h("span", {}, diem)),
    h("div", { class: "rows-grid" }, ...cards),
  );
}

/**
 * 20 KPI theo chức danh chia làm 2 nhóm theo quy chế: 10 mục đầu là
 * "Nhóm cốt lõi" (tối đa 4đ/mục = 40đ), 10 mục sau là "Nhóm thường
 * xuyên" (tối đa 3đ/mục = 30đ). Chèn 1 dòng tiêu đề phụ ngay trước mỗi
 * nhóm để người chấm nhận ra ranh giới thay vì thấy 20 thẻ liền một
 * mạch.
 */
function chenNhomPhuKpi(cardsB: HTMLElement[]): HTMLElement[] {
  const nhomPhu = (nhan: string, phu: string) => h("div", { class: "kpi-subgroup-divider" }, nhan, h("span", {}, phu));
  return [
    nhomPhu("Nhóm cốt lõi", "10 mục · tối đa 4 điểm/mục · 40 điểm"),
    ...cardsB.slice(0, 10),
    nhomPhu("Nhóm thường xuyên", "10 mục · tối đa 3 điểm/mục · 30 điểm"),
    ...cardsB.slice(10),
  ];
}

function buildReadonlyCard(lane: Lane, r: DongPhieu): HTMLElement {
  const gia = diemHienCo(lane, r);
  const daCham = gia != null;
  // Badge chỉ nói "đã nhập hay chưa" — dòng riêng này in RÕ số điểm của
  // đúng lớp đang xem, không bắt người dùng suy luận từ badge.
  const nhanLane = lane === "hoiDong" ? "Điểm Hội đồng chấm" : lane === "to" ? "Điểm Tổ chấm" : null;

  return h("div", { class: `row-card ${daCham ? "row-da" : "row-chua"}` },
    h("div", { class: "row-head" },
      h("span", { class: "row-ma" }, r.ma),
      h("div", { class: "row-head-right" },
        h("span", { class: `row-status-badge ${daCham ? "da" : "chua"}` }, daCham ? "✓ Đã nhập" : "Chưa chấm"),
        h("span", { class: "row-max" }, `Tối đa ${r.diemToiDa} điểm`),
      ),
    ),
    h("div", { class: "row-noidung" }, boNhan(r.ma, r.noiDung)),
    h("div", { class: "row-scores-line" },
      nhanLane && h("span", { class: "row-tu-cham" }, `${nhanLane}: `, h("b", {}, fmtTren(gia, r.diemToiDa))),
      h("span", { class: "row-tu-cham" }, "Điểm cá nhân tự chấm: ", h("b", {}, fmtTren(r.diemTuCham, r.diemToiDa))),
      (lane === "hoiDong" || lane == null) &&
        h("span", { class: "row-tu-cham" }, "Tổ: ", h("b", {}, fmtTren(r.diemTo, r.diemToiDa))),
      lane == null && h("span", { class: "row-tu-cham" }, "Hội đồng: ", h("b", {}, fmtTren(r.diemHoiDong, r.diemToiDa))),
    ),
  );
}
