import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { CalendarDays, Download, FileText, X, Printer } from "lucide-react";
import { toast } from "sonner";

const monthNow = () => new Date().toISOString().slice(0, 7);
const fmtINR = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(n || 0));

export default function Salary() {
  const [month, setMonth] = useState(monthNow());
  const [data, setData] = useState({ rows: [], totals: {}, previous_month: "" });
  const [loading, setLoading] = useState(true);
  const [breakupFor, setBreakupFor] = useState(null); // {employee_id, name}

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/salary/month/${month}`);
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const exportCSV = () => {
    const headers = ["Name", "Type", "Mobile", "Salary", "Leave Days", "Leave Deduction", "Advance Total", "Previous Month Due", "Net Payable"];
    const lines = [headers.join(",")];
    data.rows.forEach((r) => {
      lines.push([
        `"${r.name}"`,
        r.employment_type || "regular",
        `"${r.mobile || ""}"`,
        r.salary,
        r.leave_days,
        r.leave_deduction,
        r.advance_total,
        r.previous_month_due || 0,
        r.net_payable,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = new Date(month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevMonthLabel = data.previous_month
    ? new Date(data.previous_month + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-[1400px]">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-2">Payroll snapshot</p>
        <h2 className="font-display text-4xl font-bold tracking-tight" data-testid="salary-title">Salary Management</h2>
        <p className="text-stone-600 mt-1">Base salary, leaves (Regular: first 2 free · Contract: all chargeable), advances and previous-month dues combined into a clean net payable for {monthLabel}.</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-5 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-1.5">Month</label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                data-testid="salary-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
              />
            </div>
          </div>
          {prevMonthLabel && (
            <div className="px-4 py-2.5 border border-stone-200 rounded-md bg-stone-50">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Dues from</p>
              <p className="font-display font-semibold">{prevMonthLabel}</p>
            </div>
          )}
        </div>
        <button
          data-testid="salary-export"
          onClick={exportCSV}
          disabled={data.rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-sm rounded-md"
        >
          <Download size={14} /> Export month CSV
        </button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Salary", value: data.totals?.salary, money: true, accent: "text-stone-900" },
          { label: "Leave Days", value: data.totals?.leave_days, accent: "text-stone-900" },
          { label: "Advances", value: data.totals?.advance_total, money: true, accent: "text-amber-800" },
          { label: "Previous Due", value: data.totals?.previous_month_due, money: true, accent: "text-red-700" },
          { label: "Net Payable", value: data.totals?.net_payable, money: true, accent: "text-emerald-700" },
        ].map((t, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-3">{t.label}</p>
            <p className={`font-display text-2xl lg:text-3xl font-bold tabular ${t.accent}`}>
              {t.money ? `₹${fmtINR(t.value)}` : (t.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left">
                <Th>Employee</Th>
                <Th>Type</Th>
                <Th className="text-right">Salary</Th>
                <Th className="text-right">Leave Days</Th>
                <Th className="text-right">Leave Ded.</Th>
                <Th className="text-right">Advance Taken</Th>
                <Th className="text-right">Previous Month Due</Th>
                <Th className="text-right">Net Payable</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr><td colSpan={9} className="p-12 text-center text-stone-500">Loading…</td></tr>
              ) : data.rows.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center text-stone-500">No current employees yet.</td></tr>
              ) : data.rows.map((r) => (
                <tr key={r.employee_id} className="hover:bg-stone-50" data-testid={`salary-row-${r.employee_id}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-display font-bold text-amber-900">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-stone-500 tabular">{r.mobile || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 border rounded-full font-semibold ${
                      r.employment_type === "contract"
                        ? "border-stone-300 bg-stone-100 text-stone-700"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                    }`}>
                      {r.employment_type === "contract" ? "Contract" : "Regular"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular">₹{fmtINR(r.salary)}</td>
                  <td className="px-5 py-3 text-right tabular">{r.leave_days}</td>
                  <td className="px-5 py-3 text-right tabular text-stone-500">
                    {r.leave_deduction > 0 ? `−₹${fmtINR(r.leave_deduction)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-amber-800">
                    {r.advance_total > 0 ? `−₹${fmtINR(r.advance_total)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular">
                    {r.previous_month_due < 0 ? (
                      <span className="text-red-700 font-medium" data-testid={`prev-due-${r.employee_id}`}>
                        −₹{fmtINR(Math.abs(r.previous_month_due))}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className={`px-5 py-3 text-right tabular font-semibold ${r.net_payable < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    ₹{fmtINR(r.net_payable)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      data-testid={`view-breakup-${r.employee_id}`}
                      onClick={() => setBreakupFor({ employee_id: r.employee_id, name: r.name })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md"
                    >
                      <FileText size={12} /> View Breakup
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {data.rows.length > 0 && (
              <tfoot className="bg-stone-50 border-t border-stone-200 font-display">
                <tr>
                  <td className="px-5 py-3 font-semibold">Totals</td>
                  <td></td>
                  <td className="px-5 py-3 text-right tabular font-semibold">₹{fmtINR(data.totals.salary)}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{data.totals.leave_days}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">
                    {data.totals.leave_deduction > 0 ? `−₹${fmtINR(data.totals.leave_deduction)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-amber-800">
                    {data.totals.advance_total > 0 ? `−₹${fmtINR(data.totals.advance_total)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-red-700">
                    {data.totals.previous_month_due < 0 ? `−₹${fmtINR(Math.abs(data.totals.previous_month_due))}` : "—"}
                  </td>
                  <td className={`px-5 py-3 text-right tabular font-bold ${data.totals.net_payable < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    ₹{fmtINR(data.totals.net_payable)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="text-xs text-stone-500 leading-relaxed bg-stone-100 border border-stone-200 rounded-md p-4 space-y-1">
        <p><span className="font-semibold text-stone-700">Per-day rate:</span> Monthly salary ÷ 30.</p>
        <p><span className="font-semibold text-stone-700">Regular employees:</span> first 2 leave days are free; deduction = per-day × (leaves − 2) from day 3.</p>
        <p><span className="font-semibold text-stone-700">Contract employees:</span> every leave day is deducted.</p>
        <p><span className="font-semibold text-stone-700">Previous Month Due:</span> if the prior month&apos;s net was negative, that amount carries over and is subtracted here.</p>
        <p><span className="font-semibold text-stone-700">Net Payable:</span> Salary − Leave deduction − Advance total + Previous Month Due (adding a negative).</p>
      </div>

      {breakupFor && (
        <BreakupModal
          month={month}
          employeeId={breakupFor.employee_id}
          employeeName={breakupFor.name}
          onClose={() => setBreakupFor(null)}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold whitespace-nowrap ${className}`}>{children}</th>;
}

function BreakupModal({ month, employeeId, employeeName, onClose }) {
  const [breakup, setBreakup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/salary/breakup/${month}/${employeeId}`)
      .then((r) => setBreakup(r.data))
      .catch((e) => toast.error(formatApiError(e.response?.data?.detail) || "Failed"))
      .finally(() => setLoading(false));
  }, [month, employeeId]);

  const monthLabel = new Date(month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevLabel = breakup?.previous_month
    ? new Date(breakup.previous_month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";

  const downloadCSV = () => {
    if (!breakup) return;
    const lines = [];
    lines.push("NELLAI KARUPATTI COFFEE — SALARY BREAKUP");
    lines.push(`Employee,${breakup.employee.name}`);
    lines.push(`Mobile,${breakup.employee.mobile || ""}`);
    lines.push(`Employment Type,${breakup.employee.employment_type}`);
    lines.push(`Month,${monthLabel}`);
    lines.push("");
    lines.push("Item,Amount (INR)");
    lines.push(`Base Salary,${breakup.salary}`);
    lines.push(`Per-day Rate,${breakup.per_day_rate}`);
    lines.push(`Leave Days Taken,${breakup.leave_days}`);
    lines.push(`Free Leave Days,${breakup.free_leave_days}`);
    lines.push(`Chargeable Leave Days,${breakup.chargeable_leave_days}`);
    lines.push(`Leave Deduction,-${breakup.leave_deduction}`);
    lines.push(`Advance Total,-${breakup.advance_total}`);
    lines.push(`Previous Month Due (${prevLabel}),${breakup.previous_month_due}`);
    lines.push(`Net Payable,${breakup.net_payable}`);
    lines.push("");
    lines.push("Advance Breakup,");
    lines.push("Date,Amount (INR)");
    if ((breakup.advances || []).length === 0) {
      lines.push("—,0");
    } else {
      breakup.advances.forEach((a) => lines.push(`${a.date},${a.amount}`));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `breakup-${breakup.employee.name.replace(/\s+/g, "_")}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printIt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm print:bg-white print:p-0 print:block">
      <div className="bg-white border border-stone-200 rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl print:shadow-none print:border-0 print:max-h-none print:max-w-none">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10 print:hidden">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800">Salary Breakup</p>
            <h3 className="font-display text-xl font-semibold">{employeeName} · {monthLabel}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="breakup-download"
              onClick={downloadCSV}
              disabled={!breakup || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-amber-800 hover:bg-amber-900 disabled:bg-amber-600 text-stone-50 rounded-md"
            >
              <Download size={12} /> Download CSV
            </button>
            <button
              data-testid="breakup-print"
              onClick={printIt}
              disabled={!breakup || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-stone-300 hover:bg-stone-50 rounded-md"
            >
              <Printer size={12} /> Print
            </button>
            <button data-testid="breakup-close" onClick={onClose} className="p-2 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading || !breakup ? (
          <div className="p-16 text-center text-stone-500">Loading breakup…</div>
        ) : (
          <div className="p-8 print:p-10">
            {/* Letterhead (visible when printing) */}
            <div className="hidden print:block mb-8 border-b-2 border-stone-900 pb-4">
              <h1 className="font-display text-3xl font-bold">Nellai Karupatti Coffee</h1>
              <p className="text-sm text-stone-600">Salary Breakup · {monthLabel}</p>
            </div>

            {/* Employee meta */}
            <div className="grid sm:grid-cols-3 gap-4 border border-stone-200 rounded-lg p-5 bg-stone-50 mb-6 print:bg-white">
              <Meta label="Employee" value={breakup.employee.name} />
              <Meta label="Mobile" value={breakup.employee.mobile || "—"} />
              <Meta label="Type" value={breakup.employee.employment_type === "contract" ? "Contract" : "Regular"} />
              <Meta label="Month" value={monthLabel} />
              <Meta label="Joined" value={breakup.employee.joining_date || "—"} mono />
              <Meta label="Per-day rate" value={`₹${fmtINR(breakup.per_day_rate)}`} mono />
            </div>

            {/* Figures */}
            <div className="border border-stone-200 rounded-lg overflow-hidden mb-6">
              <Row label="Base salary" value={breakup.salary} bold />
              <Row
                label={`Leave days taken · ${breakup.leave_days}`}
                sub={breakup.employee.employment_type === "contract"
                  ? `All ${breakup.leave_days} day(s) chargeable (Contract)`
                  : `${breakup.free_leave_days} free + ${breakup.chargeable_leave_days} chargeable (Regular)`}
                value={breakup.leave_deduction > 0 ? -breakup.leave_deduction : 0}
                muted={breakup.leave_deduction === 0}
              />
              <Row
                label="Advance taken"
                sub={`${breakup.advances.length} entr${breakup.advances.length === 1 ? "y" : "ies"} this month`}
                value={breakup.advance_total > 0 ? -breakup.advance_total : 0}
                muted={breakup.advance_total === 0}
              />
              <Row
                label={`Previous month due · ${prevLabel}`}
                sub={breakup.previous_month_due < 0
                  ? `Carried over negative net of ₹${fmtINR(Math.abs(breakup.previous_month_net))}`
                  : "No carry-over"}
                value={breakup.previous_month_due}
                muted={breakup.previous_month_due === 0}
                danger={breakup.previous_month_due < 0}
              />
              <div className={`px-5 py-4 flex items-center justify-between border-t-2 ${breakup.net_payable < 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">Net Payable</p>
                  <p className="text-xs text-stone-600">Final amount due for the month</p>
                </div>
                <p
                  data-testid="breakup-net-payable"
                  className={`font-display text-3xl font-bold tabular ${breakup.net_payable < 0 ? "text-red-700" : "text-emerald-700"}`}
                >
                  ₹{fmtINR(breakup.net_payable)}
                </p>
              </div>
            </div>

            {/* Advance breakup */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                <h4 className="font-display font-semibold">Advance Breakup · {monthLabel}</h4>
                <span className="text-xs text-stone-500 tabular">
                  {breakup.advances.length} entr{breakup.advances.length === 1 ? "y" : "ies"} · Total ₹{fmtINR(breakup.advance_total)}
                </span>
              </div>
              {breakup.advances.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-500">No advances given this month.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-stone-200">
                    <tr className="text-left">
                      <Th>#</Th>
                      <Th>Date</Th>
                      <Th className="text-right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {breakup.advances.map((a, i) => (
                      <tr key={`${a.date}-${i}`}>
                        <td className="px-5 py-2 text-stone-500 tabular">{String(i + 1).padStart(2, "0")}</td>
                        <td className="px-5 py-2 tabular">{new Date(a.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className="px-5 py-2 text-right tabular font-medium">₹{fmtINR(a.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t border-stone-200">
                    <tr>
                      <td className="px-5 py-2"></td>
                      <td className="px-5 py-2 font-semibold">Total advances</td>
                      <td className="px-5 py-2 text-right font-bold tabular text-amber-800">₹{fmtINR(breakup.advance_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${mono ? "tabular" : ""}`}>{value}</p>
    </div>
  );
}

function Row({ label, sub, value, bold, muted, danger }) {
  const isZero = value === 0 || muted;
  return (
    <div className="px-5 py-3 flex items-start justify-between border-b border-stone-200 last:border-b-0 gap-4">
      <div className="flex-1 min-w-0">
        <p className={`${bold ? "font-semibold text-stone-900" : "text-stone-800"} text-sm`}>{label}</p>
        {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
      </div>
      <p className={`font-mono text-sm whitespace-nowrap ${
        isZero ? "text-stone-400" :
        danger ? "text-red-700 font-semibold" :
        value < 0 ? "text-amber-800 font-semibold" :
        bold ? "font-semibold text-stone-900" : "text-stone-700"
      }`}>
        {isZero ? "—" : (value < 0 ? `−₹${fmtINR(Math.abs(value))}` : `₹${fmtINR(value)}`)}
      </p>
    </div>
  );
}
