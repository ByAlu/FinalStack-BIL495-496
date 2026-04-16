import { api } from "./httpClient";

export async function getCurrentUserPreprocessingSettings(dataType = "ULTRASOUND") {
  const response = await api.get("/api/v1/preprocessing-settings/me", {
    params: { dataType }
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function saveCurrentUserPreprocessingSettings(settings, dataType = "ULTRASOUND") {
  const response = await api.put("/api/v1/preprocessing-settings/me", settings, {
    params: { dataType }
  });

  return Array.isArray(response.data) ? response.data : [];
}
