import { CONFIG } from "./config";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

let idToken: string | null = null;
let onToken: ((token: string) => void) | null = null;

export function getToken(): string | null {
  return idToken;
}

export function clearToken(): void {
  idToken = null;
}

/** Chờ thư viện GIS (accounts.google.com/gsi/client) nạp xong. */
function waitForGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.id) return resolve();
      if (Date.now() - started > 10000) {
        return reject(new Error("Không tải được Google đăng nhập. Kiểm tra kết nối mạng."));
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

/**
 * Khởi tạo GIS. `handler` được gọi mỗi khi có ID token mới
 * (đăng nhập lần đầu hoặc đăng nhập lại sau khi hết hạn).
 */
export async function initAuth(handler: (token: string) => void): Promise<void> {
  onToken = handler;
  await waitForGis();
  window.google.accounts.id.initialize({
    client_id: CONFIG.googleClientId,
    callback: (resp: { credential?: string }) => {
      if (resp.credential) {
        idToken = resp.credential;
        onToken?.(resp.credential);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: false,
  });
}

/** Vẽ nút "Đăng nhập bằng Google" của GIS vào container. */
export function renderSignInButton(container: HTMLElement): void {
  container.replaceChildren();
  window.google.accounts.id.renderButton(container, {
    type: "standard",
    theme: "filled_blue",
    size: "large",
    text: "signin_with",
    locale: "vi",
  });
  window.google.accounts.id.prompt();
}

/** Gọi khi API báo token hết hạn — buộc chọn lại tài khoản. */
export function promptReauth(): void {
  idToken = null;
  window.google?.accounts?.id?.prompt();
}
