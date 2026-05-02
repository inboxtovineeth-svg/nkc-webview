import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      // validateStatus prevents axios from throwing on 401 during initial session check.
      // This keeps CRA's dev error overlay quiet when the user simply isn't logged in yet.
      const { data, status } = await api.get("/auth/me", { validateStatus: () => true });
      if (status === 200) {
        setUser(data);
      } else {
        setUser(false);
      }
    } catch (e) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    try {
      const { data, status } = await api.post(
        "/auth/login",
        { email, password },
        { validateStatus: () => true }
      );
      if (status >= 200 && status < 300) {
        setUser(data);
        return { ok: true };
      }
      return { ok: false, error: formatApiError(data?.detail) || `Request failed (${status})` };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
