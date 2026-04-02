const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function getBackendStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return {
        connected: false,
        message: `Backend responded with status ${response.status}.`
      };
    }

    const data = await response.json();

    return {
      connected: true,
      message: data.message || "Spring Boot is responding."
    };
  } catch {
    return {
      connected: false,
      message: "Could not reach the Spring Boot server at http://localhost:8080."
    };
  }
}
