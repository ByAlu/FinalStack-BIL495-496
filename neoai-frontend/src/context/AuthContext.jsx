import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, TOKEN_STORAGE_KEY } from "../services/api";

const AuthContext = createContext(null);

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function buildUserFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) {
    return null;
  }

  return {
    username: payload.sub,
    fullName: payload.sub,
    role: payload.role ?? null,
    allowedDataTypes: Array.isArray(payload.allowedDataTypes) ? payload.allowedDataTypes : []
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (savedToken) {
      setToken(savedToken);
      setUser(buildUserFromToken(savedToken));
    }
  }, []);

  function persistJwt(jwt) {
    setToken(jwt);
    setUser(buildUserFromToken(jwt));
    window.localStorage.setItem(TOKEN_STORAGE_KEY, jwt);
  }

  async function login(credentials) {
    const jwt = await loginUser(credentials);
    persistJwt(jwt);
    navigate("/", { replace: true });
    return jwt;
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    navigate("/login", { replace: true });
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, user]
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
