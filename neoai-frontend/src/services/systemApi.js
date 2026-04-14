import { api } from "./httpClient";

export async function getBackendStatus() {
  try {
    const response = await api.get("/api/health");

    return {
      connected: true,
      message: response.data.message || "Spring Boot is responding."
    };
  } catch (error) {
    if (error.response) {
      return {
        connected: false,
        message: `Backend responded with status ${error.response.status}.`
      };
    }

    return {
      connected: false,
      message: "Could not reach the Spring Boot server at http://localhost:8080."
    };
  }
}
