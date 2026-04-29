import { useEffect, useState } from "react";
import type { Order, Role, Notification } from "./types";
import {
  loadRole,
  saveRole,
  loadLoggedUser,
  saveLoggedUser,
  subscribeOrders,
  subscribeNotifications,
  saveOrder,
  removeOrder,
  processOrderImages,
  addNotification,
  updateNotification,
  clearAllNotifications,
  uid,
  LoggedUser,
} from "./storage";
import RoleSelect from "./components/RoleSelect";
import OrdersList from "./components/OrdersList";
import CreateOrder from "./components/CreateOrder";
import OrderDetail from "./components/OrderDetail";

type Screen =
  | { name: "list" }
  | { name: "create" }
  | { name: "detail"; orderId: string };

export default function App() {
  const [role, setRole] = useState<Role | null>(() => loadRole());
  const [loggedUser, setLoggedUser] = useState<LoggedUser | null>(() => loadLoggedUser());
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  const [saving, setSaving] = useState(false);

  // Subscribe to Firestore collections
  useEffect(() => {
    const unsubOrders = subscribeOrders(setOrders);
    const unsubNotifs = subscribeNotifications(setNotifications);
    return () => {
      unsubOrders();
      unsubNotifs();
    };
  }, []);

  useEffect(() => {
    saveRole(role);
  }, [role]);

  useEffect(() => {
    saveLoggedUser(loggedUser);
    if (loggedUser) (window as any).loggedUserName = loggedUser.name;
  }, [loggedUser]);

  if (!role) {
    return (
      <RoleSelect
        onSelect={(r, user) => {
          setRole(r);
          setLoggedUser(user);
          saveLoggedUser(user);
          (window as any).loggedUserName = user.name;
        }}
      />
    );
  }

  const upsertOrder = async (order: Order) => {
    setSaving(true);
    try {
      const oldOrder = orders.find((o) => o.id === order.id);

      // Upload base64 images to Firebase Storage
      const processed = await processOrderImages(order);

      // Create notification for manager if worker adds content
      if (oldOrder && role !== "manager") {
        const newCommsCount =
          processed.completionPhotos.length - oldOrder.completionPhotos.length;
        const statusChangedToDone =
          processed.status === "done" && oldOrder.status !== "done";

        if (newCommsCount > 0 || statusChangedToDone) {
          const lastAtt =
            processed.completionPhotos[processed.completionPhotos.length - 1];
          const newNotif: Notification = {
            id: uid(),
            orderId: processed.id,
            orderTitle: processed.title,
            authorRole: lastAtt?.authorRole || (role as Role),
            authorName: lastAtt?.authorName,
            createdAt: Date.now(),
            isRead: false,
            type: statusChangedToDone ? "order_done" : "new_comment",
          };
          await addNotification(newNotif);
        }
      }

      // Save to Firestore
      await saveOrder(processed);
    } catch (e) {
      console.error("Ошибка сохранения:", e);
      alert("Ошибка сохранения. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (id: string) => {
    if (role !== "manager") return;
    try {
      await removeOrder(id);
      setScreen({ name: "list" });
    } catch (e) {
      console.error("Ошибка удаления:", e);
      alert("Ошибка удаления.");
    }
  };

  const markNotifRead = async (id: string) => {
    await updateNotification(id, { isRead: true });
  };

  const clearNotifs = async () => {
    await clearAllNotifications();
  };

  // Determine content
  let content;

  if (screen.name === "create" && role === "manager") {
    content = (
      <CreateOrder
        onCancel={() => setScreen({ name: "list" })}
        onCreate={(o) => {
          upsertOrder(o);
          setScreen({ name: "list" });
        }}
      />
    );
  } else if (screen.name === "detail") {
    const order = orders.find((o) => o.id === screen.orderId);
    if (!order) {
      // Order was deleted or not found, go back
      if (screen.name === "detail") {
        setTimeout(() => setScreen({ name: "list" }), 0);
      }
      content = null;
    } else {
      content = (
        <OrderDetail
          order={order}
          role={role}
          onBack={() => setScreen({ name: "list" })}
          onUpdate={upsertOrder}
          onDelete={role === "manager" ? deleteOrder : undefined}
        />
      );
    }
  } else {
    content = (
      <OrdersList
        orders={orders}
        role={role}
        loggedUser={loggedUser}
        notifications={notifications}
        onOpen={(id) => setScreen({ name: "detail", orderId: id })}
        onReadNotif={markNotifRead}
        onClearNotifs={clearNotifs}
        onCreate={
          role === "manager" ? () => setScreen({ name: "create" }) : undefined
        }
        onLogout={() => {
          setRole(null);
          setLoggedUser(null);
          saveLoggedUser(null);
          setScreen({ name: "list" });
        }}
      />
    );
  }

  return (
    <>
      {content}
      {saving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-xl text-center">
            <div className="text-3xl mb-2 animate-bounce">📦</div>
            <p className="text-sm font-medium text-slate-700">Сохранение...</p>
          </div>
        </div>
      )}
    </>
  );
}
