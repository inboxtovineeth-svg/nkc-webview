import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Plus, Search, Pencil, Trash2, X, Phone, Shield, MapPin } from "lucide-react";
import { toast } from "sonner";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n || 0));

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("current"); // current | ex | all
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/employees");
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return employees
      .filter((e) => statusFilter === "all" || e.status === statusFilter)
      .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.mobile || "").includes(q));
  }, [employees, search, statusFilter]);

  const counts = useMemo(() => ({
    current: employees.filter((e) => e.status === "current").length,
    ex: employees.filter((e) => e.status === "ex").length,
    all: employees.length,
  }), [employees]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this employee permanently?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Employee deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const toggleStatus = async (emp) => {
    const next = emp.status === "current" ? "ex" : "current";
    try {
      await api.patch(`/employees/${emp.id}/status`, { status: next });
      toast.success(`Marked as ${next === "current" ? "Current" : "Ex"} employee`);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-2">The team</p>
          <h2 className="font-display text-4xl font-bold tracking-tight" data-testid="employees-title">Employees</h2>
          <p className="text-stone-600 mt-1 text-sm">{counts.current} current · {counts.ex} ex · {counts.all} total</p>
        </div>
        <button
          data-testid="employees-add"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-stone-50 text-sm rounded-md transition-colors w-fit"
        >
          <Plus size={14} /> Add employee
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="inline-flex items-center bg-stone-100 rounded-md p-1 w-fit">
          {[
            { v: "current", label: `Current · ${counts.current}` },
            { v: "ex", label: `Ex · ${counts.ex}` },
            { v: "all", label: `All · ${counts.all}` },
          ].map((b) => (
            <button
              key={b.v}
              data-testid={`filter-${b.v}`}
              onClick={() => setStatusFilter(b.v)}
              className={`px-4 py-1.5 text-xs uppercase tracking-[0.15em] rounded-md transition ${
                statusFilter === b.v ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            data-testid="employees-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or mobile…"
            className="pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 text-sm w-full"
          />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left">
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Mobile</Th>
                <Th>Emergency</Th>
                <Th>Address</Th>
                <Th>ID Proof</Th>
                <Th className="text-right">Salary</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr><td colSpan={9} className="p-12 text-center text-stone-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center text-stone-500">No employees match your filters.</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50" data-testid={`employee-row-${e.id}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-display font-bold text-amber-900">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{e.name}</p>
                        <p className="text-xs text-stone-500">{e.notes || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      data-testid={`employment-type-${e.id}`}
                      className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 border rounded-full font-semibold ${
                        (e.employment_type || "regular") === "regular"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-stone-300 bg-stone-100 text-stone-700"
                      }`}
                    >
                      {(e.employment_type || "regular") === "regular" ? "Regular" : "Contract"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-700 tabular">{e.mobile || "—"}</td>
                  <td className="px-5 py-3 text-stone-600 tabular">{e.emergency_contact || "—"}</td>
                  <td className="px-5 py-3 text-stone-600 max-w-[180px] truncate" title={e.address}>{e.address || "—"}</td>
                  <td className="px-5 py-3 text-stone-600">
                    {e.address_proof_type ? (
                      <div className="flex flex-col">
                        <span className="text-xs text-stone-500 uppercase tracking-wider">{e.address_proof_type}</span>
                        <span className="text-xs tabular">{e.address_proof_number || "—"}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular font-medium">₹{fmtINR(e.salary)}</td>
                  <td className="px-5 py-3">
                    <button
                      data-testid={`toggle-status-${e.id}`}
                      onClick={() => toggleStatus(e)}
                      title={e.status === "current" ? "Mark as Ex employee" : "Mark as Current"}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full border transition-colors ${
                        e.status === "current"
                          ? "bg-emerald-600 border-emerald-700"
                          : "bg-stone-300 border-stone-400"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          e.status === "current" ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <p className={`mt-1 text-[10px] uppercase tracking-[0.2em] font-semibold ${
                      e.status === "current" ? "text-emerald-700" : "text-stone-500"
                    }`}>{e.status === "current" ? "Current" : "Ex"}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        data-testid={`employee-edit-${e.id}`}
                        onClick={() => { setEditing(e); setShowForm(true); }}
                        className="p-1.5 hover:bg-amber-50 text-amber-800 rounded"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        data-testid={`employee-delete-${e.id}`}
                        onClick={() => onDelete(e.id)}
                        className="p-1.5 hover:bg-red-50 text-red-700 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <EmployeeForm
          employee={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold ${className}`}>{children}</th>
  );
}

function EmployeeForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: employee?.name || "",
    mobile: employee?.mobile || "",
    emergency_contact: employee?.emergency_contact || "",
    address: employee?.address || "",
    address_proof_type: employee?.address_proof_type || "Aadhaar",
    address_proof_number: employee?.address_proof_number || "",
    salary: employee?.salary || 0,
    joining_date: employee?.joining_date || new Date().toISOString().slice(0, 10),
    status: employee?.status || "current",
    employment_type: employee?.employment_type || "regular",
    notes: employee?.notes || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form, salary: parseFloat(form.salary) || 0 };
      if (employee) {
        await api.put(`/employees/${employee.id}`, payload);
        toast.success("Employee updated");
      } else {
        await api.post("/employees", payload);
        toast.success("Employee added");
      }
      onSaved();
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm">
      <div className="bg-white border border-stone-200 rounded-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800">{employee ? "Update" : "New"}</p>
            <h3 className="font-display text-xl font-semibold">{employee ? "Edit employee" : "Add employee"}</h3>
          </div>
          <button data-testid="employee-form-close" onClick={onClose} className="text-stone-500 hover:text-stone-900">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <Section title="Identity" icon={null}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name *">
                <input data-testid="form-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Karthik R." />
              </Field>
              <Field label="Joining date">
                <input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section title="Contact" icon={Phone}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Mobile number">
                <input data-testid="form-mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className={inputCls} placeholder="+91 9XXXXXXXXX" />
              </Field>
              <Field label="Emergency contact">
                <input data-testid="form-emergency" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} className={inputCls} placeholder="Name & number" />
              </Field>
            </div>
            <Field label="Address">
              <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Door no., street, city, pincode" />
            </Field>
          </Section>

          <Section title="Identification" icon={Shield}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Address proof type">
                <select value={form.address_proof_type} onChange={(e) => setForm({ ...form, address_proof_type: e.target.value })} className={inputCls}>
                  <option value="">— None —</option>
                  <option>Aadhaar</option>
                  <option>PAN</option>
                  <option>Voter ID</option>
                  <option>Driving Licence</option>
                  <option>Passport</option>
                  <option>Ration Card</option>
                </select>
              </Field>
              <Field label="Proof number">
                <input value={form.address_proof_number} onChange={(e) => setForm({ ...form, address_proof_number: e.target.value })} className={inputCls} placeholder="XXXX XXXX XXXX" />
              </Field>
            </div>
          </Section>

          <Section title="Compensation & Status" icon={null}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Monthly salary (₹)">
                <input data-testid="form-salary" type="number" min="0" step="100" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Status">
                <div className="flex items-center gap-3 h-10">
                  <button
                    type="button"
                    data-testid="form-status-toggle"
                    onClick={() => setForm({ ...form, status: form.status === "current" ? "ex" : "current" })}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${
                      form.status === "current" ? "bg-emerald-600 border-emerald-700" : "bg-stone-300 border-stone-400"
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      form.status === "current" ? "translate-x-8" : "translate-x-1"
                    }`} />
                  </button>
                  <span className={`text-sm font-medium ${form.status === "current" ? "text-emerald-700" : "text-stone-600"}`}>
                    {form.status === "current" ? "Current employee" : "Ex employee"}
                  </span>
                </div>
              </Field>
            </div>
            <Field label="Employment type">
              <div className="flex items-center gap-3 h-10">
                <button
                  type="button"
                  data-testid="form-employment-type-toggle"
                  onClick={() => setForm({ ...form, employment_type: form.employment_type === "regular" ? "contract" : "regular" })}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${
                    form.employment_type === "regular" ? "bg-amber-700 border-amber-800" : "bg-stone-700 border-stone-800"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    form.employment_type === "regular" ? "translate-x-1" : "translate-x-8"
                  }`} />
                </button>
                <span className={`text-sm font-medium ${form.employment_type === "regular" ? "text-amber-900" : "text-stone-700"}`}>
                  {form.employment_type === "regular" ? "Regular (first 2 leaves free)" : "Contract (all leaves chargeable)"}
                </span>
              </div>
            </Field>
            <Field label="Notes (optional)">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Role, shift, etc." />
            </Field>
          </Section>

          {error && <div className="text-sm bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">{error}</div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-stone-200">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-stone-300 text-sm rounded-md hover:bg-stone-50">Cancel</button>
            <button data-testid="employee-form-submit" type="submit" disabled={saving} className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-stone-50 text-sm rounded-md disabled:bg-amber-600">
              {saving ? "Saving…" : employee ? "Update employee" : "Save employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-amber-800" />}
        <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-semibold">{title}</p>
        <div className="flex-1 h-px bg-stone-200"></div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.18em] text-stone-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 focus:border-amber-700 text-sm";
