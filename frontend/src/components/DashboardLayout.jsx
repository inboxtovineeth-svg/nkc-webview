import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Wallet, Receipt, UserCircle, LogOut, Menu, X, Coffee } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/leaves", label: "Leave Management", icon: CalendarDays },
  { to: "/advances", label: "Advance Entry", icon: Wallet },
  { to: "/salary", label: "Salary Management", icon: Receipt },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-stone-50">
      <aside
        data-testid="sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-stone-900 text-stone-100 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-200 flex flex-col`}
      >
        <div className="px-6 py-6 border-b border-stone-800">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center">
                <Coffee size={18} className="text-stone-50" />
              </div>
              <div>
                <p className="font-display text-lg font-bold tracking-tight leading-tight">Nellai Karupatti</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400">Coffee · Manager</p>
              </div>
            </div>
            <button data-testid="sidebar-close" className="lg:hidden text-stone-400" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-2">Workspace</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-amber-700 text-white"
                    : "text-stone-300 hover:bg-stone-800 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-sm font-display">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">{user?.role}</p>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 bg-white border-b border-stone-200 z-30 flex items-center px-6 gap-4">
          <button data-testid="sidebar-open" className="lg:hidden text-stone-700" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">Welcome back</p>
            <h1 className="font-display text-lg font-semibold text-stone-950">{user?.name}</h1>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
            <div className="w-1.5 h-1.5 bg-amber-700 rounded-full"></div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-800 font-medium">Open · Today</span>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)}></div>
      )}
    </div>
  );
}
