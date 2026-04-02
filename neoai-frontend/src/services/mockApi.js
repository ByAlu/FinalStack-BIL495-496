import { auditEntries, demoUsers, patients, reportTemplates } from "../data/mockData";

function delay(ms = 250) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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
