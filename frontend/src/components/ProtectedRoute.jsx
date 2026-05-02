import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-500 text-xs uppercase tracking-[0.25em]">Brewing…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
