import { api } from "./httpClient";

// Mock log data generator
const generateMockLogs = () => {
  const applicationTypes = [
    "DATA_PREPROCESSING",
    "AI_ANALYSIS",
    "PATIENT_QUERY",
    "SYSTEM_OPERATION",
    "DATA_SELECTION",
    "REPORT_GENERATION"
  ];

  const states = ["RUNNING", "FINISHED", "FAILED"];
  const finalStatuses = {
    RUNNING: [],
    FINISHED: ["SUCCEEDED"],
    FAILED: ["FAILED", "KILLED"]
  };

  const users = ["doctor_smith", "nurse_johnson", "admin", "radiologist_anderson", "system"];
  const queues = ["root.users", "root.admin", "root.system"];

  const now = new Date();
  const logs = [];

  for (let i = 0; i < 50; i++) {
    const appType = applicationTypes[Math.floor(Math.random() * applicationTypes.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const finalStatus =
      finalStatuses[state][Math.floor(Math.random() * finalStatuses[state].length)] ||
      "SUCCEEDED";
    const startTime = new Date(now.getTime() - Math.random() * 86400000);
    const duration = Math.floor(Math.random() * 3600000) + 30000;
    const finishTime = state === "RUNNING" ? null : new Date(startTime.getTime() + duration);

    logs.push({
      id: `application_${1500262180460 + i}_${String(i).padStart(4, "0")}`,
      user: users[Math.floor(Math.random() * users.length)],
      name: `${appType}-${String(i).padStart(3, "0")}`,
      applicationType: appType,
      queue: queues[Math.floor(Math.random() * queues.length)],
      priority: Math.floor(Math.random() * 10),
      startTime: startTime.getTime(),
      finishTime: finishTime ? finishTime.getTime() : null,
      state: state,
      finalStatus: finalStatus,
      progress: state === "RUNNING" ? Math.floor(Math.random() * 100) : 100
    });
  }

  return logs.sort((a, b) => b.startTime - a.startTime);
};

let mockLogsCache = generateMockLogs();

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

export async function getLogs() {
  try {
    // Try to fetch from backend first
    try {
      const response = await api.get("/api/logs");
      return response.data;
    } catch (backendError) {
      // If backend endpoint doesn't exist, fall back to mock data
      // Simulate some new logs appearing on refresh
      const newLog = {
        id: `application_${Date.now()}_${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
        user: ["doctor_smith", "nurse_johnson", "admin", "radiologist_anderson", "system"][
          Math.floor(Math.random() * 5)
        ],
        name: `OPERATION-${Math.floor(Math.random() * 1000)}`,
        applicationType: [
          "DATA_PREPROCESSING",
          "AI_ANALYSIS",
          "PATIENT_QUERY",
          "SYSTEM_OPERATION",
          "DATA_SELECTION",
          "REPORT_GENERATION"
        ][Math.floor(Math.random() * 6)],
        queue: ["root.users", "root.admin", "root.system"][Math.floor(Math.random() * 3)],
        priority: Math.floor(Math.random() * 10),
        startTime: Date.now() - Math.random() * 60000,
        finishTime: null,
        state: "RUNNING",
        finalStatus: "RUNNING",
        progress: Math.floor(Math.random() * 100)
      };

      mockLogsCache = [newLog, ...mockLogsCache.slice(0, 49)];
      return mockLogsCache;
    }
  } catch (error) {
    console.error("Error fetching logs:", error);
    return mockLogsCache;
  }
}
