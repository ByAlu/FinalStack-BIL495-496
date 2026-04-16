import { PREPROCESSING_OPERATION_TYPES } from "../config/preprocessingOperations";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for preprocessing."));
    image.src = src;
  });
}

function ensureOpenCvReady() {
  if (!window.cv) {
    throw new Error("OpenCV is not ready yet.");
  }
}

function loadMatFromSourceCanvas(src, width, height) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(src, 0, 0, width, height);
  return window.cv.imread(sourceCanvas);
}

function matToDataUrl(mat) {
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = mat.cols;
  targetCanvas.height = mat.rows;
  window.cv.imshow(targetCanvas, mat);
  return targetCanvas.toDataURL("image/png");
}

export async function applyMedianFilter(src, kernelSize = 3) {
  if (!src || kernelSize <= 1) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const targetMat = new window.cv.Mat();

  try {
    window.cv.medianBlur(sourceMat, targetMat, kernelSize);
    return matToDataUrl(targetMat);
  } finally {
    sourceMat.delete();
    targetMat.delete();
  }
}

export async function applyGaussianFilter(src, kernelSize = 3, sigmaX = 0, sigmaY = 0) {
  if (!src || kernelSize <= 1) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const targetMat = new window.cv.Mat();
  const kernel = new window.cv.Size(kernelSize, kernelSize);

  try {
    window.cv.GaussianBlur(sourceMat, targetMat, kernel, sigmaX, sigmaY, window.cv.BORDER_DEFAULT);
    return matToDataUrl(targetMat);
  } finally {
    sourceMat.delete();
    targetMat.delete();
  }
}

export async function applyClahe(src, clipLimit = 2, tileGridSizeValue = 8) {
  if (!src) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const grayMat = new window.cv.Mat();
  const claheMat = new window.cv.Mat();
  const outputMat = new window.cv.Mat();
  const normalizedTileGridSize = Math.max(1, Number(tileGridSizeValue) || 8);
  const tileGridSize = new window.cv.Size(normalizedTileGridSize, normalizedTileGridSize);
  const clahe =
    typeof window.cv.createCLAHE === "function"
      ? window.cv.createCLAHE(clipLimit, tileGridSize)
      : typeof window.cv.CLAHE === "function"
        ? new window.cv.CLAHE(clipLimit, tileGridSize)
        : null;

  if (!clahe?.apply) {
    throw new Error("CLAHE is not available in this OpenCV build.");
  }

  try {
    window.cv.cvtColor(sourceMat, grayMat, window.cv.COLOR_RGBA2GRAY);
    clahe.apply(grayMat, claheMat);
    window.cv.cvtColor(claheMat, outputMat, window.cv.COLOR_GRAY2RGBA);
    return matToDataUrl(outputMat);
  } finally {
    sourceMat.delete();
    grayMat.delete();
    claheMat.delete();
    outputMat.delete();
    clahe.delete();
  }
}

export async function applySharpen(src, strength = 1) {
  if (!src || strength <= 0) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const outputMat = new window.cv.Mat();
  const kernel = window.cv.matFromArray(3, 3, window.cv.CV_32F, [
    0,
    -1,
    0,
    -1,
    4 + strength,
    -1,
    0,
    -1,
    0
  ]);

  try {
    window.cv.filter2D(sourceMat, outputMat, -1, kernel);
    return matToDataUrl(outputMat);
  } finally {
    sourceMat.delete();
    outputMat.delete();
    kernel.delete();
  }
}

export async function applyGrayscale(src) {
  if (!src) {
    return src;
  }

  ensureOpenCvReady();

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sourceMat = loadMatFromSourceCanvas(image, width, height);
  const grayMat = new window.cv.Mat();
  const outputMat = new window.cv.Mat();

  try {
    window.cv.cvtColor(sourceMat, grayMat, window.cv.COLOR_RGBA2GRAY);
    window.cv.cvtColor(grayMat, outputMat, window.cv.COLOR_GRAY2RGBA);
    return matToDataUrl(outputMat);
  } finally {
    sourceMat.delete();
    grayMat.delete();
    outputMat.delete();
  }
}

export async function applyOperationsToFrame(src, operations) {
  const operationHandlers = {
    [PREPROCESSING_OPERATION_TYPES.MEDIAN_FILTER]: (currentSrc, operation) =>
      applyMedianFilter(currentSrc, operation.kernelSize),
    [PREPROCESSING_OPERATION_TYPES.GAUSSIAN_FILTER]: (currentSrc, operation) =>
      applyGaussianFilter(currentSrc, operation.kernelSize, operation.sigmaX, operation.sigmaY),
    [PREPROCESSING_OPERATION_TYPES.CLAHE]: (currentSrc, operation) =>
      applyClahe(currentSrc, operation.clipLimit, operation.tileGridSize),
    [PREPROCESSING_OPERATION_TYPES.GRAYSCALE]: (currentSrc) => applyGrayscale(currentSrc),
    [PREPROCESSING_OPERATION_TYPES.SHARPEN]: (currentSrc, operation) =>
      applySharpen(currentSrc, operation.strength)
  };
  let currentSrc = src;

  for (const operation of operations) {
    if (!operation.enabled) {
      continue;
    }

    const handler = operationHandlers[operation.type];

    if (handler) {
      currentSrc = await handler(currentSrc, operation);
    }
  }

  return currentSrc;
}
