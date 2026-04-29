import { useMemo, useState } from "react";
import type { AssignedTo, Order, Role } from "../types";
import { ASSIGNED_LABEL, ROLE_LABEL, STATUS_LABEL } from "../types";

import NotificationsMenu from "./NotificationsMenu";
import AccountsMenu from "./AccountsMenu";
import type { Notification } from "../types";
import { LoggedUser } from "../storage";

interface Props {
  orders: Order[];
  role: Role;
  loggedUser: LoggedUser | null;
  notifications: Notification[];
  onOpen: (id: string) => void;
  onCreate?: () => void;
  onLogout: () => void;
  onReadNotif: (id: string) => void;
  onClearNotifs: () => void;
}

type FilterTab = "new" | "in_progress" | "done" | "all";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн назад`;
  return new Date(ts).toLocaleDateString("ru-RU");
}

function statusBadge(s: Order["status"]) {
  const map: Record<Order["status"], string> = {
    new: "bg-sky-100 text-sky-700",
    in_progress: "bg-amber-100 text-amber-700",
    done: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}

export default function OrdersList({ 
  orders, 
  role, 
  loggedUser,
  notifications,
  onOpen, 
  onCreate, 
  onLogout,
  onReadNotif,
  onClearNotifs
}: Props) {
  const [tab, setTab] = useState<FilterTab>("new");
  const [groupFilter, setGroupFilter] = useState<AssignedTo | "all">("all");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const myOrders = useMemo(() => {
    let list = orders;
    if (role === "preparer") {
      list = list.filter((o) => o.assignedTo === "preparer" && (!o.assignedUserIds || o.assignedUserIds.includes(loggedUser?.id || "")));
    }
    if (role === "assembler") {
      list = list.filter((o) => o.assignedTo === "assembler" && (!o.assignedUserIds || o.assignedUserIds.includes(loggedUser?.id || "")));
    }
    if (role === "manager" && groupFilter !== "all") {
      list = list.filter((o) => o.assignedTo === groupFilter);
    }
    if (tab === "new") list = list.filter((o) => o.status === "new");
    if (tab === "in_progress") list = list.filter((o) => o.status === "in_progress");
    if (tab === "done") list = list.filter((o) => o.status === "done");
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [orders, role, tab, groupFilter, loggedUser]);

  const counts = useMemo(() => {
    let scope = orders;
    if (role === "preparer") {
      scope = scope.filter((o) => o.assignedTo === "preparer" && (!o.assignedUserIds || o.assignedUserIds.includes(loggedUser?.id || "")));
    }
    if (role === "assembler") {
      scope = scope.filter((o) => o.assignedTo === "assembler" && (!o.assignedUserIds || o.assignedUserIds.includes(loggedUser?.id || "")));
    }
    if (role === "manager" && groupFilter !== "all")
      scope = scope.filter((o) => o.assignedTo === groupFilter);
    return {
      new: scope.filter((o) => o.status === "new").length,
      in_progress: scope.filter((o) => o.status === "in_progress").length,
      done: scope.filter((o) => o.status === "done").length,
      all: scope.length,
    };
  }, [orders, role, groupFilter, loggedUser]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">{ROLE_LABEL[role]}</div>
            <h1 className="text-lg font-bold text-slate-900">Заказы по МК</h1>
          </div>
          <div className="flex items-center gap-2">
            {role === "manager" && (
              <>
                <button
                  onClick={() => setShowAccounts(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                  title="Управление аккаунтами"
                >
                  <span className="text-xl">👥</span>
                </button>
                <button
                  onClick={() => setShowNotifs(true)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}
            <button
              onClick={onLogout}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Выйти
            </button>
          </div>
        </div>

        {showNotifs && (
          <NotificationsMenu
            notifications={notifications}
            onClose={() => setShowNotifs(false)}
            onSelect={(orderId, notifId) => {
              onReadNotif(notifId);
              setShowNotifs(false);
              onOpen(orderId);
            }}
            onClear={onClearNotifs}
          />
        )}

        {showAccounts && role === "manager" && (
          <AccountsMenu onClose={() => setShowAccounts(false)} />
        )}

        {role === "manager" && (
          <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["all", "preparer", "assembler"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                  groupFilter === g
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                {g === "all" ? "Все" : ASSIGNED_LABEL[g]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["new", "in_progress", "done", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              {t === "new" && `Новые (${counts.new})`}
              {t === "in_progress" && `В работе (${counts.in_progress})`}
              {t === "done" && `Готовые (${counts.done})`}
              {t === "all" && `Все (${counts.all})`}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-4 pb-28">
        {myOrders.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📭
            </div>
            <p className="font-medium text-slate-700">Нет новых заказов</p>
            <p className="mt-1 text-sm text-slate-500">
              {role === "manager" ? "Создайте первый заказ" : "Заказов для вас пока нет"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => onOpen(o.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.99] hover:shadow-md"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {o.taskPhotos[0]?.dataUrl ? (
                    <img
                      src={o.taskPhotos[0].dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
<div className="flex h-full w-full items-center justify-center text-2xl">
                        📦
                      </div>
                  )}
                  {o.taskPhotos.length > 1 && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      +{o.taskPhotos.length - 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{o.title}</h3>
                    {statusBadge(o.status)}
                  </div>
                  <div className="mt-1 flex items-center flex-wrap gap-2 text-xs text-slate-500">
                    <span>{ASSIGNED_LABEL[o.assignedTo]}</span>
                    {o.assignedUserNames && o.assignedUserNames.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-indigo-600 bg-indigo-50 px-1 rounded">
                          👥 {o.assignedUserNames.join(", ")}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>{timeAgo(o.updatedAt)}</span>
                  </div>
                  {o.managerComment && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{o.managerComment}</p>
                  )}
                  {o.completionPhotos.length > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span>📤</span> {o.completionPhotos.length} отчёт(ов)
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {role === "manager" && onCreate && (
        <button
          onClick={onCreate}
          className="fixed bottom-5 right-5 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-white shadow-xl shadow-indigo-300 transition active:scale-95"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="font-semibold">Новый заказ</span>
        </button>
      )}
    </div>
  );
}
