import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Order, Role, Notification, UserAccount, Attachment } from "./types";

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

// Download — works with both data: URLs and https: URLs
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (!url) return;
  if (url.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }
}

// ==================== Firebase Storage (images) ====================

export async function uploadImage(dataUrl: string, path: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function processOrderImages(order: Order): Promise<Order> {
  const processAttachments = async (
    atts: Attachment[],
    folder: string,
  ): Promise<Attachment[]> => {
    return Promise.all(
      atts.map(async (att) => {
        if (att.dataUrl && att.dataUrl.startsWith("data:")) {
          const url = await uploadImage(
            att.dataUrl,
            `orders/${order.id}/${folder}/${att.id}`,
          );
          return { ...att, dataUrl: url };
        }
        return att;
      }),
    );
  };

  return {
    ...order,
    taskPhotos: await processAttachments(order.taskPhotos, "task"),
    completionPhotos: await processAttachments(order.completionPhotos, "completion"),
  };
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
