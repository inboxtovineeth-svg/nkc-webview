import { useEffect, useState } from "react";
import api from "../lib/api";
import { Users, UserMinus, Wallet, CalendarDays, Receipt } from "lucide-react";
import { Link } from "react-router-dom";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n || 0));

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  const monthLabel = stats?.month
    ? new Date(stats.month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";

  const cards = [
    { key: "current_employees", label: "Current Employees", icon: Users, hint: "On the team today" },
    { key: "ex_employees", label: "Ex Employees", icon: UserMinus, hint: "Past staff records" },
    { key: "total_monthly_payroll", label: "Monthly Payroll", icon: Receipt, hint: "Sum of base salaries", money: true },
    { key: "month_advance_total", label: `Advances · ${monthLabel}`, icon: Wallet, hint: "Total this month", money: true },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-2">Overview</p>
        <h2 className="font-display text-4xl font-bold tracking-tight" data-testid="dashboard-title">
          Good day at the shop
        </h2>
        <p className="text-stone-600 mt-2">Here&apos;s how things are running this {monthLabel || "month"}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map(({ key, label, icon: Icon, hint, money }) => (
          <div
            key={key}
            data-testid={`stat-${key}`}
            className="bg-white border border-stone-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Icon size={16} className="text-amber-800" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400">{hint}</span>
            </div>
            <p className="font-display text-4xl font-bold tracking-tight mb-1 tabular">
              {loading ? "—" : money ? `₹${fmtINR(stats?.[key])}` : (stats?.[key] ?? 0)}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-1">Latest</p>
              <h3 className="font-display text-xl font-semibold">Recently added staff</h3>
            </div>
            <Link to="/employees" className="text-xs uppercase tracking-[0.2em] text-amber-800 hover:underline">
              Manage all →
            </Link>
          </div>
          <div className="divide-y divide-stone-200">
            {(stats?.recent_employees || []).length === 0 ? (
              <div className="p-10 text-center text-sm text-stone-500">
                No employees yet. <Link to="/employees" className="text-amber-800 hover:underline font-medium">Add your first one →</Link>
              </div>
            ) : (
              stats.recent_employees.map((emp) => (
                <div key={emp.id} className="p-4 px-6 flex items-center gap-4 hover:bg-stone-50">
                  <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-display font-semibold">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900">{emp.name}</p>
                    <p className="text-xs text-stone-500 tabular">{emp.mobile || "—"} · ₹{fmtINR(emp.salary)} / mo</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 border rounded-full ${
                    emp.status === "current"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 bg-stone-50 text-stone-600"
                  }`}>
                    {emp.status === "current" ? "Current" : "Ex"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-1">This month</p>
          <h3 className="font-display text-xl font-semibold mb-6">Quick figures</h3>

          <div className="space-y-3">
            <div className="p-4 border border-stone-200 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays size={16} className="text-amber-800" />
                <span className="text-sm">Total leave days</span>
              </div>
              <span className="font-display text-2xl font-bold tabular">{stats?.month_leave_total ?? 0}</span>
            </div>
            <div className="p-4 border border-stone-200 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet size={16} className="text-amber-800" />
                <span className="text-sm">Total advances given</span>
              </div>
              <span className="font-display text-2xl font-bold tabular">₹{fmtINR(stats?.month_advance_total)}</span>
            </div>
          </div>

          <Link
            to="/salary"
            data-testid="link-salary"
            className="mt-6 w-full block text-center py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 text-sm rounded-md transition-colors"
          >
            Open salary statement →
          </Link>
        </div>
      </div>
    </div>
  );
}
