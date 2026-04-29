import { useState, useEffect } from "react";
import type { Attachment, Order, Role, UserAccount, ManagerComment } from "../types";
import { ASSIGNED_LABEL, ROLE_LABEL, STATUS_LABEL } from "../types";
import { downloadDataUrl, uid, loadAccounts } from "../storage";
import PhotoPicker from "./PhotoPicker";

interface Props {
  order: Order;
  role: Role;
  onBack: () => void;
  onUpdate: (order: Order) => void;
  onDelete?: (id: string) => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(s: Order["status"]) {
  const map: Record<Order["status"], string> = {
    new: "bg-sky-100 text-sky-700 border-sky-200",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}

export default function OrderDetail({ order, role, onBack, onUpdate, onDelete }: Props) {
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{ dataUrl: string; name: string }[]>([]);
  const [viewer, setViewer] = useState<Attachment | null>(null);

  const canWork = role === "preparer" || role === "assembler";
  // сотрудник может работать с заказом, если назначение совпадает
  const isAssignedToMe =
    (role === "preparer" && order.assignedTo === "preparer") ||
    (role === "assembler" && order.assignedTo === "assembler");

  const submitCompletion = () => {
    if (photos.length === 0 && !comment.trim()) {
      alert("Прикрепите фото или напишите комментарий");
      return;
    }
    const now = Date.now();
    const authorName = (window as any).loggedUserName || ROLE_LABEL[role];
    const newAtts: Attachment[] = photos.map((p, idx) => ({
      id: uid(),
      dataUrl: p.dataUrl,
      name: p.name,
      createdAt: now,
      authorRole: role,
      authorName,
      // комментарий привязываем к первой фото; если фото нет — создаём «текстовое вложение»
      comment: idx === 0 ? comment.trim() || undefined : undefined,
    }));

    let attachments = [...order.completionPhotos, ...newAtts];

    // если только комментарий без фото — добавим запись с пустым dataUrl? нет, лучше сохраним как комментарий-вложение с маркером
    if (photos.length === 0 && comment.trim()) {
      attachments = [
        ...order.completionPhotos,
        {
          id: uid(),
          dataUrl: "",
          name: "comment",
          createdAt: now,
          authorRole: role,
          authorName,
          comment: comment.trim(),
        },
      ];
    }

    const updated: Order = {
      ...order,
      completionPhotos: attachments,
      status: "in_progress",
      updatedAt: now,
    };
    onUpdate(updated);
    setComment("");
    setPhotos([]);
  };

  const markDone = () => {
    onUpdate({ ...order, status: "done", updatedAt: Date.now() });
  };

  const reopen = () => {
    onUpdate({ ...order, status: "in_progress", updatedAt: Date.now() });
  };

  const deleteCompletion = (attachmentId: string) => {
    if (!confirm("Удалить этот комментарий/фото?")) return;
    const updatedPhotos = order.completionPhotos.filter((a) => a.id !== attachmentId);
    onUpdate({
      ...order,
      completionPhotos: updatedPhotos,
      updatedAt: Date.now(),
    });
  };

  const downloadAtt = (a: Attachment) => {
    if (!a.dataUrl) return;
    const ext = a.dataUrl.includes("image/png") ? "png" : "jpg";
    const safeName = a.name && a.name !== "comment" ? a.name : `order-${order.id}-${a.id}.${ext}`;
    downloadDataUrl(a.dataUrl, safeName.endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`);
  };

  const [showAddUsers, setShowAddUsers] = useState(false);
  const [allAccounts, setAllAccounts] = useState<UserAccount[]>([]);

  useEffect(() => {
    if (role === 'manager') {
      setAllAccounts(loadAccounts() as UserAccount[]);
    }
  }, [role]);

  const toggleUserInOrder = (userId: string, userName: string) => {
    const currentIds = order.assignedUserIds || [];
    const currentNames = order.assignedUserNames || [];
    
    let nextIds: string[];
    let nextNames: string[];

    if (currentIds.includes(userId)) {
      nextIds = currentIds.filter(id => id !== userId);
      nextNames = currentNames.filter(name => name !== userName);
    } else {
      nextIds = [...currentIds, userId];
      nextNames = [...currentNames, userName];
    }

    onUpdate({
      ...order,
      assignedUserIds: nextIds.length > 0 ? nextIds : undefined,
      assignedUserNames: nextNames.length > 0 ? nextNames : undefined,
      updatedAt: Date.now()
    });
  };

  const duplicateOrder = (selectedAssemblerIds: string[]) => {
    const now = Date.now();
    const newOrder: Order = {
      id: uid(),
      title: `Заготовки: ${order.title}`,
      assignedTo: "assembler",
      assignedUserIds: selectedAssemblerIds.length > 0 ? selectedAssemblerIds : undefined,
      assignedUserNames: selectedAssemblerIds.length > 0 
        ? allAccounts.filter(acc => selectedAssemblerIds.includes(acc.id)).map(acc => acc.name)
        : undefined,
      status: "new",
      createdAt: now,
      updatedAt: now,
      managerComment: order.managerComment,
      managerComments: order.managerComments ? [...order.managerComments] : undefined,
      taskPhotos: order.taskPhotos.map(p => ({...p, id: uid(), createdAt: now})),
      completionPhotos: order.completionPhotos.map(p => ({...p, id: uid(), createdAt: now})),
    };
    onUpdate(newOrder);
    setShowDuplicateModal(false);
    setSelectedAssemblerIds([]);
  };

  // Добавление комментария менеджером
  const [newManagerComment, setNewManagerComment] = useState("");
  const addManagerComment = () => {
    if (!newManagerComment.trim()) return;
    const newComment: ManagerComment = {
      id: uid(),
      text: newManagerComment.trim(),
      createdAt: Date.now(),
    };
    onUpdate({
      ...order,
      managerComments: [...(order.managerComments || []), newComment],
      updatedAt: Date.now(),
    });
    setNewManagerComment("");
  };

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedAssemblerIds, setSelectedAssemblerIds] = useState<string[]>([]);

  const handleDuplicate = () => {
    if (selectedAssemblerIds.length === 0) {
      alert("Выберите хотя бы одного сборщика");
      return;
    }
    duplicateOrder(selectedAssemblerIds);
  };

  const toggleAssembler = (id: string) => {
    setSelectedAssemblerIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          aria-label="Назад"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">{order.title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{ASSIGNED_LABEL[order.assignedTo]}</span>
            <span className="text-xs text-slate-300">•</span>
            {statusBadge(order.status)}
          </div>
        </div>
        {role === "manager" && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowAddUsers(!showAddUsers)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${showAddUsers ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Добавить сотрудников"
            >
              👥
            </button>
            {order.assignedTo === "preparer" && order.status === "done" && (
              <button
                onClick={() => setShowDuplicateModal(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                title="Передать сборщикам"
              >
                📦
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm("Удалить этот заказ?")) onDelete(order.id);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"
                aria-label="Удалить"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </header>

      {showAddUsers && role === 'manager' && (
        <div className="bg-white border-b border-slate-200 p-4 animate-in slide-in-from-top duration-200">
          <div className="text-xs font-bold text-slate-500 uppercase mb-3">Добавить сотрудников к заказу</div>
          <div className="flex flex-wrap gap-2">
            {allAccounts.filter(acc => acc.role === order.assignedTo).map(acc => {
              const isActive = (order.assignedUserIds || []).includes(acc.id);
              return (
                <button
                  key={acc.id}
                  onClick={() => toggleUserInOrder(acc.id, acc.name)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-100 bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>{acc.avatar || "👤"}</span>
                  <span>{acc.name}</span>
                  {isActive && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-5 p-4 pb-32">
        {/* Задание */}
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">📋 Состав заказа</h2>
            <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
          </div>
          {order.managerComment && (
            <div className="rounded-lg bg-indigo-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {order.managerComment}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {order.taskPhotos.map((a) => (
              <PhotoTile key={a.id} att={a} onClick={() => setViewer(a)} onDownload={() => downloadAtt(a)} />
            ))}
          </div>
        </section>

        {/* Готовый заказ */}
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">✅ Готовность заказа</h2>
          {order.completionPhotos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-500">
              Пока нет комментариев по заказу
            </p>
          ) : (
            <div className="space-y-3">
              {order.completionPhotos.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{a.authorName || ROLE_LABEL[a.authorRole]}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatDate(a.createdAt)}</span>
                      <button
                        onClick={() => deleteCompletion(a.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {a.dataUrl && (
                    <PhotoTile att={a} onClick={() => setViewer(a)} onDownload={() => downloadAtt(a)} large />
                  )}
                  {a.comment && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-sm text-slate-700">
                      {a.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Форма отправки выполнения для сотрудников */}
        {canWork && isAssignedToMe && order.status !== "done" && (
          <section className="space-y-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4">
            <h2 className="text-sm font-semibold text-emerald-900">📤 Добавить фото</h2>
            <PhotoPicker
              onPhotos={(p) => setPhotos((prev) => [...prev, ...p])}
              label="Сфотографируйте готовый заказ"
            />
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                    <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий (необязательно)..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={submitCompletion}
                className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow active:scale-95"
              >
                Добавить комментарий
              </button>
              <button
                onClick={() => {
                  if (confirm("Отметить заказ как полностью собранный?")) markDone();
                }}
                className="rounded-xl border border-emerald-600 bg-white py-3 text-sm font-semibold text-emerald-700 active:scale-95"
              >
                Заказ готов ✓
              </button>
            </div>
          </section>
        )}

        {/* Комментарии менеджера */}
        {(order.managerComments && order.managerComments.length > 0 || role === "manager") && (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">💬 Комментарии менеджера</h2>
            {order.managerComments && order.managerComments.length > 0 ? (
              <div className="space-y-2">
                {order.managerComments.map((mc) => (
                  <div key={mc.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500 mb-1">
                      {new Date(mc.createdAt).toLocaleString("ru-RU")}
                    </div>
                    <p className="text-sm text-slate-700">{mc.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Комментариев пока нет</p>
            )}
            {role === "manager" && (
              <div className="pt-2 border-t border-slate-100">
                <textarea
                  value={newManagerComment}
                  onChange={(e) => setNewManagerComment(e.target.value)}
                  placeholder="Добавить комментарий к заказу..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={addManagerComment}
                  disabled={!newManagerComment.trim()}
                  className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition active:scale-95"
                >
                  Добавить комментарий
                </button>
              </div>
            )}
          </section>
        )}

        {canWork && isAssignedToMe && order.status === "done" && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-medium text-emerald-800">✅ Заказ готов</p>
            <button
              onClick={reopen}
              className="mt-2 text-xs font-medium text-emerald-700 underline"
            >
              Открыть снова
            </button>
          </section>
        )}

        {canWork && !isAssignedToMe && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            Эта партия назначена группе «{ASSIGNED_LABEL[order.assignedTo]}»
          </section>
        )}
      </div>

      {/* Полноэкранный просмотр фото */}
      {viewer && viewer.dataUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          onClick={() => setViewer(null)}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <button onClick={() => setViewer(null)} className="rounded-full bg-white/10 px-4 py-2 text-sm">
              ✕ Закрыть
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadAtt(viewer);
              }}
              className="rounded-full bg-white/10 px-4 py-2 text-sm"
            >
              ⬇ Скачать
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-3">
            <img src={viewer.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}

      {/* Модальное окно дублирования заказа */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDuplicateModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Передать сборщикам</h3>
              <button onClick={() => setShowDuplicateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Выберите сборщиков для выполнения этого заказа:</p>
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-60 overflow-y-auto">
              {allAccounts.filter(acc => acc.role === "assembler").map(acc => {
                const isActive = selectedAssemblerIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    onClick={() => toggleAssembler(acc.id)}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-100 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span>{acc.avatar || "👤"}</span>
                    <span>{acc.name}</span>
                    {isActive && <span>✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700"
              >
                Отмена
              </button>
              <button
                onClick={handleDuplicate}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow active:scale-95"
              >
                Передать ({selectedAssemblerIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoTile({
  att,
  onClick,
  onDownload,
  large = false,
}: {
  att: Attachment;
  onClick: () => void;
  onDownload: () => void;
  large?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${large ? "aspect-video" : "aspect-square"}`}>
      <button onClick={onClick} className="block h-full w-full">
        <img src={att.dataUrl} alt="" className="h-full w-full object-cover" />
      </button>
      <button
        onClick={onDownload}
        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow active:scale-95"
        aria-label="Скачать"
        title="Скачать на устройство"
      >
        ⬇
      </button>
    </div>
  );
}
