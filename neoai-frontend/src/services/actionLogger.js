// Action Logger Service - Gerçek kullanıcı işlemlerini logla

let actionLogs = [];
const MAX_LOGS = 500;

export function logAction(action) {
  const timestamp = Date.now();

  const log = {
    id: `action_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    user: action.user || "system",
    name: action.name || "Unknown Action",
    applicationType: action.type || "SYSTEM_OPERATION",
    description: action.description || "",
    queue: "root.users",
    priority: action.priority || 0,
    startTime: timestamp,
    finishTime: null,
    state: action.state || "RUNNING",
    finalStatus: null,
    progress: 0,
    metadata: action.metadata || {}
  };

  actionLogs.unshift(log); // En yenisini başa ekle

  // Max log sayısını aşmışsa eski olanları sil
  if (actionLogs.length > MAX_LOGS) {
    actionLogs = actionLogs.slice(0, MAX_LOGS);
  }

  // Backend'e de gönder (opsiyonel)
  try {
    // fetch("/api/logs", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(log)
    // });
  } catch (error) {
    console.error("Error sending log to backend:", error);
  }

  return log;
}

export function completeAction(actionId, status = "SUCCEEDED") {
  const log = actionLogs.find((l) => l.id === actionId);

  if (log) {
    log.finishTime = Date.now();
    log.state = "FINISHED";
    log.finalStatus = status;
    log.progress = 100;
  }

  return log;
}

export function updateActionProgress(actionId, progress) {
  const log = actionLogs.find((l) => l.id === actionId);

  if (log) {
    log.progress = Math.min(progress, 100);
  }

  return log;
}

export function failAction(actionId, errorMessage = "Unknown error") {
  const log = actionLogs.find((l) => l.id === actionId);

  if (log) {
    log.finishTime = Date.now();
    log.state = "FAILED";
    log.finalStatus = "FAILED";
    log.metadata = {
      ...log.metadata,
      error: errorMessage
    };
    log.progress = 0;
  }

  return log;
}

export function getActionLogs() {
  return [...actionLogs];
}

export function clearActionLogs() {
  actionLogs = [];
}

// Önceden tanımlı action tiplerini kolaylaştırmak için
export const ActionTypes = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  PATIENT_QUERY: "PATIENT_QUERY",
  DATA_SELECTION: "DATA_SELECTION",
  DATA_PREPROCESSING: "DATA_PREPROCESSING",
  AI_ANALYSIS: "AI_ANALYSIS",
  REPORT_GENERATION: "REPORT_GENERATION",
  PROFILE_UPDATE: "PROFILE_UPDATE",
  ADMIN_ACTION: "ADMIN_ACTION"
};

// Helper: Basit action logging
export function logSimpleAction(name, type, description = "", metadata = {}) {
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "unknown";
  
  return logAction({
    name,
    type,
    description,
    metadata,
    user: username
  });
}
