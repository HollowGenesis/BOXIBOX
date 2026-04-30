import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Order, Role, Notification, UserAccount } from "./types";

const ROLE_KEY = "production_role_v1";
const LOGGED_USER_KEY = "production_user_v1";

export interface LoggedUser {
  id: string;
  name: string;
  role: Role;
}

// ==================== Local Storage (device-specific) ====================

export function loadRole(): Role | null {
  const v = localStorage.getItem(ROLE_KEY);
  if (v === "manager" || v === "preparer" || v === "assembler") return v;
  return null;
}

export function saveRole(role: Role | null): void {
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
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

// ==================== Utility ====================

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function fileToCompressedDataUrl(
  file: File,
  maxSize = 800,
  quality = 0.4,
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
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==================== Firestore: Orders ====================

export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  return onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      const orders = snapshot.docs.map((d) => d.data() as Order);
      orders.sort((a, b) => b.updatedAt - a.updatedAt);
      callback(orders);
    },
    (error) => {
      console.error("Ошибка загрузки заказов:", error);
    },
  );
}

export async function saveOrder(order: Order): Promise<void> {
  await setDoc(doc(db, "orders", order.id), order);
}

export async function removeOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, "orders", id));
}

// ==================== Firestore: Accounts ====================

export function subscribeAccounts(callback: (accounts: UserAccount[]) => void): () => void {
  return onSnapshot(
    collection(db, "accounts"),
    (snapshot) => {
      const accounts = snapshot.docs.map((d) => d.data() as UserAccount);
      callback(accounts);
    },
    (error) => {
      console.error("Ошибка загрузки аккаунтов:", error);
    },
  );
}

export async function saveAccount(account: UserAccount): Promise<void> {
  await setDoc(doc(db, "accounts", account.id), account);
}

export async function removeAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, "accounts", id));
}

// ==================== Firestore: Notifications ====================

export function subscribeNotifications(callback: (notifs: Notification[]) => void): () => void {
  return onSnapshot(
    collection(db, "notifications"),
    (snapshot) => {
      const notifs = snapshot.docs.map((d) => d.data() as Notification);
      notifs.sort((a, b) => b.createdAt - a.createdAt);
      callback(notifs);
    },
    (error) => {
      console.error("Ошибка загрузки уведомлений:", error);
    },
  );
}

export async function addNotification(notif: Notification): Promise<void> {
  await setDoc(doc(db, "notifications", notif.id), notif);
}

export async function updateNotification(id: string, data: Partial<Notification>): Promise<void> {
  await setDoc(doc(db, "notifications", id), data, { merge: true });
}

export async function clearAllNotifications(): Promise<void> {
  const snapshot = await getDocs(collection(db, "notifications"));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
