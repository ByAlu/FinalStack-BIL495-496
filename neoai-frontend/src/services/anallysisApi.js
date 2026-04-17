import { api } from "./httpClient";

const FRONTEND_PREPROCESSING_TYPE_TO_CODE = {
  "median-filter": "MEDIAN_BLUR",
  clahe: "CLAHE",
  "gaussian-filter": "GAUSSIAN_BLUR",
  grayscale: "GRAYSCALE",
  sharpen: "SHARPEN"
};

export async function getAvailableAiModules() {
  try {
    const response = await api.get("/api/v1/ai-analysis/modules");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Could not load AI modules.");
  }
}

function buildFrameIndices(selectedFrames) {
  const entries = Object.entries(selectedFrames || {}).filter(([, value]) => value && Number.isInteger(value.frameIndex));

  return entries.reduce((accumulator, [region, value]) => {
    accumulator[region.toUpperCase()] = value.frameIndex;
    return accumulator;
  }, {});
}

function serializeOperationParameters(operation) {
  switch (operation?.type) {
    case "median-filter":
      return { kernelSize: operation.kernelSize };
    case "clahe":
      return {
        clipLimit: operation.clipLimit,
        tileGridSize: operation.tileGridSize
      };
    case "gaussian-filter":
      return {
        kernelSize: operation.kernelSize,
        sigmaX: operation.sigmaX,
        sigmaY: operation.sigmaY
      };
    case "grayscale":
      return {};
    case "sharpen":
      return { strength: operation.strength };
    default:
      return {};
  }
}

function buildPreprocessingSettings(preprocessingOperations) {
  return (Array.isArray(preprocessingOperations) ? preprocessingOperations : [])
    .map((operation, index) => {
      const operationCode = FRONTEND_PREPROCESSING_TYPE_TO_CODE[operation?.type];

      if (!operationCode) {
        return null;
      }

      return {
        operationCode,
        displayOrder: index + 1,
        active: Boolean(operation.enabled),
        parameters: serializeOperationParameters(operation)
      };
    })
    .filter(Boolean);
}

export async function startAiAnalysis({
  patientId,
  examinationId,
  selectedFrames,
  selectedModuleIds,
  preprocessingOperations
}) {
  const moduleIds = Array.isArray(selectedModuleIds) ? selectedModuleIds : [];
  const selected_modules = {
    b_lines: moduleIds.includes("b-line"),
    rds_score: moduleIds.includes("rds-score")
  };

  try {
    const response = await api.post("/api/v1/ai-analysis", {
      examinationId,
      patientId: patientId == null ? "" : String(patientId).trim(),
      selectedFrameIndices: buildFrameIndices(selectedFrames),
      selected_modules,
      preprocessingSettings: buildPreprocessingSettings(preprocessingOperations)
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
