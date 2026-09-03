import { h } from "../dom";

export interface ProgressController {
  el: HTMLElement;
  /** Cập nhật số tiêu chí đã nhập / tổng số — gọi lại mỗi khi người dùng gõ điểm. */
  update(done: number, total: number): void;
}

/**
 * ProgressSummary — thanh tiến độ lớn, dễ nhìn: "17 / 20 tiêu chí",
 * progress bar, "Còn N tiêu chí chưa chấm" + nút nhảy tới tiêu chí kế
 * tiếp chưa chấm (onJumpNext do CriteriaSection cung cấp).
 */
export function renderProgress(onJumpNext: () => void): ProgressController {
  const track = h("div", { class: "progress-track" }, h("div", { class: "progress-fill" }));
  const fill = track.querySelector(".progress-fill") as HTMLElement;
  const count = h("p", { class: "progress-count" });
  const remaining = h("span", { class: "progress-remaining" });

  const btnJump = h("button", { class: "btn-link", type: "button" },
    "Đi đến tiêu chí chưa chấm tiếp theo →");
  btnJump.addEventListener("click", onJumpNext);

  const el = h("div", { class: "progress-box" },
    h("p", { class: "progress-title" }, "Tiến độ chấm"),
    count,
    track,
    h("div", { class: "progress-row" }, remaining, btnJump),
  );

  const update = (done: number, total: number) => {
    count.textContent = `${done} / ${total} tiêu chí đã hoàn thành`;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    fill.style.width = pct + "%";
    fill.classList.toggle("full", done >= total);

    const con = total - done;
    if (con > 0) {
      remaining.textContent = `Còn ${con} tiêu chí chưa chấm`;
      remaining.classList.remove("done");
      btnJump.style.display = "";
    } else {
      remaining.textContent = "Đã chấm đủ tất cả tiêu chí";
      remaining.classList.add("done");
      btnJump.style.display = "none";
    }
  };

  return { el, update };
}
