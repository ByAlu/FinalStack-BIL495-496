import { clearExaminationFrameExtractionCache } from "../hooks/useVideoFrameExtraction";
import { getWorkflowStorageKey } from "./workflowState";

function buildExaminationCacheKey(patientId, examinationId) {
  return `neoai-cache:${patientId}:${examinationId}`;
}

function buildSelectionStateKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}

function buildCommittedSelectionKey(patientId, examinationId) {
  return `neoai-selection-committed:${patientId}:${examinationId}`;
}

function buildPreprocessingStateKey(patientId, examinationId) {
  return `neoai-preprocessing:${patientId}:${examinationId}`;
}

function buildCommittedPreprocessingKey(patientId, examinationId) {
  return `neoai-preprocessing-committed:${patientId}:${examinationId}`;
}

function buildCommittedAiModuleKey(patientId, examinationId) {
  return `neoai-ai-module-committed:${patientId}:${examinationId}`;
}

export function resetExaminationWorkflowSession(patientId, examinationId) {
  if (!patientId || !examinationId) {
    return;
  }

  const keysToClear = [
    buildSelectionStateKey(patientId, examinationId),
    buildCommittedSelectionKey(patientId, examinationId),
    buildPreprocessingStateKey(patientId, examinationId),
    buildCommittedPreprocessingKey(patientId, examinationId),
    buildCommittedAiModuleKey(patientId, examinationId),
    getWorkflowStorageKey(patientId, examinationId)
  ];

  keysToClear.forEach((storageKey) => window.sessionStorage.removeItem(storageKey));
  clearExaminationFrameExtractionCache(buildExaminationCacheKey(patientId, examinationId));
}
