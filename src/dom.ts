type Attrs = Record<string, unknown>;
export type Child = Node | string | number | null | undefined | false;

/** Lọc bỏ null/false/undefined để dùng với el.append(...). */
export function kids(...children: Child[]): (Node | string)[] {
  return children
    .flat()
    .filter((c): c is Node | string | number => c != null && c !== false)
    .map((c) => (c instanceof Node ? c : String(c)));
}

/** Tạo phần tử gọn nhẹ, không cần framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = String(v);
    else if (k === "dataset") Object.assign(el.dataset, v as object);
    else if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k in el) {
      // @ts-expect-error - gán thuộc tính DOM động
      el[k] = v;
    } else {
      el.setAttribute(k, String(v));
    }
  }

  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }

  return el;
}

export function mount(node: Node): void {
  const app = document.getElementById("app")!;
  app.replaceChildren(node);
}

export function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(Math.round(n * 100) / 100);
}

/**
 * Modal đơn giản, 1 tầng scroll (nội dung dài thì tự cuộn theo backdrop,
 * không tạo scroll lồng trong scroll). Đóng bằng nút X, bấm ra ngoài,
 * hoặc phím Esc.
 */
export function openModal(
  title: string,
  body: Node,
  opts?: { wide?: boolean; subtitle?: string },
): { close: () => void } {
  const trigger = document.activeElement as HTMLElement | null;

  const backdrop = h("div", { class: "modal-backdrop" },
    h("div", { class: "modal-box", style: opts?.wide ? "width:min(820px,100%)" : "" },
      h("div", { class: "modal-head" },
        h("div", {},
          h("h3", {}, title),
          opts?.subtitle && h("p", { class: "modal-subtitle" }, opts.subtitle),
        ),
        h("button", { class: "modal-close", type: "button", "aria-label": "Đóng" }, "✕"),
      ),
      h("div", { class: "modal-body" }, body),
    ),
  );

  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
    trigger?.focus();
  };

  const focusablesSel = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const box = backdrop.querySelector(".modal-box") as HTMLElement;
  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = Array.from(box.querySelectorAll<HTMLElement>(focusablesSel));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); else trapTab(e); };

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close")!.addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  document.body.appendChild(backdrop);
  (backdrop.querySelector(".modal-close") as HTMLElement)?.focus();
  return { close };
}
