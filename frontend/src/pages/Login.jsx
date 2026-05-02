import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Coffee } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) navigate("/dashboard");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-stone-50">
      {/* Brand panel */}
      <div className="hidden lg:flex bg-stone-900 text-stone-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-warm-grid opacity-[0.06]"></div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 80%, rgba(180, 83, 9, 0.18), transparent 55%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.12), transparent 55%)",
          }}
        ></div>
        <div className="relative h-full p-12 flex flex-col justify-between w-full">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center">
              <Coffee size={16} className="text-stone-50" />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-base">Nellai Karupatti Coffee</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400">Manager Console</p>
            </div>
          </Link>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400 mb-4">[ Welcome back ]</p>
            <h2 className="font-display text-5xl font-bold tracking-tight leading-[1.02] mb-6">
              The shop&apos;s
              <br />
              <span className="italic font-light text-amber-300">quiet morning</span>
              <br />starts here.
            </h2>
            <p className="text-stone-400 max-w-md leading-relaxed">
              Sign in to manage your team, log today&apos;s advances, and check this month&apos;s payroll —
              the way a corner shop should.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.25em] text-stone-500">
            <span>v 1.0</span>
            <span>·</span>
            <span>Encrypted session</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-stone-500 hover:text-stone-950 inline-flex items-center gap-2 mb-12">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-3">Sign in</p>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Manager access</h1>
          <p className="text-sm text-stone-600 mb-10">Use your owner credentials to continue.</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Username</label>
              <input
                data-testid="login-email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 focus:border-amber-700 text-sm"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Password</label>
              <input
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 focus:border-amber-700 text-sm"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div data-testid="login-error" className="text-sm bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
                {error}
              </div>
            )}
            <button
              data-testid="login-submit"
              disabled={loading}
              type="submit"
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 disabled:bg-amber-600 text-stone-50 text-sm font-medium rounded-md transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-8 p-4 border border-stone-200 bg-stone-100 rounded-md">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Demo / default</p>
            <p className="font-mono text-xs text-stone-800">admin / Change@4545</p>
            <p className="text-xs text-stone-500 mt-2">You can change these in <span className="font-mono">backend/.env</span> when running locally.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
