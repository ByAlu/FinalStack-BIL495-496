import axios from "axios";
import { notifyGlobalApiError } from "./errorToastBus";

export const TOKEN_STORAGE_KEY = "token";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const CURRENT_PASSWORD_INCORRECT = "Current password is incorrect.";

function humanizeUnauthorizedMessage(message) {
  if (!message || typeof message !== "string") {
    return message;
  }
  if (message === CURRENT_PASSWORD_INCORRECT) {
    return message;
  }
  const normalized = message.trim().toLowerCase();
  if (normalized === "bad credentials" || normalized.includes("bad credentials")) {
    return "You entered an incorrect password.";
  }
  return message;
}

function extractAxiosErrorMessage(error) {
  if (axios.isCancel?.(error)) {
    return "";
  }
  if (!error.response) {
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.";
    }
    return error.message || "Beklenmeyen bir hata oluştu.";
  }

  const { status, data } = error.response;

  if (typeof data === "string" && data.trim()) {
    const text = data.trim();
    return status === 401 ? humanizeUnauthorizedMessage(text) : text;
  }

  if (data && typeof data === "object") {
    const msg = data.message || data.error || data.detail || data.title;
    if (msg) {
      const text = String(msg);
      return status === 401 ? humanizeUnauthorizedMessage(text) : text;
    }
  }

  const fallback = `İşlem başarısız (HTTP ${status}).`;
  return status === 401 ? humanizeUnauthorizedMessage(fallback) : fallback;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.skipGlobalErrorToast) {
      return Promise.reject(error);
    }

    const msg = extractAxiosErrorMessage(error);
    if (msg) {
      notifyGlobalApiError(msg);
    }

    return Promise.reject(error);
  }
);
