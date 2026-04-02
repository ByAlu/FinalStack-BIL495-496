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
export async function loginUser({ username, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      // Backend 401 veya 500 dönerse burası çalışır
      const errorData = await response.json();
      throw new Error(errorData.message || "Invalid username or password.");
    }

    const jwt = await response.text();

    // Profesyonel dokunuş: Token varsa kaydet
    if (jwt) {
      localStorage.setItem('token', jwt);
    }

    return jwt; // Backend'den gelen kullanıcı objesini döner
  } catch (error) {
    // Bağlantı hatası veya backend hatası
    throw new Error(error.message || "Could not reach the server.");
  }
}
/**
 * Yeni bir kullanıcı kaydı oluşturur.
 * @param {Object} userData - firstName, lastName, username, email, password, role
 */
export async function registerUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    // Backend tarafında bir hata oluştuysa (örneğin email zaten varsa)
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Registration failed. Please try again.");
    }

    // Kayıt başarılıysa genellikle backend oluşturulan kullanıcıyı veya başarı mesajını döner
    const data = await response.json();
    return data;

  } catch (error) {
    // Bağlantı hatası veya backend'den fırlatılan hata
    console.error("Register Error:", error.message);
    throw new Error(error.message || "Could not connect to the registration server.");
  }
}
