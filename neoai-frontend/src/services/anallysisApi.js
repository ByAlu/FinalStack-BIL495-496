import { api } from "./httpClient";

function normalizePatientId(patientId) {
  if (patientId === null || patientId === undefined) {
    return "";
  }

  const match = String(patientId).trim().match(/\d+/);
  return match ? match[0] : String(patientId).trim();
}

function buildFrameIndices(selectedFrames) {
  const entries = Object.entries(selectedFrames || {}).filter(([, value]) => value && Number.isInteger(value.frameIndex));

  return entries.reduce((accumulator, [region, value]) => {
    accumulator[region.toUpperCase()] = value.frameIndex;
    return accumulator;
  }, {});
}

export async function startAiAnalysis({ patientId, examinationId, selectedFrames, selectedModuleIds }) {
  const moduleIds = Array.isArray(selectedModuleIds) ? selectedModuleIds : [];
  const selected_modules = {
    b_lines: moduleIds.includes("b-line"),
    rds_score: moduleIds.includes("rds-score")
  };

  try {
    const response = await api.post("/api/v1/ai-analysis", {
      examinationId,
      patientId: normalizePatientId(patientId),
      selectedFrameIndices: buildFrameIndices(selectedFrames),
      selected_modules
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Could not start AI analysis.");
  }
}

export async function getAiAnalysisResult(analysisId) {
  if (!analysisId) {
    return null;
  }

  try {
    const response = await api.get(`/api/v1/ai-analysis/${analysisId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Could not load AI analysis result.");
  }
}
