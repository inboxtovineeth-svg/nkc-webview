import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Save, CalendarDays, Wallet } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function AdvanceEntry() {
  const [date, setDate] = useState(today());
  const [bulkAmount, setBulkAmount] = useState("");
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/advances/date/${date}`);
      setRows(data.rows);
      const m = {};
      data.rows.forEach((r) => { m[r.employee_id] = r.amount || 0; });
      setEdits(m);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  const totalToday = useMemo(
    () => Object.values(edits).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [edits]
  );

  const applyBulk = () => {
    const amt = parseFloat(bulkAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount first");
      return;
    }
    const m = {};
    rows.forEach((r) => { m[r.employee_id] = amt; });
    setEdits(m);
    toast.success(`Filled ₹${amt.toLocaleString("en-IN")} for ${rows.length} employees`);
  };

  const clearAll = () => {
    const m = {};
    rows.forEach((r) => { m[r.employee_id] = 0; });
    setEdits(m);
  };

  const save = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(edits).map(([employee_id, amount]) => ({
        employee_id,
        amount: parseFloat(amount) || 0,
      }));
      await api.post("/advances", { date, entries });
      toast.success("Advance entries saved");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-5xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-2">Cash given</p>
        <h2 className="font-display text-4xl font-bold tracking-tight" data-testid="advance-title">Advance Entry</h2>
        <p className="text-stone-600 mt-1">Pick a date, optionally pre-fill an amount for everyone, then adjust per person.</p>
      </div>

      {/* Top control panel */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
        <div className="lg:col-span-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-1.5">Date</label>
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              data-testid="advance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-3 py-2.5 w-full bg-white border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
            />
          </div>
        </div>
        <div className="lg:col-span-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-1.5">Bulk amount (optional)</label>
          <div className="flex min-w-0">
            <span className="inline-flex items-center px-3 bg-stone-100 border border-r-0 border-stone-300 rounded-l-md text-sm text-stone-600 shrink-0">₹</span>
            <input
              data-testid="advance-bulk"
              type="number"
              min="0"
              step="50"
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
              placeholder="e.g. 500"
              className="px-3 py-2.5 flex-1 min-w-0 w-full bg-white border border-stone-300 rounded-r-md text-sm tabular focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-1.5">&nbsp;</label>
          <button
            data-testid="advance-apply-bulk"
            onClick={applyBulk}
            type="button"
            className="w-full px-3 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 text-sm rounded-md whitespace-nowrap"
          >
            Apply to all
          </button>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-1.5">&nbsp;</label>
          <button
            data-testid="advance-clear"
            onClick={clearAll}
            type="button"
            className="w-full px-3 py-2.5 border border-stone-300 hover:bg-stone-50 text-sm rounded-md whitespace-nowrap"
          >
            Clear all
          </button>
        </div>
        <div className="lg:col-span-2 lg:text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Total · {dateLabel}</p>
          <p className="font-display text-2xl lg:text-3xl font-bold tabular truncate">₹{totalToday.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-amber-800" />
            <h3 className="font-display text-base font-semibold">Per-employee amounts · {rows.length} current</h3>
          </div>
          <button
            data-testid="advance-save"
            onClick={save}
            disabled={saving || loading || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 disabled:bg-amber-600 text-stone-50 text-sm rounded-md"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save advances"}
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No current employees. Add staff to record advances.</div>
        ) : (
          <ul className="divide-y divide-stone-200">
            {rows.map((r) => (
              <li key={r.employee_id} className="px-6 py-3 grid grid-cols-12 gap-4 items-center hover:bg-stone-50">
                <div className="col-span-7 sm:col-span-8 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-display font-bold text-amber-900">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium text-stone-900">{r.name}</p>
                </div>
                <div className="col-span-5 sm:col-span-4">
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-stone-100 border border-r-0 border-stone-300 rounded-l-md text-sm text-stone-600">₹</span>
                    <input
                      data-testid={`advance-input-${r.employee_id}`}
                      type="number"
                      min="0"
                      step="50"
                      value={edits[r.employee_id] ?? 0}
                      onChange={(e) => setEdits({ ...edits, [r.employee_id]: e.target.value })}
                      className="px-3 py-2 flex-1 w-full bg-white border border-stone-300 rounded-r-md text-sm tabular text-right focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
                    />
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
