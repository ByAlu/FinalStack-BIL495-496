import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, TOKEN_STORAGE_KEY } from "../services/authApi";
import { getCurrentUserProfile } from "../services/userApi";

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

function buildUserFromProfile(profile, fallbackUser) {
  if (!profile) {
    return fallbackUser;
  }

  const firstName = profile.firstName?.trim();
  const lastName = profile.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: profile.id,
    username: profile.userName ?? fallbackUser?.username ?? null,
    fullName: fullName || profile.userName || fallbackUser?.fullName || "Unknown user",
    firstName: firstName || "",
    lastName: lastName || "",
    email: profile.email ?? "",
    phoneNumber: profile.phoneNumber ?? "",
    role: profile.role ?? fallbackUser?.role ?? null,
    allowedDataTypes: Array.isArray(profile.allowedDataTypes)
      ? profile.allowedDataTypes
      : fallbackUser?.allowedDataTypes ?? [],
    enabled: typeof profile.enabled === "boolean" ? profile.enabled : true,
    createTime: profile.createTime ?? null,
    updateTime: profile.updateTime ?? null
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
      const tokenUser = buildUserFromToken(savedToken);
      setUser(tokenUser);
      hydrateUserProfile(tokenUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function hydrateUserProfile(fallbackUser) {
    try {
      const profile = await getCurrentUserProfile();
      setUser(buildUserFromProfile(profile, fallbackUser));
    } catch {
      setUser((currentUser) => currentUser ?? fallbackUser ?? null);
    }
  }

  async function persistJwt(jwt) {
    const tokenUser = buildUserFromToken(jwt);
    setToken(jwt);
    setUser(tokenUser);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, jwt);
    await hydrateUserProfile(tokenUser);
  }

  async function login(credentials) {
    const jwt = await loginUser(credentials);
    await persistJwt(jwt);
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
      logout,
      refreshUserProfile: () => hydrateUserProfile(user)
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
