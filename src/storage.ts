import type { Order, Role, Notification } from "./types";

const ORDERS_KEY = "production_orders_v1";
const NOTIFS_KEY = "production_notifs_v1";
const ROLE_KEY = "production_role_v1";
const ACCOUNTS_KEY = "production_accounts_v1";
const LOGGED_USER_KEY = "production_user_v1";

export interface LoggedUser {
  id: string;
  name: string;
  role: Role;
}

export function loadAccounts(): any[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: any[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadLoggedUser(): LoggedUser | null {
  try {
    const raw = localStorage.getItem(LOGGED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLoggedUser(user: LoggedUser | null): void {
  if (user) localStorage.setItem(LOGGED_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(LOGGED_USER_KEY);
}

export function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifs: Notification[]): void {
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Не удалось сохранить заказы", e);
    alert("Не удалось сохранить данные. Возможно, переполнено хранилище браузера.");
  }
}

export function loadRole(): Role | null {
  const v = localStorage.getItem(ROLE_KEY);
  if (v === "manager" || v === "preparer" || v === "assembler") return v;
  return null;
}

export function saveRole(role: Role | null): void {
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Сжатие изображения в base64 JPEG, чтобы поместилось в localStorage
export async function fileToCompressedDataUrl(
  file: File,
  maxSize = 1600,
  quality = 0.78,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
