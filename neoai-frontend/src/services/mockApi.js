import axios from "axios";
//TODO:remove
import { auditEntries, demoUsers, patients } from "../data/mockData";

const mockReports = [
  {
    id: "REP-2001",
    patientId: "PT-1001",
    examinationId: "Exam_1001",
    title: "AI Diagnostic Report",
    summary: "Suspicious nodule detected in region r3. Recommend specialist confirmation.",
    findings: [
      "Selected 6 representative frames, one per region.",
      "Applied denoise and contrast normalization before inference.",
      "Highest anomaly probability observed in region r3."
    ],
    confidence: "%89",
    exportedFormats: ["PDF", "DOCX"]
  }
];

  
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

function delay(milliseconds = 300) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

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
  return mockReports.find((report) => report.id === reportId) || null;
}

export function getAuditEntries() {
  return auditEntries;
}
