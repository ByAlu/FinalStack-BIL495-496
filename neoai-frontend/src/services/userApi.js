import { api } from "./httpClient";

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

export async function getAllUsers() {
  try {
    const response = await api.get("/api/v1/users");
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not load users.");
    }

    throw new Error("Could not reach the server.");
  }
}

export async function createUser(userData) {
  try {
    const response = await api.post("/api/v1/users", userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not create user.");
    }

    throw new Error("Could not reach the server.");
  }
}

export async function updateUser(userId, userData) {
  try {
    const response = await api.put(`/api/v1/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Could not update user.");
    }

    throw new Error("Could not reach the server.");
  }
}
