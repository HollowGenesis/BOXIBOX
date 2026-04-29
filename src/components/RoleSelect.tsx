import { useState, useEffect } from "react";
import type { Role, UserAccount } from "../types";
import { loadAccounts } from "../storage";

interface Props {
  onSelect: (role: Role, loggedUser: { id: string; name: string; role: Role }) => void;
}

const ROLES: { role: Role; label: string; subtitle: string; icon: string; color: string }[] = [
  {
    role: "manager",
    label: "Менеджер",
    subtitle: "Дарья — создаёт заказы",
    icon: "👩‍💼",
    color: "from-indigo-500 to-violet-600",
  },
  {
    role: "preparer",
    label: "Заготовщик",
    subtitle: "Заготовка заказов",
    icon: "✂️",
    color: "from-amber-500 to-orange-600",
  },
  {
    role: "assembler",
    label: "Сборщик",
    subtitle: "Склейка и сборка коробок",
    icon: "📦",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function RoleSelect({ onSelect }: Props) {
  const [step, setStep] = useState<"role" | "accounts" | "password">("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  useEffect(() => {
    if (step === "accounts" || step === "role") {
      setAccounts(loadAccounts() as UserAccount[]);
    }
  }, [step]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === "manager") {
      setStep("password");
    } else {
      setStep("accounts");
    }
  };

  const handleAccountSelect = (acc: UserAccount) => {
    setSelectedAccount(acc);
    setStep("password");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === "manager") {
      if (password === "daryaboxi_2026") {
        onSelect("manager", { id: "manager", name: "Дарья", role: "manager" });
      } else {
        alert("Неверный пароль менеджера!");
      }
    } else if (selectedAccount) {
      if (password === selectedAccount.password) {
        onSelect(selectedAccount.role, {
          id: selectedAccount.id,
          name: selectedAccount.name,
          role: selectedAccount.role,
        });
      } else {
        alert("Неверный пароль!");
      }
    }
  };

  const filteredAccounts = accounts.filter((acc) => acc.role === selectedRole);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 p-5">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-3xl shadow-lg shadow-amber-200">
            📦
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Шляпные коробки</h1>
          <p className="mt-2 text-sm text-slate-500">Система заказов из переплётного картона</p>
        </div>

        {step === "role" && (
          <div className="space-y-3">
            {ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => handleRoleSelect(r.role)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98] hover:border-slate-300 hover:shadow-md"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${r.color} text-2xl shadow-md`}
                >
                  {r.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{r.label}</div>
                  <div className="text-sm text-slate-500">{r.subtitle}</div>
                </div>
                <span className="text-slate-400">➔</span>
              </button>
            ))}
          </div>
        )}

        {step === "accounts" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setStep("role")} className="text-sm text-indigo-600 font-medium">
                ← Назад к ролям
              </button>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              Выберите сотрудника ({selectedRole === "preparer" ? "Заготовщики" : "Сборщики"}):
            </h2>
            {filteredAccounts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                Нет созданных аккаунтов для этой роли. Обратитесь к Дарье.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleAccountSelect(acc)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 font-medium text-slate-800 hover:bg-slate-50 active:scale-98 transition shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
                        {acc.avatar || "👤"}
                      </div>
                      <span>{acc.name}</span>
                    </div>
                    <span className="text-indigo-500 text-sm">Войти</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "password" && (
          <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setStep(selectedRole === "manager" ? "role" : "accounts")} 
                className="text-xs text-indigo-600 font-medium"
              >
                ← Назад
              </button>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Вход: {selectedRole === "manager" ? "Дарья" : selectedAccount?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Введите пароль для авторизации</p>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white transition active:scale-95 shadow-md shadow-indigo-100"
            >
              Войти
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Все данные хранятся локально на вашем устройстве
        </p>
      </div>
    </div>
  );
}
