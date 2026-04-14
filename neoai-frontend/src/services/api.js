import axios from "axios";

export const TOKEN_STORAGE_KEY = "token";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";


// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// Attach token automatically when sending a request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend status check
export async function getBackendStatus() {
  try {
    const response = await api.get("/api/health");

    return {
      connected: true,
      message: response.data.message || "Spring Boot is responding.",
    };
  } catch (error) {
    if (error.response) {
      return {
        connected: false,
        message: `Backend responded with status ${error.response.status}.`,
      };
    }

    return {
      connected: false,
      message: "Could not reach the Spring Boot server at http://localhost:8080.",
    };
  }
}

// Login
export async function loginUser({ username, password }) {
  try {
    const response = await api.post("/api/v1/auth/login", {
      username,
      password,
    });

    const jwt = response.data;

    if (jwt) {
      localStorage.setItem(TOKEN_STORAGE_KEY, jwt);
    }

    return jwt;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Invalid username or password."
      );
    }

    throw new Error("Could not reach the server.");
  }
}

// Register
export async function registerUser(userData) {
  try {
    const response = await api.post("/api/v1/auth/register", userData);
    return response.data;
  } catch (error) {
    console.error("Register Error:", error.message);

    if (error.response) {
      throw new Error(
        error.response.data?.message ||
          "Registration failed. Please try again."
      );
    }

    throw new Error("Could not connect to the registration server.");
  }
}

export async function getCurrentUserProfile() {
  try {
    const response = await api.get("/api/v1/users/me");
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not load user profile.");
    }

    throw new Error("Could not reach the server.");
  }
}

export async function changePassword({ currentPassword, newPassword, confirmNewPassword }) {
  try {
    await api.post("/api/v1/users/me/change-password", {
      currentPassword,
      newPassword,
      confirmNewPassword
    });
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not change password.");
    }

    throw new Error("Could not reach the server.");
  }
}
