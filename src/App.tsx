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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubOrders = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    const unsubNotifs = subscribeNotifications(setNotifications);
    return () => {
      unsubOrders();
      unsubNotifs();
    };
  }, []);

  useEffect(() => { saveRole(role); }, [role]);

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

      if (oldOrder && role !== "manager") {
        const newCommsCount = order.completionPhotos.length - oldOrder.completionPhotos.length;
        const statusChangedToDone = order.status === "done" && oldOrder.status !== "done";
        if (newCommsCount > 0 || statusChangedToDone) {
          const lastAtt = order.completionPhotos[order.completionPhotos.length - 1];
          await addNotification({
            id: uid(),
            orderId: order.id,
            orderTitle: order.title,
            authorRole: lastAtt?.authorRole || (role as Role),
            authorName: lastAtt?.authorName,
            createdAt: Date.now(),
            isRead: false,
            type: statusChangedToDone ? "order_done" : "new_comment",
          });
        }
      }

      await saveOrder(order);
    } catch (e) {
      console.error("Ошибка сохранения:", e);
      alert("Ошибка сохранения. Проверьте интернет.");
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
      console.error(e);
      alert("Ошибка удаления.");
    }
  };

  const markNotifRead = async (id: string) => {
    try { await updateNotification(id, { isRead: true }); } catch (e) { console.error(e); }
  };

  const clearNotifs = async () => {
    try { await clearAllNotifications(); } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">📦</div>
          <p className="text-slate-600 font-medium">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (screen.name === "create" && role === "manager") {
    return (
      <CreateOrder
        onCancel={() => setScreen({ name: "list" })}
        onCreate={(o) => {
          upsertOrder(o);
          setScreen({ name: "list" });
        }}
      />
    );
  }

  if (screen.name === "detail") {
    const order = orders.find((o) => o.id === screen.orderId);
    if (!order) {
      setTimeout(() => setScreen({ name: "list" }), 0);
      return null;
    }
    return (
      <OrderDetail
        order={order}
        role={role}
        onBack={() => setScreen({ name: "list" })}
        onUpdate={upsertOrder}
        onDelete={role === "manager" ? deleteOrder : undefined}
      />
    );
  }

  return (
    <>
      <OrdersList
        orders={orders}
        role={role}
        loggedUser={loggedUser}
        notifications={notifications}
        onOpen={(id) => setScreen({ name: "detail", orderId: id })}
        onReadNotif={markNotifRead}
        onClearNotifs={clearNotifs}
        onCreate={role === "manager" ? () => setScreen({ name: "create" }) : undefined}
        onLogout={() => {
          setRole(null);
          setLoggedUser(null);
          saveLoggedUser(null);
          setScreen({ name: "list" });
        }}
      />
      {saving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-xl text-center">
            <div className="text-3xl mb-2 animate-spin">⏳</div>
            <p className="text-sm font-medium text-slate-700">Сохранение...</p>
          </div>
        </div>
      )}
    </>
  );
}
