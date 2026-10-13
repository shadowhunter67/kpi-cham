import { h } from "../dom";

/** Bộ icon nét 2px dùng chung (SVG tĩnh, màu theo currentColor) — không phụ thuộc ảnh/thư viện ngoài. */
const PATHS = {
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.9.2 5 2.5 5 5.8"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2M12 17.2v.1"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  briefcase: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
  comment: '<path d="M4 5h16v11H9l-5 4z"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 24): HTMLElement {
  const el = h("span", { class: "login-ico" });
  el.innerHTML =
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
  return el;
}

/** Chữ cái đầu của 2 từ cuối trong họ tên ("Phan Thị Thanh Huyền" → "TH") — dùng làm ảnh đại diện chữ. */
export function chuCaiDau(hoTen: string): string {
  const tu = hoTen.trim().split(/\s+/).filter(Boolean);
  if (tu.length === 0) return "?";
  return tu.slice(-2).map((t) => t.charAt(0)).join("").toUpperCase();
}

export function avatar(hoTen: string, cls = ""): HTMLElement {
  return h("span", { class: `avatar ${cls}`.trim(), "aria-hidden": "true" }, chuCaiDau(hoTen));
}
