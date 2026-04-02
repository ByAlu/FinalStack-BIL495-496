import axios from "axios";
//TODO:remove
import { auditEntries, demoUsers, patients, reportTemplates } from "../data/mockData";

  
//TODO:connect to patient db
const API_HOSPITAL_BASE_URL =
import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";

//TODO:connect to patient db
const api_hospital = axios.create({
  baseURL: API_HOSPITAL_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

//TODO: rewrite everything with axios
export async function loginUser({ username, password }) {
  await delay();
  const user = demoUsers.find((candidate) => candidate.username === username && candidate.password === password);

  if (!user) {
    throw new Error("Invalid username or password.");
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    email: user.email
  };
}

export function findPatientById(patientId) {
  return patients.find((patient) => patient.id.toLowerCase() === patientId.trim().toLowerCase()) || null;
}

export function getExaminationByIds(patientId, examinationId) {
  const patient = findPatientById(patientId);
  return patient?.examinations.find((examination) => examination.id === examinationId) || null;
}

export function getReportById(reportId) {
  return reportTemplates.find((report) => report.id === reportId) || null;
}

export function getAuditEntries() {
  return auditEntries;
}
