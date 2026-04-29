import { useEffect, useState } from "react";
import type { Order, Role, Notification } from "./types";
import { 
  loadOrders, 
  loadRole, 
  saveOrders, 
  saveRole, 
  loadNotifications, 
  saveNotifications, 
  uid, 
  loadLoggedUser, 
  saveLoggedUser,
  LoggedUser
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
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications());
  const [screen, setScreen] = useState<Screen>({ name: "list" });

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveRole(role);
  }, [role]);

  useEffect(() => {
    saveLoggedUser(loggedUser);
    if (loggedUser) (window as any).loggedUserName = loggedUser.name;
  }, [loggedUser]);

  // Синхронизация между вкладками — имитация общего хранилища между разными ролями
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "production_orders_v1") {
        setOrders(loadOrders());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

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

  const upsertOrder = (order: Order) => {
    setOrders((prev) => {
      const oldOrder = prev.find((o) => o.id === order.id);
      
      // Логика уведомлений для менеджера
      if (oldOrder && role !== 'manager') {
        const newCommsCount = order.completionPhotos.length - oldOrder.completionPhotos.length;
        const statusChangedToDone = order.status === 'done' && oldOrder.status !== 'done';
        
        if (newCommsCount > 0 || statusChangedToDone) {
          const lastAtt = order.completionPhotos[order.completionPhotos.length - 1];
          const newNotif: Notification = {
            id: uid(),
            orderId: order.id,
            orderTitle: order.title,
            authorRole: lastAtt?.authorRole || (role as Role),
            authorName: lastAtt?.authorName,
            createdAt: Date.now(),
            isRead: false,
            type: statusChangedToDone ? "order_done" : "new_comment",
          };
          setNotifications(prevNotifs => [newNotif, ...prevNotifs].slice(0, 50));
        }
      }

      const exists = !!oldOrder;
      return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev];
    });
  };

  const deleteOrder = (id: string) => {
    if (role !== "manager") return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setScreen({ name: "list" });
  };

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
      setScreen({ name: "list" });
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

  const markNotifRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearNotifs = () => {
    setNotifications([]);
  };

  return (
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
  );
}
