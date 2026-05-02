import { Link } from "react-router-dom";
import { Coffee, ArrowRight, Users, CalendarDays, Wallet, Receipt } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <header className="sticky top-0 z-40 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-800 flex items-center justify-center">
              <Coffee size={16} className="text-stone-50" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold tracking-tight">Nellai Karupatti Coffee</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">Manager Console</p>
            </div>
          </div>
          <Link
            to="/login"
            data-testid="nav-login"
            className="px-5 py-2 text-sm bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-md transition-colors flex items-center gap-2"
          >
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-warm-grid opacity-60 pointer-events-none"></div>
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 relative">
          <div className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-1.5 mb-8 rounded-full">
            <div className="w-1.5 h-1.5 bg-amber-700 rounded-full"></div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-900">Coffee shop · operations console</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.98] mb-8 max-w-4xl">
            Brewed with care.<br />
            <span className="italic font-light text-amber-800">Managed</span> with clarity.
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mb-10 leading-relaxed">
            A focused console for the team behind every cup. Track your staff, log monthly leaves,
            note daily advances, and see clean salary calculations — all in one warm, simple place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              data-testid="hero-cta"
              className="px-7 py-3.5 bg-amber-800 hover:bg-amber-900 text-stone-50 font-medium flex items-center gap-2 rounded-md transition-colors"
            >
              Open the console <ArrowRight size={16} />
            </Link>
            <a
              href="#modules"
              className="px-7 py-3.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 font-medium rounded-md transition-colors"
            >
              See what's inside
            </a>
          </div>
        </div>
      </section>

      {/* Hero divider */}
      <div className="border-t border-stone-200"></div>

      {/* Modules */}
      <section id="modules" className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-10 mb-14">
            <div className="lg:col-span-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-3">[ The shop floor, simplified ]</p>
              <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
                Four modules.<br />
                <span className="italic font-light">No clutter.</span>
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-10">
              <p className="text-stone-600 text-lg leading-relaxed">
                Built specifically for a small coffee shop&apos;s rhythm — onboard your barista, log a sick day,
                jot down an advance taken before payday, then see the month&apos;s salary without any spreadsheet pain.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Users, t: "Employees", d: "Add staff with mobile, address, emergency contact and ID proof. Toggle between current and ex-employees in one tap." },
              { icon: CalendarDays, t: "Leave Management", d: "Pick a month. See all current employees. Enter leave days next to each name. Saved instantly." },
              { icon: Wallet, t: "Advance Entry", d: "Pick a date. Note advance amounts handed out to each employee. Used automatically in salary." },
              { icon: Receipt, t: "Salary Management", d: "Pick a month. See base salary, leave days taken, advance total and net payable per employee." },
            ].map(({ icon: Icon, t, d }, i) => (
              <div key={i} className="border border-stone-200 bg-white p-8 hover:border-amber-300 hover:shadow-sm transition-all rounded-lg">
                <div className="w-11 h-11 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center mb-5">
                  <Icon size={18} className="text-amber-800" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{t}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900 text-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400 mb-4">[ Ready when you are ]</p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-5 max-w-2xl mx-auto">
            Step behind the counter.
          </h2>
          <p className="text-stone-400 mb-10 max-w-xl mx-auto">
            Sign in to start adding your team. The shop&apos;s data stays with you — locally on your machine.
          </p>
          <Link
            to="/login"
            data-testid="bottom-cta"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-700 hover:bg-amber-600 text-white rounded-md font-medium transition-colors"
          >
            Sign in to manager <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="bg-stone-50 border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coffee size={14} className="text-amber-800" />
            <span className="text-sm text-stone-700">Nellai Karupatti Coffee · {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-stone-500 uppercase tracking-[0.2em]">Brewed locally. Managed simply.</p>
        </div>
      </footer>
    </div>
  );
}
