import { useState, useEffect } from "react";
import type { AssignedTo, Order, UserAccount } from "../types";
import { uid, loadAccounts } from "../storage";
import PhotoPicker from "./PhotoPicker";

interface Props {
  onCreate: (order: Order) => void;
  onCancel: () => void;
}

export default function CreateOrder({ onCreate, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<AssignedTo>("preparer");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{ dataUrl: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  useEffect(() => {
    setAccounts(loadAccounts() as UserAccount[]);
  }, []);

  useEffect(() => {
    setSelectedUserIds([]);
  }, [assignedTo]);

  const filteredAccounts = accounts.filter((acc) => acc.role === assignedTo);

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const canSubmit = photos.length > 0;

  const submit = () => {
    if (!canSubmit) {
      alert("Прикрепите хотя бы одно фото заказа");
      return;
    }
    const now = Date.now();
    const order: Order = {
      id: uid(),
      title: title.trim() || `Заказ от ${new Date(now).toLocaleDateString("ru-RU")}`,
      assignedTo,
      assignedUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      assignedUserNames: selectedUserIds.length > 0 
        ? filteredAccounts.filter(acc => selectedUserIds.includes(acc.id)).map(acc => acc.name) 
        : undefined,
      status: "new",
      createdAt: now,
      updatedAt: now,
      managerComment: comment.trim() || undefined,
      taskPhotos: photos.map((p) => ({
        id: uid(),
        dataUrl: p.dataUrl,
        name: p.name,
        createdAt: now,
        authorRole: "manager",
      })),
      completionPhotos: [],
    };
    onCreate(order);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          aria-label="Назад"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Новый заказ</h1>
      </header>

      <div className="flex-1 space-y-4 p-4 pb-32">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Название заказа</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Шляпные коробки 300×300×150 мм"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Кому назначить (роль)</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAssignedTo("preparer")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition ${
                assignedTo === "preparer"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              ✂️ Заготовщики
            </button>
            <button
              onClick={() => setAssignedTo("assembler")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition ${
                assignedTo === "assembler"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              📦 Сборщики
            </button>
          </div>
        </div>

        {filteredAccounts.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Выбрать сотрудников (можно несколько)
            </label>
            <div className="grid grid-cols-2 gap-2">
  
              {filteredAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleUser(acc.id)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition ${
                    selectedUserIds.includes(acc.id)
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span>{acc.avatar || "👤"}</span>
                  <span className="truncate">{acc.name}</span>
                  {selectedUserIds.includes(acc.id) && <span className="text-indigo-600">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Фото маршрутной карты <span className="text-rose-500">*</span>
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <PhotoPicker
              onPhotos={(p) => setPhotos((prev) => [...prev, ...p])}
              label="Добавьте маршрутную карту"
            />
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                    <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Комментарий по заказу</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Дополнительные указания для сотрудников..."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4 shadow-lg">
        <div className="mx-auto max-w-md">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-base font-semibold text-white shadow-md shadow-indigo-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            Создать новый заказ
          </button>
        </div>
      </div>
    </div>
  );
}
