import { api, TOKEN_STORAGE_KEY } from "./httpClient";

export { TOKEN_STORAGE_KEY };

export async function loginUser({ username, password }) {
  try {
    const response = await api.post("/api/v1/auth/login", {
      username,
      password
    });

    const jwt = response.data;

    if (jwt) {
      localStorage.setItem(TOKEN_STORAGE_KEY, jwt);
    }

    return jwt;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Invalid username or password.");
    }

    throw new Error("Could not reach the server.");
  }
}

export async function registerUser(userData) {
  try {
    const response = await api.post("/api/v1/auth/register", userData);
    return response.data;
  } catch (error) {
    console.error("Register Error:", error.message);

    if (error.response) {
      throw new Error(error.response.data?.message || "Registration failed. Please try again.");
    }

    throw new Error("Could not connect to the registration server.");
  }
}
