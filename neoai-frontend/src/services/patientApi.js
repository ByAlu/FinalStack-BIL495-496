import { api } from "./httpClient";

function normalizePatientId(patientIdInput) {
  const normalizedValue = String(patientIdInput || "").trim();
  const numericPart = normalizedValue.replace(/[^\d]/g, "");
  const parsedId = Number(numericPart);

  if (!numericPart || Number.isNaN(parsedId)) {
    throw new Error("Please provide a valid patient id.");
  }

  return parsedId;
}

/**
 * Loads patient profile from GET /api/v1/patients/{patientId}.
 * @returns {{ id: string, name: string, age: number|null }} PatientDTO shape from backend
 */
export async function getPatientById(patientIdInput) {
  const patientId = normalizePatientId(patientIdInput);
  const response = await api.get(`/api/v1/patients/${patientId}`);
  return response.data || {};
}
