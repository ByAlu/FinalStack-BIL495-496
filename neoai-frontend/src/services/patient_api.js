import axios from "axios";

const API_HOSPITAL_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";

// Create Axios instance
const api = axios.create({
  baseURL: API_HOSPITAL_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Şimdilik hazır user çekiyor data folderından
//TODO: connect to actual api
export function findPatientById(patientId) {
  return patients.find((patient) => patient.id.toLowerCase() === patientId.trim().toLowerCase()) || null;
}
//TODO: connect to actual api
export function getExaminationByIds(patientId, examinationId) {
  const patient = findPatientById(patientId);
  return patient?.examinations.find((examination) => examination.id === examinationId) || null;
}
