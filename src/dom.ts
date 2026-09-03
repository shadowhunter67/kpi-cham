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
