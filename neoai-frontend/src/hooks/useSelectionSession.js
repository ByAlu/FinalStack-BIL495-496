import { useEffect, useState } from "react";

function getStorageKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}

function readSelectionSession(patientId, examinationId) {
  if (!patientId || !examinationId) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(getStorageKey(patientId, examinationId));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.sessionStorage.removeItem(getStorageKey(patientId, examinationId));
    return null;
  }
}

export function useSelectionSession({ patientId, examinationId, initialRegion }) {
  const initialSelectionState = readSelectionSession(patientId, examinationId);
  const [activeRegion, setActiveRegion] = useState(initialSelectionState?.activeRegion || initialRegion);
  const [selectedFrames, setSelectedFrames] = useState(initialSelectionState?.selectedFrames || {});

  useEffect(() => {
    if (!patientId || !examinationId) {
      return;
    }

    window.sessionStorage.setItem(
      getStorageKey(patientId, examinationId),
      JSON.stringify({
        activeRegion,
        selectedFrames
      })
    );
  }, [activeRegion, examinationId, patientId, selectedFrames]);

  return {
    activeRegion,
    setActiveRegion,
    selectedFrames,
    setSelectedFrames
  };
}
