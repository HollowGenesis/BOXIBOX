import type { Notification } from "../types";
import { ROLE_LABEL } from "../types";

interface Props {
  notifications: Notification[];
  onClose: () => void;
  onSelect: (orderId: string, notifId: string) => void;
  onClear: () => void;
}

export default function NotificationsMenu({ notifications, onClose, onSelect, onClear }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="ml-auto flex h-full w-full max-w-[300px] flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold text-slate-900">Уведомления</h2>
          <button onClick={onClose} className="p-1 text-slate-400">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="mb-2 text-4xl">🔔</span>
              <p className="text-sm">Нет новых уведомлений</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onSelect(n.orderId, n.id)}
                  className={`flex w-full flex-col p-4 text-left transition hover:bg-slate-50 ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-indigo-600 uppercase">
                      {n.type === "order_done" ? "✅ Готов" : "💬 Отчёт"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900 line-clamp-1">{n.orderTitle}</div>
                  <div className="text-xs text-slate-500">
                    {ROLE_LABEL[n.authorRole]} {n.authorName && <span className="text-slate-600">({n.authorName})</span>} добавил инфо
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-slate-100 p-3">
            <button
              onClick={onClear}
              className="w-full rounded-lg py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              Очистить всё
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
