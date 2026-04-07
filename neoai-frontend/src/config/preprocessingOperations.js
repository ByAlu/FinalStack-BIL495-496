export const PREPROCESSING_OPERATION_TYPES = {
  MEDIAN_FILTER: "median-filter",
  CLAHE: "clahe",
  GAUSSIAN_FILTER: "gaussian-filter",
  GRAYSCALE: "grayscale",
  SHARPEN: "sharpen"
};

function formatKernelSize(value) {
  return `${value}x${value}`;
}

function formatDecimal(value) {
  return Number(value ?? 0).toFixed(1);
}

function formatStrength(value) {
  return `${Number(value ?? 0).toFixed(1)}x`;
}

export const PREPROCESSING_OPERATION_DEFINITIONS = [
  {
    id: PREPROCESSING_OPERATION_TYPES.MEDIAN_FILTER,
    type: PREPROCESSING_OPERATION_TYPES.MEDIAN_FILTER,
    label: "Median filter",
    description: "Reduce speckle noise on the selected ultrasound frames.",
    enabledByDefault: true,
    parameters: {
      kernelSize: 3
    },
    controls: [
      {
        fieldName: "kernelSize",
        label: "Kernel size",
        min: 3,
        max: 15,
        step: 2,
        formatValue: formatKernelSize
      }
    ]
  },
  {
    id: PREPROCESSING_OPERATION_TYPES.CLAHE,
    type: PREPROCESSING_OPERATION_TYPES.CLAHE,
    label: "CLAHE",
    description: "Boost local contrast to make subtle tissue structures easier to see.",
    enabledByDefault: false,
    parameters: {
      clipLimit: 2
    },
    controls: [
      {
        fieldName: "clipLimit",
        label: "Clip limit",
        min: 1,
        max: 8,
        step: 0.5,
        formatValue: formatDecimal
      }
    ]
  },
  {
    id: PREPROCESSING_OPERATION_TYPES.GAUSSIAN_FILTER,
    type: PREPROCESSING_OPERATION_TYPES.GAUSSIAN_FILTER,
    label: "Gaussian filter",
    description: "Smooth the selected ultrasound frame with a Gaussian blur to reduce softer noise.",
    enabledByDefault: false,
    parameters: {
      kernelSize: 3,
      sigmaX: 0,
      sigmaY: 0
    },
    controls: [
      {
        fieldName: "kernelSize",
        label: "Kernel size",
        min: 3,
        max: 15,
        step: 2,
        formatValue: formatKernelSize
      },
      {
        fieldName: "sigmaX",
        label: "Sigma X",
        min: 0,
        max: 10,
        step: 0.5,
        formatValue: formatDecimal
      },
      {
        fieldName: "sigmaY",
        label: "Sigma Y",
        min: 0,
        max: 10,
        step: 0.5,
        formatValue: formatDecimal
      }
    ]
  },
  {
    id: PREPROCESSING_OPERATION_TYPES.GRAYSCALE,
    type: PREPROCESSING_OPERATION_TYPES.GRAYSCALE,
    label: "Convert to grayscale",
    description: "Convert the selected ultrasound frame to grayscale before later preprocessing steps.",
    enabledByDefault: false,
    parameters: {},
    controls: []
  },
  {
    id: PREPROCESSING_OPERATION_TYPES.SHARPEN,
    type: PREPROCESSING_OPERATION_TYPES.SHARPEN,
    label: "Sharpen",
    description: "Enhance edges after denoising to make boundaries appear crisper.",
    enabledByDefault: false,
    parameters: {
      strength: 1
    },
    controls: [
      {
        fieldName: "strength",
        label: "Strength",
        min: 1,
        max: 4,
        step: 0.5,
        formatValue: formatStrength
      }
    ]
  }
];

export function createDefaultPreprocessingOperations() {
  return PREPROCESSING_OPERATION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    type: definition.type,
    label: definition.label,
    description: definition.description,
    enabled: definition.enabledByDefault,
    ...definition.parameters
  }));
}

export function getPreprocessingOperationDefinition(operationType) {
  return PREPROCESSING_OPERATION_DEFINITIONS.find((definition) => definition.type === operationType) || null;
}
