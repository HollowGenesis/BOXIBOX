export type Role = "manager" | "preparer" | "assembler";

export type AssignedTo = "preparer" | "assembler";

export type OrderStatus = "new" | "in_progress" | "done";

export interface Attachment {
  id: string;
  dataUrl: string; // base64
  name: string;
  createdAt: number;
  authorRole: Role;
  authorName?: string;
  comment?: string;
}

export interface ManagerComment {
  id: string;
  text: string;
  createdAt: number;
}

export interface Order {
  id: string;
  title: string;
  assignedTo: AssignedTo;
  assignedUserIds?: string[];
  assignedUserNames?: string[];
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  taskPhotos: Attachment[]; // фото заданий от менеджера
  managerComment?: string;
  managerComments?: ManagerComment[]; // дополнительные комментарии менеджера
  completionPhotos: Attachment[]; // фото от сотрудников по готовому заказу
}

export interface Notification {
  id: string;
  orderId: string;
  orderTitle: string;
  authorRole: Role;
  authorName?: string;
  createdAt: number;
  isRead: boolean;
  type: "new_comment" | "order_done";
}

export interface UserAccount {
  id: string;
  name: string;
  role: "preparer" | "assembler";
  password: string;
  avatar?: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  manager: "Менеджер (Дарья)",
  preparer: "Заготовщик",
  assembler: "Сборщик",
};

export const ASSIGNED_LABEL: Record<AssignedTo, string> = {
  preparer: "Заготовщики",
  assembler: "Сборщики",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  done: "Выполнен",
};
