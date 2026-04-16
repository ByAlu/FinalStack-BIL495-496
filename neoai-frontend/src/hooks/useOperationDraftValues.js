import { useEffect, useState } from "react";

function buildDraftValues(operations) {
  return Object.fromEntries(
    operations.map((operation) => [
      operation.id,
      {
        kernelSize: operation.kernelSize,
        clipLimit: operation.clipLimit,
        tileGridSize: operation.tileGridSize,
        strength: operation.strength,
        sigmaX: operation.sigmaX,
        sigmaY: operation.sigmaY
      }
    ])
  );
}

export function useOperationDraftValues({
  operations,
  onKernelSizeChange,
  onOperationParameterChange
}) {
  const [draftValues, setDraftValues] = useState(() => buildDraftValues(operations));

  useEffect(() => {
    setDraftValues(buildDraftValues(operations));
  }, [operations]);

  function handleDraftValueChange(operationId, fieldName, value) {
    setDraftValues((current) => ({
      ...current,
      [operationId]: {
        ...current[operationId],
        [fieldName]: value
      }
    }));
  }

  function commitDraftValue(operationId, fieldName) {
    const operation = operations.find((item) => item.id === operationId);
    const nextValue = draftValues[operationId]?.[fieldName];

    if (!operation || nextValue === undefined || nextValue === operation[fieldName]) {
      return;
    }

    if (fieldName === "kernelSize") {
      onKernelSizeChange(operationId, nextValue);
      return;
    }

    onOperationParameterChange(operationId, fieldName, nextValue);
  }

  function getDraftValue(operationId, fieldName, fallbackValue) {
    return draftValues[operationId]?.[fieldName] ?? fallbackValue;
  }

  return {
    commitDraftValue,
    getDraftValue,
    handleDraftValueChange
  };
}
