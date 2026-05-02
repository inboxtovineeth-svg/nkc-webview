import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Save, CalendarDays } from "lucide-react";
import { toast } from "sonner";

const monthNow = () => new Date().toISOString().slice(0, 7);

export default function LeaveManagement() {
  const [month, setMonth] = useState(monthNow());
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/leaves/month/${month}`);
      setRows(data.rows);
      const map = {};
      data.rows.forEach((r) => { map[r.employee_id] = r.days; });
      setEdits(map);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const totalDays = useMemo(() => Object.values(edits).reduce((s, v) => s + (parseFloat(v) || 0), 0), [edits]);

  const save = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(edits).map(([employee_id, days]) => ({
        employee_id,
        days: parseFloat(days) || 0,
      }));
      await api.post(`/leaves/month/${month}`, { entries });
      toast.success("Leave entries saved");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = new Date(month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-5xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-2">Time off</p>
        <h2 className="font-display text-4xl font-bold tracking-tight" data-testid="leaves-title">Leave Management</h2>
        <p className="text-stone-600 mt-1">Pick a month, then jot the leave days taken by each current employee.</p>
      </div>

      {/* Sticky control bar */}
      <div className="bg-white border border-stone-200 rounded-lg p-5 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-1.5">Month</label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                data-testid="leaves-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
              />
            </div>
          </div>
          <div className="px-4 py-2.5 border border-stone-200 rounded-md bg-stone-50">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Showing</p>
            <p className="font-display font-semibold">{monthLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Total leave days</p>
            <p className="font-display text-3xl font-bold tabular">{totalDays.toFixed(totalDays % 1 === 0 ? 0 : 1)}</p>
          </div>
          <button
            data-testid="leaves-save"
            onClick={save}
            disabled={saving || loading || rows.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-amber-800 hover:bg-amber-900 disabled:bg-amber-600 text-stone-50 text-sm rounded-md transition-colors"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save entries"}
          </button>
        </div>
      </div>

      {/* Entries grid */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h3 className="font-display text-base font-semibold">Current employees · {rows.length}</h3>
          <p className="text-xs text-stone-500">Days are saved per (employee × month).</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading employees…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No current employees yet. Add staff under <span className="font-medium">Employees</span> first.</div>
        ) : (
          <ul className="divide-y divide-stone-200">
            {rows.map((r) => (
              <li key={r.employee_id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-stone-50">
                <div className="col-span-7 sm:col-span-6 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-display font-bold text-amber-900">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">{r.name}</p>
                    <p className="text-xs text-stone-500 tabular">Salary ₹{Number(r.salary).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-4 text-right hidden sm:block">
                  {r.updated_at && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                      Saved · {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      data-testid={`leave-input-${r.employee_id}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={edits[r.employee_id] ?? 0}
                      onChange={(e) => setEdits({ ...edits, [r.employee_id]: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-sm tabular text-right focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
                    />
                    <span className="text-xs text-stone-500 uppercase tracking-wider">days</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
