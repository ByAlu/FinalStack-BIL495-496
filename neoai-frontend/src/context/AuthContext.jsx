import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/mockApi";

const STORAGE_KEY = "react-codex-auth";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = window.localStorage.getItem(STORAGE_KEY);

    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  function persistJwt(jwt) {
    setToken(jwt);
    window.localStorage.setItem(STORAGE_KEY, jwt);
  }

  async function login(credentials) {
    const jwt = await loginUser(credentials);
    persistJwt(jwt);
    navigate("/", { replace: true });
    return jwt;
  }

  function logout() {
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
    navigate("/login", { replace: true });
  }

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token]
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
