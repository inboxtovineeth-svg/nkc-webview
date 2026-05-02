import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-2xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-800 mb-2">Account</p>
        <h2 className="font-display text-4xl font-bold tracking-tight" data-testid="profile-title">Profile</h2>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="p-8 flex items-center gap-6 border-b border-stone-200 bg-stone-50">
          <div className="w-20 h-20 rounded-full bg-amber-800 text-stone-50 flex items-center justify-center font-display text-3xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight">{user?.name}</h3>
            <p className="text-sm text-stone-600 mt-0.5">{user?.email}</p>
            <span className="mt-2 inline-block text-[10px] uppercase tracking-[0.25em] px-2.5 py-1 border border-amber-200 bg-amber-50 text-amber-900 rounded-full">{user?.role}</span>
          </div>
        </div>

        <div className="p-6 text-sm text-stone-600 space-y-3 leading-relaxed">
          <p>
            You&apos;re signed in as the manager for <span className="font-semibold text-stone-900">Nellai Karupatti Coffee</span>.
            Your activity is private to this device when running locally.
          </p>
          <p>
            To change the admin email/password, edit <code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">backend/.env</code>
            and restart the backend.
          </p>
        </div>
      </div>
    </div>
  );
}
