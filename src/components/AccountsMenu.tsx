import { useState, useEffect } from "react";
import type { UserAccount } from "../types";
import { loadAccounts, saveAccounts, uid } from "../storage";

interface Props {
  onClose: () => void;
}

export default function AccountsMenu({ onClose }: Props) {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"preparer" | "assembler">("preparer");
  const [selectedAvatar, setSelectedAvatar] = useState("👤");

  const avatars = ["👤", "👷", "✂️", "📦", "🎨", "🔨", "🧵", "🧤", "📏", "👩", "👨", "⚡"];

  useEffect(() => {
    setAccounts(loadAccounts() as UserAccount[]);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      alert("Заполните все поля!");
      return;
    }
    const newAcc: UserAccount = {
      id: uid(),
      name: name.trim(),
      role,
      password: password.trim(),
      avatar: selectedAvatar,
    };
    const updated = [newAcc, ...accounts];
    setAccounts(updated);
    saveAccounts(updated);
    setName("");
    setPassword("");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Удалить этот аккаунт?")) return;
    const updated = accounts.filter((acc) => acc.id !== id);
    setAccounts(updated);
    saveAccounts(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="ml-auto flex h-full w-full max-w-[320px] flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold text-slate-900">Сотрудники</h2>
          <button onClick={onClose} className="p-1 text-slate-400">✕</button>
        </div>

        {/* Форма создания */}
        <form onSubmit={handleCreate} className="border-b border-slate-100 bg-slate-50/80 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase">Новый сотрудник</div>
          
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя сотрудника"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
          />

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-1">Выберите аватар</div>
            <div className="grid grid-cols-6 gap-1 bg-white p-2 rounded-xl border border-slate-200">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
                    selectedAvatar === av ? "bg-indigo-100 border border-indigo-400" : "hover:bg-slate-50"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setRole("preparer")}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                role === "preparer" ? "bg-indigo-600 text-white" : "text-slate-600"
              }`}
            >
              Заготовщик
            </button>
            <button
              type="button"
              onClick={() => setRole("assembler")}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                role === "assembler" ? "bg-indigo-600 text-white" : "text-slate-600"
              }`}
            >
              Сборщик
            </button>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow active:scale-95 transition"
          >
            Создать аккаунт
          </button>
        </form>

        {/* Список аккаунтов */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 text-xs font-bold text-slate-700 uppercase">Список аккаунтов</div>
          {accounts.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">
              Пока нет созданных аккаунтов
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      {acc.avatar || "👤"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{acc.name}</div>
                      <div className="text-xs text-slate-500">
                        {acc.role === "preparer" ? "Заготовщик" : "Сборщик"} | пароль: <span className="font-mono">{acc.password}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
