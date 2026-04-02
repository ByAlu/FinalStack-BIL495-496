import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/mockApi";

const STORAGE_KEY = "react-codex-auth";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return;
    }

    try {
      setUser(JSON.parse(rawValue));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function persistUser(nextUser) {
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }

  async function login(credentials) {
    const authenticatedUser = await loginUser(credentials);
    persistUser(authenticatedUser);
    navigate("/", { replace: true });
    return authenticatedUser;
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
    navigate("/login", { replace: true });
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
